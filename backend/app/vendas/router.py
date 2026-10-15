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
    """Operação crítica — tudo na MESMA transação (sugestão: função SQL/RPC):

    1. Ler preços dos produtos e validar estoque (estoque_atual >= quantidade).
    2. Calcular subtotal, desconto, taxa de entrega (taxa da região do endereço) e total.
    3. Inserir venda + itens_venda (preco_unitario copiado do produto).
    4. Baixar estoque e gravar movimentacoes_estoque (tipo=saida, origem=venda).
    5. Se origem=atendimento: criar entrega pendente (sem entregador).
    6. Recalcular frequência média do cliente e devolver em `frequencia`.

    Erros: 404 (cliente/produto), 409 (estoque insuficiente), 422 (dados inválidos).
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
