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
    # None = padrão pela categoria (gás controla vasilhame vazio; água/acessório não)
    controla_vazio: bool | None = None


class ProdutoUpdate(BaseModel):
    nome: str | None = None
    categoria: Categoria | None = None
    preco: float | None = Field(None, ge=0)
    estoque_minimo: int | None = Field(None, ge=0)
    ativo: bool | None = None
    controla_vazio: bool | None = None


class ProdutoOut(ProdutoBase):
    id: int
    estoque_atual: int  # botijões CHEIOS (unidades à venda)
    estoque_vazio: int = 0  # vasilhames VAZIOS (só se controla_vazio)
    controla_vazio: bool = False
    ativo: bool
    status_estoque: Literal["normal", "baixo", "critico"] = "normal"


class MovimentacaoCreate(BaseModel):
    produto_id: int
    tipo: Literal["entrada", "saida"]
    quantidade: int = Field(gt=0)
    origem: Literal["compra", "troca_vazio", "ajuste"] = "ajuste"
    estoque: Literal["cheio", "vazio"] = "cheio"
    observacao: str | None = None


class MovimentacaoOut(BaseModel):
    id: int
    produto_id: int
    produto_nome: str
    produto_categoria: str | None = None
    tipo: Literal["entrada", "saida"]
    tipo_estoque: Literal["cheio", "vazio"] = "cheio"
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
    total_vazios: int = 0
    entradas_hoje: int
    entradas_mes: int = 0
    saidas_mes: int
    itens_com_baixo_estoque: int
