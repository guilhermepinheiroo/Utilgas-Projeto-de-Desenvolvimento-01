from dataclasses import dataclass, field
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from supabase import create_client

from app.core.auth import get_current_user, get_db
from app.main import app
from tests_api.auxiliares import CHAVE_SERVICE_ROLE_LOCAL, URL_DO_SUPABASE_LOCAL, nome_unico

USUARIO_LOGADO_DE_TESTE = {"id": None, "nome": "Teste", "papel": "admin", "ativo": True}


@pytest.fixture(scope="session")
def db():
    if urlparse(URL_DO_SUPABASE_LOCAL).hostname not in ("127.0.0.1", "localhost"):
        pytest.exit(f"TEST_SUPABASE_URL precisa ser local, não {URL_DO_SUPABASE_LOCAL}", 2)
    return create_client(URL_DO_SUPABASE_LOCAL, CHAVE_SERVICE_ROLE_LOCAL)


@pytest.fixture
def api(db):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USUARIO_LOGADO_DE_TESTE
    yield TestClient(app)
    app.dependency_overrides.clear()


@dataclass
class RegistrosParaApagar:
    clientes: list[int] = field(default_factory=list)
    vendas: list[int] = field(default_factory=list)


@pytest.fixture
def apagar_no_fim(db):
    registros = RegistrosParaApagar()
    yield registros
    _apagar_vendas(db, registros)
    if registros.clientes:
        db.table("clientes").delete().in_("id", registros.clientes).execute()


def _apagar_vendas(db, registros: RegistrosParaApagar) -> None:
    vendas = set(registros.vendas)
    if registros.clientes:
        dos_clientes = db.table("vendas").select("id").in_("cliente_id", registros.clientes)
        vendas |= {v["id"] for v in dos_clientes.execute().data}
    if vendas:
        db.table("movimentacoes_estoque").delete().in_("venda_id", list(vendas)).execute()
        db.table("vendas").delete().in_("id", list(vendas)).execute()


@pytest.fixture(scope="session")
def regiao(db):
    linha = db.table("regioes").insert({"nome": nome_unico("Reg"), "taxa_entrega": 7.5}).execute()
    yield linha.data[0]
    db.table("regioes").delete().eq("id", linha.data[0]["id"]).execute()


@pytest.fixture(scope="session")
def produtos(db):
    p13, kit = (
        db.table("produtos")
        .insert(
            [
                {
                    "nome": nome_unico("P13"),
                    "categoria": "gas",
                    "preco": 115,
                    "estoque_atual": 500,
                    "controla_vazio": True,
                },
                {
                    "nome": nome_unico("Kit"),
                    "categoria": "acessorio",
                    "preco": 40,
                    "estoque_atual": 500,
                    "controla_vazio": False,
                },
            ]
        )
        .execute()
        .data
    )
    yield {"p13": p13, "kit": kit}
    ids = [p13["id"], kit["id"]]
    db.table("movimentacoes_estoque").delete().in_("produto_id", ids).execute()
    db.table("produtos").delete().in_("id", ids).execute()
