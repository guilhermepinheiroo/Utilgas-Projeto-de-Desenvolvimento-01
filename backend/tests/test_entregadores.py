from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user, get_db
from app.main import app

JOAO = {"id": 1, "nome": "João Costa", "telefone": "53988124477", "ativo": True}
LUCAS_INATIVO = {"id": 2, "nome": "Lucas Ribeiro", "telefone": None, "ativo": False}


class ConsultaGravada:
    def __init__(self, banco, tabela):
        self.banco, self.tabela, self.operacoes = banco, tabela, []

    def __getattr__(self, metodo):
        def registrar(*args, **kwargs):
            self.operacoes.append((metodo, args))
            return self

        return registrar

    def execute(self):
        self.banco.executadas.append((self.tabela, self.operacoes))
        resposta = self.banco.respostas.pop(0)
        return SimpleNamespace(data=resposta.get("data", []), count=resposta.get("count"))


class BancoFalso:
    def __init__(self, *respostas):
        self.respostas = list(respostas)
        self.executadas: list[tuple[str, list]] = []

    def table(self, nome):
        return ConsultaGravada(self, nome)

    def gravado(self, operacao: str) -> list:
        return [
            args[0]
            for _, operacoes in self.executadas
            for metodo, args in operacoes
            if metodo == operacao
        ]

    def tabelas_consultadas(self) -> list[str]:
        return [tabela for tabela, _ in self.executadas]


@pytest.fixture
def api():
    app.dependency_overrides[get_current_user] = lambda: {"id": "u1", "nome": "T", "papel": "admin"}
    yield TestClient(app)
    app.dependency_overrides.clear()


def usar(banco: BancoFalso) -> BancoFalso:
    app.dependency_overrides[get_db] = lambda: banco
    return banco


def test_cadastro_limpa_nome_e_grava_telefone_so_com_digitos(api):
    banco = usar(BancoFalso({"data": [JOAO]}))
    corpo = {"nome": "  João Costa ", "telefone": "(53) 98812-4477"}
    resposta = api.post("/entregadores", json=corpo)
    assert resposta.status_code == 201
    assert banco.gravado("insert") == [{"nome": "João Costa", "telefone": "53988124477"}]


def test_cadastro_sem_telefone_grava_nulo(api):
    banco = usar(BancoFalso({"data": [LUCAS_INATIVO]}))
    api.post("/entregadores", json={"nome": "Lucas Ribeiro", "telefone": "  "})
    assert banco.gravado("insert") == [{"nome": "Lucas Ribeiro", "telefone": None}]


@pytest.mark.parametrize(
    "corpo",
    [
        pytest.param({"nome": "   "}, id="nome-em-branco"),
        pytest.param({"nome": "João", "telefone": "98812-4477"}, id="telefone-sem-ddd"),
        pytest.param(
            {"nome": "João", "telefone": "53 98812-44770"}, id="telefone-com-digito-a-mais"
        ),
    ],
)
def test_cadastro_invalido_da_422_sem_gravar(api, corpo):
    banco = usar(BancoFalso())
    assert api.post("/entregadores", json=corpo).status_code == 422
    assert banco.executadas == []


def test_obter_entregador(api):
    usar(BancoFalso({"data": [JOAO]}))
    resposta = api.get("/entregadores/1")
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "João Costa"


def test_entregador_inexistente_da_404(api):
    usar(BancoFalso({"data": []}))
    assert api.get("/entregadores/99").status_code == 404


def test_editar_inexistente_da_404(api):
    usar(BancoFalso({"data": []}))
    assert api.patch("/entregadores/99", json={"nome": "X"}).status_code == 404


def test_editar_nome_e_telefone(api):
    editado = JOAO | {"nome": "João C.", "telefone": "5332221234"}
    banco = usar(BancoFalso({"data": [JOAO]}, {"data": [editado]}))
    corpo = {"nome": " João C. ", "telefone": "(53) 3222-1234"}
    resposta = api.patch("/entregadores/1", json=corpo)
    assert resposta.status_code == 200
    assert banco.gravado("update") == [{"nome": "João C.", "telefone": "5332221234"}]


def test_telefone_nulo_apaga_o_telefone(api):
    banco = usar(BancoFalso({"data": [JOAO]}, {"data": [JOAO | {"telefone": None}]}))
    api.patch("/entregadores/1", json={"telefone": None})
    assert banco.gravado("update") == [{"telefone": None}]


@pytest.mark.parametrize(
    "corpo",
    [
        pytest.param({}, id="sem-campos"),
        pytest.param({"ativo": None}, id="ativo-nulo"),
        pytest.param({"nome": ""}, id="nome-vazio"),
        pytest.param({"telefone": "123"}, id="telefone-invalido"),
    ],
)
def test_edicao_invalida_da_422_sem_gravar(api, corpo):
    banco = usar(BancoFalso())
    assert api.patch("/entregadores/1", json=corpo).status_code == 422
    assert banco.executadas == []


def test_desativar_sem_entregas_pendentes(api):
    banco = usar(
        BancoFalso({"data": [JOAO]}, {"data": [], "count": 0}, {"data": [JOAO | {"ativo": False}]})
    )
    resposta = api.patch("/entregadores/1", json={"ativo": False})
    assert resposta.status_code == 200
    assert resposta.json()["ativo"] is False
    assert banco.gravado("update") == [{"ativo": False}]
    assert banco.gravado("delete") == []


def test_desativar_com_entrega_pendente_da_409_sem_alterar(api):
    banco = usar(BancoFalso({"data": [JOAO]}, {"data": [{"id": 7}], "count": 2}))
    resposta = api.patch("/entregadores/1", json={"ativo": False})
    assert resposta.status_code == 409
    assert "2 entrega(s) pendente(s)" in resposta.json()["detail"]
    assert banco.gravado("update") == []


def test_reativar_nao_precisa_olhar_as_entregas(api):
    banco = usar(BancoFalso({"data": [LUCAS_INATIVO]}, {"data": [LUCAS_INATIVO | {"ativo": True}]}))
    assert api.patch("/entregadores/2", json={"ativo": True}).status_code == 200
    assert "entregas" not in banco.tabelas_consultadas()


def test_desativar_quem_ja_esta_inativo_nao_olha_as_entregas(api):
    banco = usar(BancoFalso({"data": [LUCAS_INATIVO]}, {"data": [LUCAS_INATIVO]}))
    assert api.patch("/entregadores/2", json={"ativo": False}).status_code == 200
    assert "entregas" not in banco.tabelas_consultadas()


def test_listagem_continua_filtrando_por_ativo(api):
    banco = usar(BancoFalso({"data": [LUCAS_INATIVO]}))
    resposta = api.get("/entregadores", params={"ativo": "false"})
    assert resposta.status_code == 200
    filtros = [
        args for _, operacoes in banco.executadas for metodo, args in operacoes if metodo == "eq"
    ]
    assert ("ativo", False) in filtros
