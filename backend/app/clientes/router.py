"""Módulo Clientes — responsável: Back-end 1."""
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.clientes import enderecos, servico
from app.clientes.schemas import (
    ClienteCreate,
    ClienteOut,
    ClientesPagina,
    ClienteUpdate,
    EnderecoCreate,
    EnderecoOut,
    StatusCliente,
    TelefoneNormalizado,
)
from app.core.auth import get_db

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.get("", response_model=ClientesPagina)
def listar_clientes(
    busca: str | None = Query(
        None,
        description="Nome, ou parte do telefone/CPF/CNPJ (só números e pontuação)",
    ),
    status: StatusCliente | None = None,
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(10, ge=1, le=100),
    db: Client = Depends(get_db),
):
    """Listagem da tela Clientes, em ordem alfabética.

    `ultima_compra` ignora vendas canceladas.
    """
    return servico.listar_clientes(db, busca, status, pagina, tamanho)


@router.get("/por-telefone/{telefone}", response_model=ClienteOut)
def buscar_por_telefone(telefone: TelefoneNormalizado, db: Client = Depends(get_db)):
    """Tela inicial do Atendimento. 404 se não existir (front abre cadastro).

    Aceita o número com ou sem máscara, +55 ou o 9 do celular (ver
    `normalizar_telefone`). 422 se não for um telefone válido com DDD.
    """
    return servico.buscar_por_telefone(db, telefone)


@router.get("/{cliente_id}", response_model=ClienteOut)
def obter_cliente(cliente_id: int, db: Client = Depends(get_db)):
    """Inclui endereços (o principal primeiro) e indicadores (total de pedidos,
    frequência, recompra)."""
    return servico.obter_cliente(db, cliente_id)


@router.post("", response_model=ClienteOut, status_code=201)
def criar_cliente(dados: ClienteCreate, db: Client = Depends(get_db)):
    """Telefone e CPF/CNPJ únicos (409 dizendo qual cliente já usa); guardados
    só com dígitos. Sem endereço marcado como principal, o primeiro vira principal."""
    return servico.criar_cliente(db, dados)


@router.put("/{cliente_id}", response_model=ClienteOut)
def atualizar_cliente(cliente_id: int, dados: ClienteUpdate, db: Client = Depends(get_db)):
    """Atualização parcial: só os campos enviados mudam."""
    return servico.atualizar_cliente(db, cliente_id, dados)


@router.post("/{cliente_id}/enderecos", response_model=EnderecoOut, status_code=201)
def adicionar_endereco(cliente_id: int, dados: EnderecoCreate, db: Client = Depends(get_db)):
    """Se principal=true, desmarca o principal anterior. O primeiro endereço do
    cliente é sempre o principal."""
    return enderecos.adicionar_endereco(db, cliente_id, dados)


@router.put("/{cliente_id}/enderecos/{endereco_id}", response_model=EnderecoOut)
def atualizar_endereco(
    cliente_id: int, endereco_id: int, dados: EnderecoCreate, db: Client = Depends(get_db)
):
    """`principal` omitido mantém o valor atual. Para trocar o principal, marque
    outro endereço com principal=true (desmarcar o atual direto dá 422)."""
    return enderecos.atualizar_endereco(db, cliente_id, endereco_id, dados)


@router.delete("/{cliente_id}/enderecos/{endereco_id}", status_code=204)
def remover_endereco(cliente_id: int, endereco_id: int, db: Client = Depends(get_db)):
    """409 se o endereço já foi usado em entregas (o histórico não pode perder o
    endereço). Se era o principal, o endereço mais recente que sobrou vira principal."""
    enderecos.remover_endereco(db, cliente_id, endereco_id)
