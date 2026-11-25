from dataclasses import dataclass, field
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from supabase import create_client

from app.core.auth import get_current_user, get_db
from app.main import app
from tests_api.auxiliares import CHAVE_SERVICE_ROLE_LOCAL, URL_DO_SUPABASE_LOCAL

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
    entregadores: list[int] = field(default_factory=list)
    vendas: list[int] = field(default_factory=list)


@pytest.fixture
def apagar_no_fim(db):
    registros = RegistrosParaApagar()
    yield registros
    if registros.vendas:
        db.table("vendas").delete().in_("id", registros.vendas).execute()
    if registros.entregadores:
        db.table("entregadores").delete().in_("id", registros.entregadores).execute()
