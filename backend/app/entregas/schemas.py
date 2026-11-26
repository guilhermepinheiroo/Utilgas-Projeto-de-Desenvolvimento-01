from datetime import datetime
from typing import Literal

from pydantic import BaseModel

StatusEntrega = Literal["pendente", "entregue", "cancelada"]
TipoVeiculo = Literal["Moto", "Carro", "Caminhão"]


class EntregaItem(BaseModel):
    produto_nome: str
    categoria: str | None = None
    quantidade: int


class EntregaOut(BaseModel):
    """Linha da tabela de Gerenciamento de Entregas."""

    id: int
    venda_id: int
    status: StatusEntrega
    cliente_nome: str | None = None
    cliente_telefone: str | None = None
    entregador_id: int | None = None
    entregador_nome: str | None = None
    endereco: str | None = None
    bairro: str | None = None
    itens: list[EntregaItem] = []
    valor: float
    observacao: str | None = None
    criado_em: datetime
    entregue_em: datetime | None = None


class EntregaUpdate(BaseModel):
    """PATCH parcial: atribuir entregador e/ou mudar status.

    status=cancelada chama a função SQL cancelar_venda: devolve os itens ao estoque
    (movimentação de entrada, origem=cancelamento) e cancela a venda.
    status=entregue grava entregue_em.
    """

    status: StatusEntrega | None = None
    entregador_id: int | None = None
    observacao: str | None = None


class ResumoEntregas(BaseModel):
    """Cards do topo: total do dia (sem canceladas), pendentes e concluídas do dia."""

    total_hoje: int
    pendentes: int
    concluidas: int
    variacao_vs_ontem_pct: float | None = None


class EntregadorBase(BaseModel):
    nome: str
    telefone: str | None = None


class EntregadorCreate(EntregadorBase):
    cpf: str
    tipo_veiculo: TipoVeiculo
    placa: str
    pix_observacoes: str | None = None


class EntregadorUpdate(BaseModel):
    nome: str | None = None
    telefone: str | None = None
    cpf: str | None = None
    tipo_veiculo: TipoVeiculo | None = None
    placa: str | None = None
    pix_observacoes: str | None = None
    ativo: bool | None = None


class EntregadorOut(EntregadorBase):
    id: int
    ativo: bool
    cpf: str | None = None
    tipo_veiculo: TipoVeiculo | None = None
    placa: str | None = None
    pix_observacoes: str | None = None


class RegiaoOut(BaseModel):
    id: int
    nome: str
    taxa_entrega: float
