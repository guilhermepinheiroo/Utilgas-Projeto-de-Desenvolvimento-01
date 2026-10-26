from datetime import datetime

from fastapi import HTTPException
from supabase import Client

from app.clientes.indicadores import recalcular_apos_venda
from app.clientes.servico import SELECT_COMPRAS, com_compras_validas, datas_de_compra
from app.core.db_errors import chamar_rpc
from app.core.errors import nao_encontrado
from app.core.tempo import data_local, para_iso_utc
from app.vendas.filtros import interpretar_busca
from app.vendas.schemas import VendaCreate, VendaOut, VendaResumo, VendasLista

SELECT_VENDA_COM_ITENS = (
    "*, clientes(nome),"
    " itens_venda(id, produto_id, quantidade, preco_unitario, desconto, subtotal, produtos(nome))"
)


def registrar_venda(db: Client, dados: VendaCreate, usuario_id: str | None) -> VendaOut:
    cliente = _cliente_antes_da_venda(db, dados)
    if cliente and dados.origem == "atendimento":
        _recusar_endereco_sem_regiao(cliente, dados.endereco_id)

    gravada = chamar_rpc(
        db,
        "registrar_venda",
        {"p_dados": dados.model_dump(mode="json"), "p_usuario_id": usuario_id},
    )
    venda = gravada["venda"]
    return VendaOut(
        **venda,
        cliente_nome=cliente["nome"] if cliente else None,
        itens=gravada["itens"],
        entrega=gravada["entrega"],
        frequencia=(
            recalcular_apos_venda(datas_de_compra(cliente), data_local(venda["criado_em"]))
            if cliente
            else None
        ),
    )


def obter_venda(db: Client, venda_id: int) -> VendaOut:
    linhas = (
        db.table("vendas").select(SELECT_VENDA_COM_ITENS).eq("id", venda_id).limit(1).execute()
    ).data
    if not linhas:
        raise nao_encontrado("Venda não encontrada")
    venda = linhas[0]
    itens = sorted(venda["itens_venda"], key=lambda item: item["id"])
    return VendaOut(
        **venda,
        cliente_nome=(venda["clientes"] or {}).get("nome"),
        itens=[item | {"produto_nome": item["produtos"]["nome"]} for item in itens],
    )


def listar_vendas(
    db: Client,
    *,
    inicio: datetime | None,
    fim: datetime | None,
    cliente_id: int | None,
    forma_pagamento: str | None,
    status_venda: str | None,
    busca: str | None,
    ordem: str,
    pagina: int,
    tamanho: int,
) -> VendasLista:
    numero_do_pedido, nome_do_cliente = interpretar_busca(busca)
    historico = chamar_rpc(
        db,
        "historico_vendas",
        {
            "p_inicio": para_iso_utc(inicio) if inicio else None,
            "p_fim": para_iso_utc(fim) if fim else None,
            "p_cliente_id": cliente_id,
            "p_forma_pagamento": forma_pagamento,
            "p_status": status_venda,
            "p_venda_id": numero_do_pedido,
            "p_nome_cliente": nome_do_cliente,
            "p_ordem": ordem,
            "p_limite": tamanho,
            "p_deslocamento": (pagina - 1) * tamanho,
        },
    )
    return VendasLista(
        totais=historico["totais"],
        itens=[_linha_do_historico(venda) for venda in historico["itens"]],
        total=historico["total"],
        pagina=pagina,
        tamanho=tamanho,
    )


def _cliente_antes_da_venda(db: Client, dados: VendaCreate) -> dict | None:
    if dados.cliente_id is None:
        return None
    consulta = (
        db.table("clientes")
        .select(f"nome, enderecos(id, regiao_id), {SELECT_COMPRAS}")
        .eq("id", dados.cliente_id)
    )
    linhas = com_compras_validas(consulta).limit(1).execute().data
    return linhas[0] if linhas else None


def _recusar_endereco_sem_regiao(cliente: dict, endereco_id: int | None) -> None:
    endereco_da_entrega = next((e for e in cliente["enderecos"] if e["id"] == endereco_id), None)
    if endereco_da_entrega and endereco_da_entrega["regiao_id"] is None:
        raise HTTPException(
            422,
            "Endereço sem região: defina a região no cadastro do cliente "
            "para calcular a taxa de entrega",
        )


def _linha_do_historico(venda: dict) -> VendaResumo:
    return VendaResumo(
        **venda,
        itens_resumo=[f"{item['quantidade']}x {item['produto_nome']}" for item in venda["itens"]],
    )
