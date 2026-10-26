from contextlib import contextmanager
from datetime import date

from fastapi import HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from app.clientes.enderecos import SELECT_ENDERECO, endereco_out, validar_regioes
from app.clientes.indicadores import VENDAS_LIDAS_PARA_INDICADORES, calcular_indicadores
from app.clientes.schemas import (
    ClienteCreate,
    ClienteOut,
    ClienteResumo,
    ClientesPagina,
    ClienteUpdate,
    IndicadoresCliente,
)
from app.core.db_errors import PAGINA_ALEM_DO_FIM, restricao_unica_violada
from app.core.errors import nao_encontrado
from app.core.normalizacao import so_digitos
from app.core.tempo import data_local, hoje

STATUS_QUE_NAO_CONTA_COMO_COMPRA = "cancelada"
SELECT_COMPRAS = "vendas(criado_em)"
SELECT_CLIENTE = f"*, enderecos({SELECT_ENDERECO}), {SELECT_COMPRAS}"
SELECT_LINHA_DA_LISTAGEM = (
    f"id, nome, telefone, status, enderecos(endereco, principal), {SELECT_COMPRAS}"
)
CAMPO_E_ROTULO_POR_RESTRICAO = {
    "clientes_telefone_key": ("telefone", "Telefone"),
    "clientes_cpf_cnpj_key": ("cpf_cnpj", "CPF/CNPJ"),
}


def com_compras_validas(consulta, limite: int = VENDAS_LIDAS_PARA_INDICADORES):
    return (
        consulta.neq("vendas.status", STATUS_QUE_NAO_CONTA_COMO_COMPRA)
        .order("criado_em", desc=True, foreign_table="vendas")
        .limit(limite, foreign_table="vendas")
    )


def datas_de_compra(linha: dict) -> list[date]:
    return [data_local(venda["criado_em"]) for venda in linha["vendas"]]


def obter_cliente(db: Client, cliente_id: int) -> ClienteOut:
    return _cliente_completo(db, "id", cliente_id)


def buscar_por_telefone(db: Client, telefone: str) -> ClienteOut:
    return _cliente_completo(db, "telefone", telefone)


def listar_clientes(
    db: Client, busca: str | None, status_cliente: str | None, pagina: int, tamanho: int
) -> ClientesPagina:
    inicio = (pagina - 1) * tamanho
    consulta = _filtrar(
        db.table("clientes").select(SELECT_LINHA_DA_LISTAGEM, count="exact"),
        busca,
        status_cliente,
    )
    try:
        resposta = (
            com_compras_validas(consulta.eq("enderecos.principal", True), limite=1)
            .order("nome")
            .order("id")
            .range(inicio, inicio + tamanho - 1)
            .execute()
        )
    except APIError as e:
        if e.code != PAGINA_ALEM_DO_FIM:
            raise
        total = _contar_clientes(db, busca, status_cliente)
        return ClientesPagina(itens=[], total=total, pagina=pagina, tamanho=tamanho)

    return ClientesPagina(
        itens=[_linha_da_listagem(c) for c in resposta.data],
        total=resposta.count or 0,
        pagina=pagina,
        tamanho=tamanho,
    )


def criar_cliente(db: Client, dados: ClienteCreate) -> ClienteOut:
    validar_regioes(db, {e.regiao_id for e in dados.enderecos})

    with _duplicidade_vira_409(db, dados.model_dump()):
        cliente = db.table("clientes").insert(dados.model_dump(exclude={"enderecos"})).execute()
    criado = cliente.data[0]

    enderecos = []
    if dados.enderecos:
        try:
            enderecos = _gravar_enderecos_do_cadastro(db, criado["id"], dados)
        except Exception:
            _desfazer_cadastro(db, criado["id"])
            raise

    return _cliente_out(criado | {"enderecos": enderecos}, IndicadoresCliente())


def atualizar_cliente(db: Client, cliente_id: int, dados: ClienteUpdate) -> ClienteOut:
    campos = dados.model_dump(exclude_unset=True)
    if campos:
        with _duplicidade_vira_409(db, campos):
            atualizados = db.table("clientes").update(campos).eq("id", cliente_id).execute()
        if not atualizados.data:
            raise nao_encontrado("Cliente não encontrado")
    return obter_cliente(db, cliente_id)


