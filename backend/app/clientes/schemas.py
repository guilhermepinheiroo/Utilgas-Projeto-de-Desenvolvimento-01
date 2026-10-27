from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

StatusCliente = Literal["ativo", "inativo", "inadimplente"]


class EnderecoBase(BaseModel):
    endereco: str = Field(description="Rua e número")
    complemento: str | None = None
    cep: str | None = None
    bairro: str | None = None
    regiao_id: int | None = None
    principal: bool = False


class EnderecoCreate(EnderecoBase):
    pass


class EnderecoOut(EnderecoBase):
    id: int
    cliente_id: int
    regiao_nome: str | None = None
    taxa_entrega: float | None = None


class ClienteBase(BaseModel):
    nome: str
    telefone: str = Field(description="Somente dígitos, ex: 53988124477")
    cpf_cnpj: str | None = None
    email: str | None = None
    observacoes: str | None = None
    status: StatusCliente = "ativo"


class ClienteCreate(ClienteBase):
    enderecos: list[EnderecoCreate] = []


class ClienteUpdate(BaseModel):
    nome: str | None = None
    telefone: str | None = None
    cpf_cnpj: str | None = None
    email: str | None = None
    observacoes: str | None = None
    status: StatusCliente | None = None


class IndicadoresCliente(BaseModel):
    """Calculados a partir do histórico de vendas (não ficam gravados)."""

    total_pedidos: int = 0
    ultima_compra: date | None = None
    dias_desde_ultima_compra: int | None = None
    frequencia_media_dias: int | None = None
    recompra_prevista_em_dias: int | None = None


class ClienteOut(ClienteBase):
    id: int
    criado_em: datetime
    enderecos: list[EnderecoOut] = []
    indicadores: IndicadoresCliente | None = None


class ClienteResumo(BaseModel):
    """Linha da tabela de listagem de clientes."""

    id: int
    nome: str
    telefone: str
    cpf_cnpj: str | None = None
    endereco_principal: str | None = None
    bairro: str | None = None
    ultima_compra: date | None = None
    status: StatusCliente
    criado_em: datetime


class ClientesPagina(BaseModel):
    itens: list[ClienteResumo]
    total: int
    pagina: int
    tamanho: int


class Indicador(BaseModel):
    valor: int
    variacao_pct: float | None = None


class ResumoClientes(BaseModel):
    """Cards do topo da tela Clientes."""

    total: Indicador
    novos_no_mes: Indicador
    ativos: Indicador
    inadimplentes: Indicador
