from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Origem = Literal["atendimento", "portaria"]
FormaPagamento = Literal["pix", "dinheiro", "cartao_credito", "cartao_debito"]
StatusVenda = Literal["pendente", "concluida", "cancelada"]


class ItemVendaIn(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0)
    desconto: float = Field(0, ge=0, description="Desconto total do item em R$")


class VendaCreate(BaseModel):
    """Corpo do POST /vendas (botão 'Registrar Venda').

    Preço unitário e taxa de entrega NÃO vêm do front: o servidor lê o preço
    do produto e a taxa da região do endereço.
    """

    origem: Origem
    cliente_id: int | None = Field(
        None, description="Obrigatório no atendimento; opcional na portaria"
    )
    endereco_id: int | None = Field(None, description="Obrigatório no atendimento (gera entrega)")
    forma_pagamento: FormaPagamento
    observacao_entregador: str | None = None
    itens: list[ItemVendaIn] = Field(min_length=1)


class ItemVendaOut(BaseModel):
    produto_id: int
    produto_nome: str
    quantidade: int
    preco_unitario: float
    desconto: float
    subtotal: float


class FrequenciaRecalculada(BaseModel):
    """Bloco 'Recálculo de frequência' do modal Venda registrada."""

    anterior_dias: int | None = None
    nova_dias: int | None = None
    recompra_prevista_em_dias: int | None = None
    dentro_da_janela_de_contato: bool | None = None


class EntregaCriada(BaseModel):
    """Bloco 'Entrega' do modal Venda registrada."""

    id: int
    status: str
    regiao: str | None = None
    entregador_id: int | None = None


class VendaOut(BaseModel):
    id: int
    criado_em: datetime
    origem: Origem
    cliente_id: int | None = None
    cliente_nome: str | None = None
    forma_pagamento: FormaPagamento
    subtotal: float
    desconto: float
    taxa_entrega: float
    total: float
    status: StatusVenda
    itens: list[ItemVendaOut]
    # Preenchidos apenas na resposta do POST /vendas:
    frequencia: FrequenciaRecalculada | None = None
    entrega: EntregaCriada | None = None


class VendaResumo(BaseModel):
    """Linha do Histórico de Vendas."""

    id: int
    criado_em: datetime
    cliente_nome: str | None = None
    itens_resumo: list[str]
    forma_pagamento: FormaPagamento
    total: float
    status: StatusVenda


class TotaisVendas(BaseModel):
    total_vendas: float
    quantidade_vendas: int
    clientes_atendidos: int
    ticket_medio: float


class VendasLista(BaseModel):
    totais: TotaisVendas
    itens: list[VendaResumo]
