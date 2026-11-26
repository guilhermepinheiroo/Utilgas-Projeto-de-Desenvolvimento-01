"""Módulo Entregas, Entregadores e Regiões — responsável: Back-end 2."""
import re
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from postgrest.exceptions import APIError
from supabase import Client

from app.core.auth import get_current_user, get_db
from app.core.db_errors import chamar_rpc
from app.core.tempo import agora, meia_noite, para_iso_utc
from app.entregas.schemas import (
    EntregadorCreate,
    EntregadorOut,
    EntregadorUpdate,
    EntregaItem,
    EntregaOut,
    EntregaUpdate,
    RegiaoOut,
    ResumoEntregas,
    StatusEntrega,
)

router = APIRouter(prefix="/entregas", tags=["Entregas"])
entregadores_router = APIRouter(prefix="/entregadores", tags=["Entregadores"])
regioes_router = APIRouter(prefix="/regioes", tags=["Regiões"])

TIPOS_VEICULO = {"Moto", "Carro", "Caminhão"}

# Uma consulta só traz entrega + entregador + endereço + venda + cliente + itens.
SELECT_ENTREGA = (
    "*, entregadores(nome), enderecos(endereco, complemento, bairro), "
    "vendas(total, clientes(nome, telefone), itens_venda(quantidade, produtos(nome, categoria)))"
)


def _entrega_out(row: dict) -> EntregaOut:
    venda = row.get("vendas") or {}
    cliente = venda.get("clientes") or {}
    entregador = row.get("entregadores") or {}
    end = row.get("enderecos") or {}
    endereco = end.get("endereco")
    if endereco and end.get("complemento"):
        endereco = f"{endereco} ({end['complemento']})"

    return EntregaOut(
        id=row["id"],
        venda_id=row["venda_id"],
        status=row["status"],
        cliente_nome=cliente.get("nome"),
        cliente_telefone=cliente.get("telefone"),
        entregador_id=row["entregador_id"],
        entregador_nome=entregador.get("nome"),
        endereco=endereco,
        bairro=end.get("bairro"),
        itens=[
            EntregaItem(
                produto_nome=(i.get("produtos") or {}).get("nome", ""),
                categoria=(i.get("produtos") or {}).get("categoria"),
                quantidade=i["quantidade"],
            )
            for i in venda.get("itens_venda") or []
        ],
        valor=venda.get("total", 0),
        observacao=row.get("observacao"),
        criado_em=row["criado_em"],
        entregue_em=row.get("entregue_em"),
    )


