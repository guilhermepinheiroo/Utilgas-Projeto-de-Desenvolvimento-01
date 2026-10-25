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