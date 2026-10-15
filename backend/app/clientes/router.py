"""Módulo Clientes — responsável: Back-end 1."""
from fastapi import APIRouter, Query

from app.clientes.schemas import (
    ClienteCreate,
    ClienteOut,
    ClientesPagina,
    ClienteUpdate,
    EnderecoCreate,
    EnderecoOut,
)
from app.core.errors import nao_implementado

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.get("", response_model=ClientesPagina)
def listar_clientes(
    busca: str | None = Query(None, description="Nome, telefone ou CPF/CNPJ"),
    status: str | None = None,
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(10, ge=1, le=100),
):
    """Listagem da tela Clientes."""
    raise nao_implementado()


@router.get("/por-telefone/{telefone}", response_model=ClienteOut)
def buscar_por_telefone(telefone: str):
    """Tela inicial do Atendimento. 404 se não existir (front abre cadastro)."""
    raise nao_implementado()


@router.get("/{cliente_id}", response_model=ClienteOut)
def obter_cliente(cliente_id: int):
    """Inclui endereços e indicadores (total de pedidos, frequência, recompra)."""
    raise nao_implementado()


@router.post("", response_model=ClienteOut, status_code=201)
def criar_cliente(dados: ClienteCreate):
    """Telefone deve ser único; guardar somente dígitos."""
    raise nao_implementado()


@router.put("/{cliente_id}", response_model=ClienteOut)
def atualizar_cliente(cliente_id: int, dados: ClienteUpdate):
    raise nao_implementado()


@router.post("/{cliente_id}/enderecos", response_model=EnderecoOut, status_code=201)
def adicionar_endereco(cliente_id: int, dados: EnderecoCreate):
    """Se principal=true, desmarcar o principal anterior."""
    raise nao_implementado()


@router.put("/{cliente_id}/enderecos/{endereco_id}", response_model=EnderecoOut)
def atualizar_endereco(cliente_id: int, endereco_id: int, dados: EnderecoCreate):
    raise nao_implementado()


@router.delete("/{cliente_id}/enderecos/{endereco_id}", status_code=204)
def remover_endereco(cliente_id: int, endereco_id: int):
    raise nao_implementado()