def _buscar_entrega(db: Client, entrega_id: int) -> dict:
    rows = db.table("entregas").select(SELECT_ENTREGA).eq("id", entrega_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Entrega não encontrada")
    return rows[0]


def _contar(db: Client, **filtros) -> int:
    q = db.table("entregas").select("id", count="exact").limit(1)
    for campo, valor in filtros.items():
        if campo.endswith("__gte"):
            q = q.gte(campo[:-5], valor)
        elif campo.endswith("__lt"):
            q = q.lt(campo[:-4], valor)
        elif campo.endswith("__neq"):
            q = q.neq(campo[:-5], valor)
        else:
            q = q.eq(campo, valor)
    return q.execute().count or 0


def _dia_utc(dia: date) -> tuple[str, str]:
    """Início e fim (exclusivo) do dia de Brasília, em UTC."""
    return para_iso_utc(meia_noite(dia)), para_iso_utc(meia_noite(dia + timedelta(days=1)))


# ---------------------------------------------------------------- entregas


@router.get("", response_model=list[EntregaOut])
def listar_entregas(
    status: StatusEntrega | None = None,
    entregador_id: int | None = None,
    busca: str | None = None,
    data: date | None = Query(None, description="Dia (Brasília) em que a entrega foi criada"),
    db: Client = Depends(get_db),
):
    """Filtros da tela: data, busca (cliente, endereço, pedido), entregador e status."""
    q = db.table("entregas").select(SELECT_ENTREGA)
    if data:
        inicio, fim = _dia_utc(data)
        q = q.gte("criado_em", inicio).lt("criado_em", fim)
    if status:
        q = q.eq("status", status)
    if entregador_id is not None:
        q = q.eq("entregador_id", entregador_id)
    rows = q.order("criado_em", desc=True).limit(500).execute().data
    entregas = [_entrega_out(r) for r in rows]

    if busca and busca.strip():
        termo = busca.strip().lower()
        entregas = [
            e
            for e in entregas
            if termo in (e.cliente_nome or "").lower()
            or termo in (e.endereco or "").lower()
            or termo.lstrip("#") == str(e.venda_id)
        ]
    return entregas


@router.get("/resumo", response_model=ResumoEntregas)
def resumo_entregas(
    data: date | None = Query(None, description="Padrão: hoje (Brasília)"),
    db: Client = Depends(get_db),
):
    """Cards do topo para o dia escolhido. Canceladas não entram no total."""
    dia = data or agora().date()
    inicio, fim = _dia_utc(dia)
    inicio_ant, _ = _dia_utc(dia - timedelta(days=1))

    total_dia = _contar(db, criado_em__gte=inicio, criado_em__lt=fim, status__neq="cancelada")
    total_anterior = _contar(
        db, criado_em__gte=inicio_ant, criado_em__lt=inicio, status__neq="cancelada"
    )

    return ResumoEntregas(
        total_hoje=total_dia,
        pendentes=_contar(db, status="pendente", criado_em__gte=inicio, criado_em__lt=fim),
        concluidas=_contar(db, status="entregue", criado_em__gte=inicio, criado_em__lt=fim),
        variacao_vs_ontem_pct=(
            round((total_dia - total_anterior) / total_anterior * 100, 1)
            if total_anterior
            else None
        ),
    )


@router.patch("/{entrega_id}", response_model=EntregaOut)
def atualizar_entrega(
    entrega_id: int,
    dados: EntregaUpdate,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Atribuir entregador, marcar como entregue ou cancelar.

    Máquina de estados: pendente -> entregue | cancelada. Entrega já finalizada
    (entregue/cancelada) não aceita mais alterações (409).
    """
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        raise HTTPException(422, "Nenhum campo para atualizar")

    entrega = _buscar_entrega(db, entrega_id)
    if entrega["status"] != "pendente":
        raise HTTPException(409, f"Entrega já está {entrega['status']}")

    novo_status = campos.get("status")
    entregador_id = campos.get("entregador_id")

    # 1) valida o entregador, se veio um
    if entregador_id is not None:
        achado = (
            db.table("entregadores")
            .select("id, ativo")
            .eq("id", entregador_id)
            .limit(1)
            .execute()
            .data
        )
        if not achado:
            raise HTTPException(404, "Entregador não encontrado")
        if not achado[0]["ativo"]:
            raise HTTPException(422, "Entregador inativo")

    # 2) cancelar: tudo (venda, entrega, estoque) é desfeito pelo banco, numa transação
    if novo_status == "cancelada":
        chamar_rpc(
            db,
            "cancelar_venda",
            {"p_venda_id": entrega["venda_id"], "p_usuario_id": user["id"]},
        )
        if campos.get("observacao") is not None:
            db.table("entregas").update({"observacao": campos["observacao"]}).eq(
                "id", entrega_id
            ).execute()
        return _entrega_out(_buscar_entrega(db, entrega_id))

    # 3) atribuir / entregar
    update: dict = {}
    if entregador_id is not None:
        update["entregador_id"] = entregador_id
    if campos.get("observacao") is not None:
        update["observacao"] = campos["observacao"]

    if novo_status == "entregue":
        if not (entregador_id or entrega["entregador_id"]):
            raise HTTPException(422, "Atribua um entregador antes de marcar como entregue")
        update["status"] = "entregue"
        update["entregue_em"] = datetime.now(timezone.utc).isoformat()

    if update:
        # .eq("status", "pendente") evita corrida: se alguém finalizou no meio, não grava
        gravou = (
            db.table("entregas")
            .update(update)
            .eq("id", entrega_id)
            .eq("status", "pendente")
            .execute()
            .data
        )
        if not gravou:
            raise HTTPException(409, "A entrega foi alterada por outra pessoa. Recarregue.")

    return _entrega_out(_buscar_entrega(db, entrega_id))


# ------------------------------------------------------------- entregadores


def _dados_entregador(campos: dict) -> dict:
    nome = (campos.get("nome") or "").strip()
    if not nome:
        raise HTTPException(422, "Nome obrigatório")

    telefone = re.sub(r"\D", "", campos.get("telefone") or "")
    if len(telefone) not in (10, 11):
        raise HTTPException(422, "Telefone deve ter DDD + número (10 ou 11 dígitos)")

    cpf = re.sub(r"\D", "", campos.get("cpf") or "")
    if not cpf:
        raise HTTPException(422, "Informe o CPF")

    tipo_veiculo = campos.get("tipo_veiculo")
    if tipo_veiculo not in TIPOS_VEICULO:
        raise HTTPException(422, "Selecione um tipo de veículo válido")

    placa = (campos.get("placa") or "").strip()
    if not placa:
        raise HTTPException(422, "Informe a placa do veículo")

    observacoes = campos.get("pix_observacoes")
    observacoes = observacoes.strip() if observacoes else None
    return {
        "nome": nome,
        "telefone": telefone,
        "cpf": cpf,
        "tipo_veiculo": tipo_veiculo,
        "placa": placa,
        "pix_observacoes": observacoes or None,
    }


def _executar_entregador(query) -> list[dict]:
    try:
        return query.execute().data
    except APIError as e:
        detalhe = f"{e.message} {e.details}".lower()
        if "cpf" in detalhe and ("duplicate" in detalhe or "unique" in detalhe):
            raise HTTPException(409, "Já existe um entregador cadastrado com esse CPF") from e
        raise


@entregadores_router.get("", response_model=list[EntregadorOut])
def listar_entregadores(
    ativo: bool | None = True,
    incluir_inativos: bool = False,
    db: Client = Depends(get_db),
):
    q = db.table("entregadores").select("*")
    if not incluir_inativos and ativo is not None:
        q = q.eq("ativo", ativo)
    return q.order("nome").execute().data


@entregadores_router.post("", response_model=EntregadorOut, status_code=201)
def criar_entregador(
    dados: EntregadorCreate,
    db: Client = Depends(get_db),
    _usuario: dict = Depends(get_current_user),
):
    novo = _dados_entregador(dados.model_dump())
    return _executar_entregador(db.table("entregadores").insert(novo))[0]


@entregadores_router.patch("/{entregador_id}", response_model=EntregadorOut)
def atualizar_entregador(
    entregador_id: int,
    dados: EntregadorUpdate,
    db: Client = Depends(get_db),
    _usuario: dict = Depends(get_current_user),
):
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        raise HTTPException(422, "Nenhum campo para atualizar")

    atual = (
        db.table("entregadores")
        .select("*")
        .eq("id", entregador_id)
        .limit(1)
        .execute()
        .data
    )
    if not atual:
        raise HTTPException(404, "Entregador não encontrado")

    campos_perfil = {"nome", "telefone", "cpf", "tipo_veiculo", "placa", "pix_observacoes"}
    update: dict = {}
    if campos_perfil.intersection(campos):
        update.update(_dados_entregador({**atual[0], **campos}))
    if "ativo" in campos:
        if campos["ativo"] is None:
            raise HTTPException(422, "Informe se o entregador está ativo")
        update["ativo"] = campos["ativo"]

    _executar_entregador(db.table("entregadores").update(update).eq("id", entregador_id))
    return {**atual[0], **update}


@entregadores_router.delete("/{entregador_id}", status_code=204)
def excluir_entregador(
    entregador_id: int,
    db: Client = Depends(get_db),
    _usuario: dict = Depends(get_current_user),
):
    atual = (
        db.table("entregadores")
        .select("id")
        .eq("id", entregador_id)
        .limit(1)
        .execute()
        .data
    )
    if not atual:
        raise HTTPException(404, "Entregador não encontrado")

    entregas_vinculadas = (
        db.table("entregas")
        .select("id")
        .eq("entregador_id", entregador_id)
        .limit(1)
        .execute()
        .data
    )
    if entregas_vinculadas:
        raise HTTPException(
            409,
            "Não é possível excluir um entregador associado a entregas. O histórico foi preservado.",
        )

    try:
        db.table("entregadores").delete().eq("id", entregador_id).execute()
    except APIError as e:
        if e.code == "23503" or "foreign key" in f"{e.message} {e.details}".lower():
            raise HTTPException(
                409,
                "Não é possível excluir um entregador associado a entregas. O histórico foi preservado.",
            ) from e
        raise

    return Response(status_code=204)


# ------------------------------------------------------------------ regiões


@regioes_router.get("", response_model=list[RegiaoOut])
def listar_regioes(db: Client = Depends(get_db)):
    """Região define a taxa de entrega cobrada na venda."""
    q = db.table("regioes").select("id, nome, taxa_entrega").eq("ativo", True)
    return q.order("nome").execute().data