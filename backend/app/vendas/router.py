"""Módulo Vendas — responsável: Back-end 1."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.core.auth import get_current_user, get_db
from app.core.tempo import hoje
from app.vendas import filtros, servico
from app.vendas.schemas import (
    FormaPagamento,
    StatusVenda,
    VendaCreate,
    VendaOut,
    VendasLista,
)

router = APIRouter(prefix="/vendas", tags=["Vendas"])


@router.post("", response_model=VendaOut, status_code=201)
def registrar_venda(
    dados: VendaCreate,
    db: Client = Depends(get_db),
    usuario: dict = Depends(get_current_user),
):
    """Botão "Registrar Venda" do Atendimento e da Portaria.

    Tudo é gravado numa transação só, pela função SQL `registrar_venda`: venda,
    itens (preço lido do produto), baixa de estoque (cheio -N, vazio +N nos
    botijões), movimentações e, no atendimento, a entrega pendente. O usuário
    logado fica gravado na venda (auditoria).

    - Atendimento: cliente_id e endereco_id obrigatórios; o endereço precisa ser
      do cliente e ter região (é a região que define a taxa de entrega).
    - Portaria: cliente opcional, sem endereço, sem entrega e sem taxa.
    - Valores: item = quantidade × preço − desconto do item;
      subtotal = soma dos itens (já com desconto); total = subtotal + taxa.

    A resposta traz também `frequencia` (recálculo do hábito do cliente) e
    `entrega`, para o modal "Venda registrada". Se o recálculo falhar,
    `frequencia` vem null: a venda já foi gravada.

    Erros: 404 (cliente, endereço ou produto), 409 (estoque insuficiente),
    422 (dados inválidos, produto inativo, desconto maior que o item,
    endereço sem região).
    """
    return servico.registrar_venda(db, dados, usuario["id"])


@router.get("", response_model=VendasLista)
def listar_vendas(
    periodo: Literal["hoje", "7d", "30d"] | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    cliente_id: int | None = None,
    forma_pagamento: FormaPagamento | None = None,
    status: StatusVenda | None = None,
    busca: str | None = Query(None, description="Nome do cliente ou nº do pedido (123 ou #123)"),
    ordem: Literal["mais_recentes", "mais_antigas", "maior_valor"] = "mais_recentes",
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(20, ge=1, le=100),
    db: Client = Depends(get_db),
):
    """Histórico de Vendas: filtros + totais do período.

    Datas no horário de Brasília; `data_fim` inclusiva. Use `periodo` OU
    `data_inicio`/`data_fim` (os dois juntos dão 422). `totais` vale para todo o
    filtro, não só para a página, e ignora vendas canceladas (a não ser com
    status=cancelada).
    """
    inicio, fim = filtros.intervalo_do_filtro(periodo, data_inicio, data_fim, hoje())
    return servico.listar_vendas(
        db,
        inicio=inicio,
        fim=fim,
        cliente_id=cliente_id,
        forma_pagamento=forma_pagamento,
        status_venda=status,
        busca=busca,
        ordem=ordem,
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/{venda_id}", response_model=VendaOut)
def obter_venda(venda_id: int, db: Client = Depends(get_db)):
    """Venda com itens e nome do cliente (sem `frequencia`/`entrega`, que são
    só da resposta do POST)."""
    return servico.obter_venda(db, venda_id)
