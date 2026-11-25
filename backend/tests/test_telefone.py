import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user, get_db
from app.core.telefone import telefone_nacional
from app.main import app
from tests.test_clientes_vendas import FakeDB, cliente_row


@pytest.mark.parametrize(
    "digitado, esperado",
    [
        pytest.param("+55 53 98812-4477", "53988124477", id="celular-copiado-do-whatsapp"),
        pytest.param("5553988124477", "53988124477", id="celular-com-55-sem-mais"),
        pytest.param("+55 53 3222-1234", "5332221234", id="fixo-com-55"),
        pytest.param("(53) 98812-4477", "53988124477", id="celular-formatado"),
        pytest.param("(55) 99123-4567", "55991234567", id="ddd-55-de-santa-maria"),
        pytest.param("5332221234", "5332221234", id="fixo-sem-55"),
        pytest.param("", "", id="vazio"),
        pytest.param(None, "", id="nulo"),
    ],
)
def test_telefone_nacional(digitado, esperado):
    assert telefone_nacional(digitado) == esperado


@pytest.fixture
def api():
    app.dependency_overrides[get_current_user] = lambda: {"id": "u1", "nome": "T", "papel": "admin"}
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_cadastro_aceita_numero_copiado_do_whatsapp(api):
    app.dependency_overrides[get_db] = lambda: FakeDB([cliente_row()], [cliente_row()], [])
    resposta = api.post("/clientes", json={"nome": "Maria Souza", "telefone": "+55 53 98812-4477"})
    assert resposta.status_code == 201, resposta.text


def test_cadastro_continua_recusando_numero_incompleto(api):
    app.dependency_overrides[get_db] = lambda: FakeDB()
    resposta = api.post("/clientes", json={"nome": "Maria Souza", "telefone": "+55 53 98812"})
    assert resposta.status_code == 422
