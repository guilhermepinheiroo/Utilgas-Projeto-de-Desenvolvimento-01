from datetime import date

from pydantic import BaseModel


class Faturamento(BaseModel):
    inicio: date
    fim: date
    faturamento: float
    qtd_vendas: int
    ticket_medio: float


class VendaDiaria(BaseModel):
    dia: date
    qtd_vendas: int
    faturamento: float


class DashboardEstoque(BaseModel):
    total_produtos: int
    produtos_em_alerta: int
    total_em_estoque: int
    total_vazios: int
    valor_em_estoque: float  # soma de estoque_atual * preco (só cheios, só ativos)


class PontoVendasCategoria(BaseModel):
    """Unidades vendidas por categoria (hora a hora em "hoje", dia a dia nos demais)."""

    rotulo: str
    botijao: int
    agua: int


class EstoqueResumoProduto(BaseModel):
    quantidade: int
    variacao_mensal_pct: float | None = None


class SerieEstoque(BaseModel):
    chave: str
    nome: str


class EstoqueMensal(BaseModel):
    """Saldo de cheios no fim de cada mês (últimos 12), por produto da categoria."""

    series: list[SerieEstoque]
    pontos: list[dict]
