"""Módulo Vendas — responsável: Back-end 1."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Query

from app.core.errors import nao_implementado
from app.vendas.schemas import (
    FormaPagamento,
    StatusVenda,
    VendaCreate,
    VendaOut,
    VendasLista,
)

router = APIRouter(prefix="/vendas", tags=["Vendas"])


@router.post("", response_model=VendaOut, status_code=201)
def registrar_venda(dados: VendaCreate):
    """Tudo acontece em UMA transação dentro da função SQL `registrar_venda`:

        from app.core.db_errors import chamar_rpc
        res = chamar_rpc(db, "registrar_venda", {"p_dados": {...}, "p_usuario_id": uid})
        # res = {"venda": {...}, "itens": [...], "entrega": {...} | None}

    A função valida estoque, copia o preço do produto, calcula subtotal/taxa/total,
    grava venda + itens, baixa 1 CHEIO e sobe 1 VAZIO por unidade (produtos com
    controla_vazio), grava as movimentações e cria a entrega pendente (atendimento).

    Chaves de p_dados: origem, cliente_id, endereco_id, forma_pagamento,
    observacao_entregador, itens[{produto_id, quantidade, desconto}].

    Cabe à rota: montar o JSON, chamar a função e devolver o VendaOut.
    Frequência do cliente: calcule ANTES e DEPOIS da chamada; se o recálculo falhar,
    devolva frequencia=None (a venda já foi gravada).

    Erros (chamar_rpc converte): 404 (cliente/produto), 409 (estoque insuficiente),
    422 (dados inválidos).
    """
    raise nao_implementado()


@router.get("", response_model=VendasLista)
def listar_vendas(
    periodo: Literal["hoje", "7d", "30d"] | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    cliente_id: int | None = None,
    forma_pagamento: FormaPagamento | None = None,
    status: StatusVenda | None = None,
    busca: str | None = Query(None, description="Nome do cliente ou nº do pedido"),
    ordem: Literal["mais_recentes", "mais_antigas", "maior_valor"] = "mais_recentes",
):
    """Histórico de Vendas: filtros + totais do período."""
    raise nao_implementado()


@router.get("/{venda_id}", response_model=VendaOut)
def obter_venda(venda_id: int):
    raise nao_implementado()
