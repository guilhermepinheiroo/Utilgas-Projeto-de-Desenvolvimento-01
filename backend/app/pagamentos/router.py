from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.core.auth import get_db
from app.pagamentos import opcoes_de_cartao
from app.pagamentos.opcoes_de_cartao import BANDEIRA, MAQUININHA
from app.pagamentos.schemas import OpcaoDeCartaoCreate, OpcaoDeCartaoOut, OpcaoDeCartaoUpdate

maquininhas_router = APIRouter(prefix="/maquininhas", tags=["Pagamento com cartão"])
bandeiras_router = APIRouter(prefix="/bandeiras", tags=["Pagamento com cartão"])

FILTRO_ATIVO = Query(True, description="true = só as ativas (padrão); false = só as inativas")


@maquininhas_router.get("", response_model=list[OpcaoDeCartaoOut])
def listar_maquininhas(ativo: bool = FILTRO_ATIVO, db: Client = Depends(get_db)):
    """Maquininhas de cartão, em ordem alfabética."""
    return opcoes_de_cartao.listar(db, MAQUININHA, ativo)


@maquininhas_router.get("/{maquininha_id}", response_model=OpcaoDeCartaoOut)
def obter_maquininha(maquininha_id: int, db: Client = Depends(get_db)):
    return opcoes_de_cartao.buscar(db, MAQUININHA, maquininha_id)


@maquininhas_router.post("", response_model=OpcaoDeCartaoOut, status_code=201)
def cadastrar_maquininha(dados: OpcaoDeCartaoCreate, db: Client = Depends(get_db)):
    """409 se já existir uma maquininha com o mesmo nome (sem diferenciar maiúsculas)."""
    return opcoes_de_cartao.cadastrar(db, MAQUININHA, dados.nome)


@maquininhas_router.patch("/{maquininha_id}", response_model=OpcaoDeCartaoOut)
def atualizar_maquininha(
    maquininha_id: int, dados: OpcaoDeCartaoUpdate, db: Client = Depends(get_db)
):
    """Renomeia, desativa (`ativo=false`) ou reativa (`ativo=true`).

    Maquininha inativa não aparece na venda, mas continua nas vendas antigas.
    """
    campos = dados.model_dump(exclude_unset=True)
    return opcoes_de_cartao.atualizar(db, MAQUININHA, maquininha_id, campos)


@bandeiras_router.get("", response_model=list[OpcaoDeCartaoOut])
def listar_bandeiras(ativo: bool = FILTRO_ATIVO, db: Client = Depends(get_db)):
    """Bandeiras de cartão aceitas, em ordem alfabética."""
    return opcoes_de_cartao.listar(db, BANDEIRA, ativo)


@bandeiras_router.get("/{bandeira_id}", response_model=OpcaoDeCartaoOut)
def obter_bandeira(bandeira_id: int, db: Client = Depends(get_db)):
    return opcoes_de_cartao.buscar(db, BANDEIRA, bandeira_id)


@bandeiras_router.post("", response_model=OpcaoDeCartaoOut, status_code=201)
def cadastrar_bandeira(dados: OpcaoDeCartaoCreate, db: Client = Depends(get_db)):
    """409 se já existir uma bandeira com o mesmo nome (sem diferenciar maiúsculas)."""
    return opcoes_de_cartao.cadastrar(db, BANDEIRA, dados.nome)


@bandeiras_router.patch("/{bandeira_id}", response_model=OpcaoDeCartaoOut)
def atualizar_bandeira(bandeira_id: int, dados: OpcaoDeCartaoUpdate, db: Client = Depends(get_db)):
    """Renomeia, desativa (`ativo=false`) ou reativa (`ativo=true`).

    Bandeira inativa não aparece na venda, mas continua nas vendas antigas.
    """
    campos = dados.model_dump(exclude_unset=True)
    return opcoes_de_cartao.atualizar(db, BANDEIRA, bandeira_id, campos)
