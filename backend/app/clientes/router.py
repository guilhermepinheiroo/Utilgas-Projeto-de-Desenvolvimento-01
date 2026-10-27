"""Módulo Clientes — responsável: Back-end 1."""
import re
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from postgrest.exceptions import APIError
from supabase import Client

from app.clientes.schemas import (
    ClienteCreate,
    ClienteOut,
    ClienteResumo,
    ClientesPagina,
    ClienteUpdate,
    EnderecoCreate,
    EnderecoOut,
    Indicador,
    ResumoClientes,
    StatusCliente,
)
from app.core.auth import get_db
from app.core.frequencia import datas_de_compra, dia_local, indicadores
from app.core.tempo import inicio_do_mes, para_iso_utc

router = APIRouter(prefix="/clientes", tags=["Clientes"])

SELECT_CLIENTE = "*, enderecos(*, regioes(nome, taxa_entrega))"


# ------------------------------------------------------------------ helpers


def so_digitos(valor: str | None) -> str:
    return re.sub(r"\D", "", valor or "")


def _validar_telefone(telefone: str) -> str:
    digitos = so_digitos(telefone)
    if len(digitos) not in (10, 11):
        raise HTTPException(422, "Telefone deve ter DDD + número (10 ou 11 dígitos)")
    return digitos


def _limpar(valor: str | None) -> str | None:
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


def _erro_unico(e: APIError) -> HTTPException:
    detalhe = f"{e.message} {e.details}".lower()
    if "cpf" in detalhe:
        return HTTPException(409, "Já existe um cliente com esse CPF/CNPJ")
    return HTTPException(409, "Já existe um cliente com esse telefone")


def _endereco_out(row: dict) -> EnderecoOut:
    regiao = row.get("regioes") or {}
    dados = {k: v for k, v in row.items() if k != "regioes"}
    return EnderecoOut(
        **dados,
        regiao_nome=regiao.get("nome"),
        taxa_entrega=(
            float(regiao["taxa_entrega"]) if regiao.get("taxa_entrega") is not None else None
        ),
    )


def _cliente_out(db: Client, row: dict, com_indicadores: bool = True) -> ClienteOut:
    enderecos = sorted(
        row.get("enderecos") or [], key=lambda e: (not e.get("principal"), e["id"])
    )
    dados = {k: v for k, v in row.items() if k not in ("enderecos",)}
    ind = indicadores(datas_de_compra(db, row["id"])) if com_indicadores else None
    return ClienteOut(**dados, enderecos=[_endereco_out(e) for e in enderecos], indicadores=ind)