def _cliente_completo(db: Client, campo: str, valor) -> ClienteOut:
    consulta = db.table("clientes").select(SELECT_CLIENTE).eq(campo, valor)
    linhas = com_compras_validas(consulta).limit(1).execute().data
    if not linhas:
        raise nao_encontrado("Cliente não encontrado")
    return _cliente_out(linhas[0], _indicadores(db, linhas[0]))


def _indicadores(db: Client, linha: dict) -> IndicadoresCliente:
    datas = datas_de_compra(linha)
    leu_todas_as_compras = len(datas) < VENDAS_LIDAS_PARA_INDICADORES
    total = len(datas) if leu_todas_as_compras else _contar_compras(db, linha["id"])
    return calcular_indicadores(datas, total_pedidos=total, hoje=hoje())


def _contar_compras(db: Client, cliente_id: int) -> int:
    resposta = (
        db.table("vendas")
        .select("id", count="exact", head=True)
        .eq("cliente_id", cliente_id)
        .neq("status", STATUS_QUE_NAO_CONTA_COMO_COMPRA)
        .execute()
    )
    return resposta.count or 0


def _cliente_out(linha: dict, indicadores: IndicadoresCliente) -> ClienteOut:
    principal_primeiro = sorted(linha["enderecos"], key=lambda e: (not e["principal"], e["id"]))
    return ClienteOut(
        **(linha | {"enderecos": [endereco_out(e) for e in principal_primeiro]}),
        indicadores=indicadores,
    )


def _filtrar(consulta, busca: str | None, status_cliente: str | None):
    if status_cliente:
        consulta = consulta.eq("status", status_cliente)
    termo = (busca or "").strip()
    if not termo:
        return consulta
    if _parece_telefone_ou_documento(termo):
        digitos = so_digitos(termo)
        return consulta.or_(f"telefone.like.*{digitos}*,cpf_cnpj.like.*{digitos}*")
    return consulta.ilike("nome", f"*{_escapar_curingas_do_like(termo)}*")


def _parece_telefone_ou_documento(termo: str) -> bool:
    return bool(so_digitos(termo)) and not any(c.isalpha() for c in termo)


def _escapar_curingas_do_like(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _contar_clientes(db: Client, busca: str | None, status_cliente: str | None) -> int:
    consulta = db.table("clientes").select("id", count="exact", head=True)
    return _filtrar(consulta, busca, status_cliente).execute().count or 0


def _linha_da_listagem(cliente: dict) -> ClienteResumo:
    principal = cliente["enderecos"][0] if cliente["enderecos"] else None
    ultima_venda = cliente["vendas"][0] if cliente["vendas"] else None
    return ClienteResumo(
        **cliente,
        endereco_principal=principal["endereco"] if principal else None,
        ultima_compra=data_local(ultima_venda["criado_em"]) if ultima_venda else None,
    )


@contextmanager
def _duplicidade_vira_409(db: Client, valores: dict):
    try:
        yield
    except APIError as e:
        restricao = restricao_unica_violada(e, CAMPO_E_ROTULO_POR_RESTRICAO)
        if restricao is None:
            raise
        campo, rotulo = CAMPO_E_ROTULO_POR_RESTRICAO[restricao]
        raise HTTPException(409, _ja_cadastrado(db, rotulo, campo, valores[campo])) from e


def _ja_cadastrado(db: Client, rotulo: str, campo: str, valor: str) -> str:
    donos = db.table("clientes").select("id, nome").eq(campo, valor).limit(1).execute().data
    if not donos:
        return f"{rotulo} já cadastrado"
    return f"{rotulo} já cadastrado para {donos[0]['nome']} (cliente {donos[0]['id']})"


def _gravar_enderecos_do_cadastro(db: Client, cliente_id: int, dados: ClienteCreate) -> list[dict]:
    enderecos = [e.model_dump() | {"cliente_id": cliente_id} for e in dados.enderecos]
    if not any(e["principal"] for e in enderecos):
        enderecos[0]["principal"] = True
    return db.table("enderecos").insert(enderecos).select(SELECT_ENDERECO).execute().data


def _desfazer_cadastro(db: Client, cliente_id: int) -> None:
    db.table("clientes").delete().eq("id", cliente_id).execute()
