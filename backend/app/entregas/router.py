"""Módulo Entregas, Entregadores e Regiões — responsável: Back-end 2."""
from fastapi import APIRouter

from app.core.errors import nao_implementado
from app.entregas.schemas import (
    EntregadorCreate,
    EntregadorOut,
    EntregaOut,
    EntregaUpdate,
    RegiaoOut,
    ResumoEntregas,
    StatusEntrega,
)

router = APIRouter(prefix="/entregas", tags=["Entregas"])
entregadores_router = APIRouter(prefix="/entregadores", tags=["Entregadores"])
regioes_router = APIRouter(prefix="/regioes", tags=["Regiões"])


@router.get("", response_model=list[EntregaOut])
def listar_entregas(
    status: StatusEntrega | None = None,
    entregador_id: int | None = None,
    busca: str | None = None,
):
    """Filtros da tela: busca (cliente, endereço, pedido), entregador e status."""
    raise nao_implementado()


@router.get("/resumo", response_model=ResumoEntregas)
def resumo_entregas():
    raise nao_implementado()


@router.patch("/{entrega_id}", response_model=EntregaOut)
def atualizar_entrega(entrega_id: int, dados: EntregaUpdate):
    """Atribuir entregador, marcar como entregue ou cancelar.

    - status=cancelada: chame a função SQL `cancelar_venda(venda_id)` via chamar_rpc.
      Ela devolve os cheios, retira os vazios, cancela venda e entrega
      (409 se já cancelada ou já entregue).
    - status=entregue: atualizar status e entregue_em.
    - entregador_id: atualizar a entrega.
    """
    raise nao_implementado()


@entregadores_router.get("", response_model=list[EntregadorOut])
def listar_entregadores(ativo: bool | None = True):
    raise nao_implementado()


@entregadores_router.post("", response_model=EntregadorOut, status_code=201)
def criar_entregador(dados: EntregadorCreate):
    raise nao_implementado()


@regioes_router.get("", response_model=list[RegiaoOut])
def listar_regioes():
    """Região define a taxa de entrega cobrada na venda."""
    raise nao_implementado()