def _buscar_cliente(db: Client, cliente_id: int) -> dict:
    rows = db.table("clientes").select(SELECT_CLIENTE).eq("id", cliente_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Cliente não encontrado")
    return rows[0]


def _buscar_endereco(db: Client, cliente_id: int, endereco_id: int) -> dict:
    rows = (
        db.table("enderecos")
        .select("*")
        .eq("id", endereco_id)
        .eq("cliente_id", cliente_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Endereço não encontrado para esse cliente")
    return rows[0]


def _dados_endereco(dados: EnderecoCreate) -> dict:
    endereco = (dados.endereco or "").strip()
    if not endereco:
        raise HTTPException(422, "Endereço obrigatório")
    return {
        "endereco": endereco,
        "complemento": _limpar(dados.complemento),
        "cep": so_digitos(dados.cep) or None,
        "bairro": _limpar(dados.bairro),
        "regiao_id": dados.regiao_id,
        "principal": dados.principal,
    }


def _desmarcar_principal(db: Client, cliente_id: int) -> None:
    db.table("enderecos").update({"principal": False}).eq("cliente_id", cliente_id).eq(
        "principal", True
    ).execute()


def _contar(q) -> int:
    return q.execute().count or 0


# ----------------------------------------------------------------- listagem


@router.get("", response_model=ClientesPagina)
def listar_clientes(
    busca: str | None = Query(None, description="Nome, telefone ou CPF/CNPJ"),
    status: StatusCliente | None = None,
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(10, ge=1, le=100),
    db: Client = Depends(get_db),
):
    """Listagem da tela Clientes, em ordem alfabética."""
    q = db.table("clientes").select(
        "id, nome, telefone, cpf_cnpj, status, criado_em, "
        "enderecos(endereco, bairro, principal), vendas(criado_em, status)",
        count="exact",
    )
    if status:
        q = q.eq("status", status)
    if busca and busca.strip():
        termo = re.sub(r"[,()*%\\]", " ", busca).strip()
        digitos = so_digitos(busca)
        filtros = [f"nome.ilike.*{termo}*"] if termo else []
        if digitos:
            filtros += [f"telefone.ilike.*{digitos}*", f"cpf_cnpj.ilike.*{digitos}*"]
        if filtros:
            q = q.or_(",".join(filtros))

    inicio = (pagina - 1) * tamanho
    resp = q.order("nome").range(inicio, inicio + tamanho - 1).execute()

    itens = []
    for row in resp.data:
        enderecos = row.get("enderecos") or []
        principal = next((e for e in enderecos if e.get("principal")), None) or (
            enderecos[0] if enderecos else None
        )
        compras = [v["criado_em"] for v in row.get("vendas") or [] if v["status"] != "cancelada"]
        itens.append(
            ClienteResumo(
                id=row["id"],
                nome=row["nome"],
                telefone=row["telefone"],
                cpf_cnpj=row.get("cpf_cnpj"),
                endereco_principal=principal["endereco"] if principal else None,
                bairro=principal.get("bairro") if principal else None,
                ultima_compra=dia_local(max(compras)) if compras else None,
                status=row["status"],
                criado_em=row["criado_em"],
            )
        )
    return ClientesPagina(itens=itens, total=resp.count or 0, pagina=pagina, tamanho=tamanho)


@router.get("/resumo", response_model=ResumoClientes)
def resumo_clientes(db: Client = Depends(get_db)):
    """Cards do topo: total, novos no mês, ativos e inadimplentes."""
    inicio_mes = inicio_do_mes()
    inicio_mes_anterior = (inicio_mes - timedelta(days=1)).replace(day=1)

    def base():
        return db.table("clientes").select("id", count="exact").limit(1)

    total = _contar(base())
    novos = _contar(base().gte("criado_em", para_iso_utc(inicio_mes)))
    novos_anterior = _contar(
        base()
        .gte("criado_em", para_iso_utc(inicio_mes_anterior))
        .lt("criado_em", para_iso_utc(inicio_mes))
    )
    ativos = _contar(base().eq("status", "ativo"))
    inadimplentes = _contar(base().eq("status", "inadimplente"))

    def pct(atual: int, anterior: int) -> float | None:
        return round((atual - anterior) / anterior * 100, 1) if anterior else None

    return ResumoClientes(
        total=Indicador(valor=total, variacao_pct=pct(total, total - novos)),
        novos_no_mes=Indicador(valor=novos, variacao_pct=pct(novos, novos_anterior)),
        ativos=Indicador(valor=ativos),
        inadimplentes=Indicador(valor=inadimplentes),
    )


@router.get("/por-telefone/{telefone}", response_model=ClienteOut)
def buscar_por_telefone(telefone: str, db: Client = Depends(get_db)):
    """Tela inicial do Atendimento. 404 se não existir (front abre cadastro)."""
    digitos = so_digitos(telefone)
    rows = (
        db.table("clientes").select(SELECT_CLIENTE).eq("telefone", digitos).limit(1).execute().data
    )
    if not rows:
        raise HTTPException(404, "Cliente não encontrado")
    return _cliente_out(db, rows[0])


@router.get("/{cliente_id}", response_model=ClienteOut)
def obter_cliente(cliente_id: int, db: Client = Depends(get_db)):
    """Inclui endereços e indicadores (total de pedidos, frequência, recompra)."""
    return _cliente_out(db, _buscar_cliente(db, cliente_id))


# ------------------------------------------------------------- cadastro


@router.post("", response_model=ClienteOut, status_code=201)
def criar_cliente(dados: ClienteCreate, db: Client = Depends(get_db)):
    """Telefone deve ser único; guardar somente dígitos."""
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(422, "Nome obrigatório")
    novo = {
        "nome": nome,
        "telefone": _validar_telefone(dados.telefone),
        "cpf_cnpj": so_digitos(dados.cpf_cnpj) or None,
        "email": _limpar(dados.email),
        "observacoes": _limpar(dados.observacoes),
        "status": dados.status,
    }
    enderecos = [_dados_endereco(e) for e in dados.enderecos]
    if enderecos:
        indice = next((i for i, e in enumerate(enderecos) if e["principal"]), 0)
        for i, e in enumerate(enderecos):
            e["principal"] = i == indice

    try:
        cliente = db.table("clientes").insert(novo).execute().data[0]
    except APIError as e:
        if e.code == "23505":
            raise _erro_unico(e) from e
        raise

    if enderecos:
        try:
            db.table("enderecos").insert(
                [{**e, "cliente_id": cliente["id"]} for e in enderecos]
            ).execute()
        except Exception:
            db.table("clientes").delete().eq("id", cliente["id"]).execute()
            raise
    return _cliente_out(db, _buscar_cliente(db, cliente["id"]))


@router.put("/{cliente_id}", response_model=ClienteOut)
def atualizar_cliente(cliente_id: int, dados: ClienteUpdate, db: Client = Depends(get_db)):
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        raise HTTPException(422, "Nenhum campo para atualizar")
    if "nome" in campos:
        if not (campos["nome"] or "").strip():
            raise HTTPException(422, "Nome obrigatório")
        campos["nome"] = campos["nome"].strip()
    if "telefone" in campos:
        campos["telefone"] = _validar_telefone(campos["telefone"] or "")
    if "cpf_cnpj" in campos:
        campos["cpf_cnpj"] = so_digitos(campos["cpf_cnpj"]) or None
    for campo in ("email", "observacoes"):
        if campo in campos:
            campos[campo] = _limpar(campos[campo])
    if "status" in campos and campos["status"] is None:
        del campos["status"]

    _buscar_cliente(db, cliente_id)
    try:
        db.table("clientes").update(campos).eq("id", cliente_id).execute()
    except APIError as e:
        if e.code == "23505":
            raise _erro_unico(e) from e
        raise
    return _cliente_out(db, _buscar_cliente(db, cliente_id))


@router.delete("/{cliente_id}", status_code=204)
def excluir_cliente(cliente_id: int, db: Client = Depends(get_db)):
    """Só exclui cliente sem vendas. Com histórico, marque como inativo (409)."""
    _buscar_cliente(db, cliente_id)
    vendas = db.table("vendas").select("id").eq("cliente_id", cliente_id).limit(1).execute().data
    if vendas:
        raise HTTPException(
            409,
            "Este cliente tem vendas registradas e não pode ser excluído. "
            "Altere o status para Inativo.",
        )
    db.table("clientes").delete().eq("id", cliente_id).execute()
    return Response(status_code=204)


# ------------------------------------------------------------- endereços


@router.post("/{cliente_id}/enderecos", response_model=EnderecoOut, status_code=201)
def adicionar_endereco(cliente_id: int, dados: EnderecoCreate, db: Client = Depends(get_db)):
    """Se principal=true, desmarcar o principal anterior."""
    cliente = _buscar_cliente(db, cliente_id)
    novo = _dados_endereco(dados)
    if not cliente.get("enderecos"):
        novo["principal"] = True
    if novo["principal"]:
        _desmarcar_principal(db, cliente_id)
    row = db.table("enderecos").insert({**novo, "cliente_id": cliente_id}).execute().data[0]
    return _endereco_por_id(db, row["id"])


def _endereco_por_id(db: Client, endereco_id: int) -> EnderecoOut:
    row = (
        db.table("enderecos")
        .select("*, regioes(nome, taxa_entrega)")
        .eq("id", endereco_id)
        .limit(1)
        .execute()
        .data[0]
    )
    return _endereco_out(row)


@router.put("/{cliente_id}/enderecos/{endereco_id}", response_model=EnderecoOut)
def atualizar_endereco(
    cliente_id: int, endereco_id: int, dados: EnderecoCreate, db: Client = Depends(get_db)
):
    atual = _buscar_endereco(db, cliente_id, endereco_id)
    novo = _dados_endereco(dados)
    if atual["principal"] and not novo["principal"]:
        novo["principal"] = True
    if novo["principal"] and not atual["principal"]:
        _desmarcar_principal(db, cliente_id)
    db.table("enderecos").update(novo).eq("id", endereco_id).execute()
    return _endereco_por_id(db, endereco_id)


@router.delete("/{cliente_id}/enderecos/{endereco_id}", status_code=204)
def remover_endereco(cliente_id: int, endereco_id: int, db: Client = Depends(get_db)):
    atual = _buscar_endereco(db, cliente_id, endereco_id)
    try:
        db.table("enderecos").delete().eq("id", endereco_id).execute()
    except APIError as e:
        if e.code == "23503":  # foreign_key_violation: usado em entregas
            raise HTTPException(
                409, "Esse endereço já foi usado em entregas e não pode ser removido"
            ) from e
        raise
    if atual["principal"]:
        resto = (
            db.table("enderecos").select("id").eq("cliente_id", cliente_id).order("id").limit(1)
        ).execute().data
        if resto:
            db.table("enderecos").update({"principal": True}).eq("id", resto[0]["id"]).execute()
    return Response(status_code=204)
