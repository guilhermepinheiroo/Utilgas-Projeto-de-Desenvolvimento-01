"""Módulo Produtos e Estoque — responsável: Back-end 2."""
from fastapi import APIRouter

from app.core.errors import nao_implementado
from app.produtos.schemas import (
    AlertaEstoque,
    Categoria,
    MovimentacaoCreate,
    MovimentacaoOut,
    ProdutoCreate,
    ProdutoOut,
    ProdutoUpdate,
    ResumoEstoque,
)

router = APIRouter(prefix="/produtos", tags=["Produtos"])
estoque_router = APIRouter(prefix="/estoque", tags=["Estoque"])


@router.get("", response_model=list[ProdutoOut])
def listar_produtos(
    categoria: Categoria | None = None,
    ativo: bool | None = True,
    busca: str | None = None,
):
    """Usado no Atendimento (etapa Itens), na Portaria e no Controle de Estoque."""
    raise nao_implementado()


@router.post("", response_model=ProdutoOut, status_code=201)
def criar_produto(dados: ProdutoCreate):
    """Se estoque_inicial > 0, gravar uma movimentação de entrada (origem=ajuste)."""
    raise nao_implementado()


@router.put("/{produto_id}", response_model=ProdutoOut)
def atualizar_produto(produto_id: int, dados: ProdutoUpdate):
    raise nao_implementado()


@estoque_router.get("/resumo", response_model=ResumoEstoque)
def resumo_estoque():
    raise nao_implementado()


@estoque_router.get("/alertas", response_model=list[AlertaEstoque])
def alertas_estoque():
    """Produtos com estoque_atual <= estoque_minimo."""
    raise nao_implementado()


@estoque_router.get("/movimentacoes", response_model=list[MovimentacaoOut])
def listar_movimentacoes(produto_id: int | None = None, limite: int = 50):
    raise nao_implementado()


@estoque_router.post("/movimentacoes", response_model=MovimentacaoOut, status_code=201)
def registrar_movimentacao(dados: MovimentacaoCreate):
    """Registrar entrada/saída manual. Saída não pode deixar o estoque negativo (409)."""
    raise nao_implementado()
