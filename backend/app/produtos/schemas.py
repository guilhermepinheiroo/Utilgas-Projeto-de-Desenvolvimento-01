from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Categoria = Literal["gas", "agua", "acessorio"]


class ProdutoBase(BaseModel):
    nome: str
    categoria: Categoria
    preco: float = Field(ge=0)
    estoque_minimo: int = Field(0, ge=0)


class ProdutoCreate(ProdutoBase):
    estoque_inicial: int = Field(0, ge=0)


class ProdutoUpdate(BaseModel):
    nome: str | None = None
    categoria: Categoria | None = None
    preco: float | None = Field(None, ge=0)
    estoque_minimo: int | None = Field(None, ge=0)
    ativo: bool | None = None


class ProdutoOut(ProdutoBase):
    id: int
    estoque_atual: int
    ativo: bool
    status_estoque: Literal["normal", "baixo", "critico"] = "normal"


class MovimentacaoCreate(BaseModel):
    produto_id: int
    tipo: Literal["entrada", "saida"]
    quantidade: int = Field(gt=0)
    origem: Literal["compra", "troca_vazio", "ajuste"] = "ajuste"
    observacao: str | None = None


class MovimentacaoOut(BaseModel):
    id: int
    produto_id: int
    produto_nome: str
    tipo: Literal["entrada", "saida"]
    quantidade: int
    origem: str
    venda_id: int | None = None
    observacao: str | None = None
    criado_em: datetime


class AlertaEstoque(BaseModel):
    produto_id: int
    produto_nome: str
    estoque_atual: int
    estoque_minimo: int
    nivel: Literal["baixo", "critico"]


class ResumoEstoque(BaseModel):
    """Cards do topo da tela Controle de Estoque."""

    total_em_estoque: int
    entradas_hoje: int
    saidas_mes: int
    itens_com_baixo_estoque: int
