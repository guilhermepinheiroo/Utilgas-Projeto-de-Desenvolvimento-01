import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.core.auth import get_current_user, get_db
from app.main import app
from tests.banco_falso import BancoFalso

STONE = {"id": 1, "nome": "Stone", "ativo": True, "criado_em": "2026-11-25T12:00:00+00:00"}
CIELO_INATIVA = {"id": 2, "nome": "Cielo", "ativo": False, "criado_em": "2026-11-25T12:00:00+00:00"}

RECURSOS = [
    pytest.param("/maquininhas", "maquininhas", "maquininha", id="maquininhas"),
    pytest.param("/bandeiras", "bandeiras", "bandeira", id="bandeiras"),
]


def erro_do_banco(codigo: str, mensagem: str = "erro") -> APIError:
    return APIError({"message": mensagem, "code": codigo, "hint": None, "details": None})


@pytest.fixture
def api():
    app.dependency_overrides[get_current_user] = lambda: {"id": "u1", "nome": "T", "papel": "admin"}
    yield TestClient(app)
    app.dependency_overrides.clear()


def usar(banco: BancoFalso) -> BancoFalso:
    app.dependency_overrides[get_db] = lambda: banco
    return banco


@pytest.mark.parametrize("rota, tabela, _", RECURSOS)
@pytest.mark.parametrize("ativo", [True, False])
def test_lista_filtra_pela_situacao(api, rota, tabela, _, ativo):
    banco = usar(BancoFalso({"data": [STONE]}))
    resposta = api.get(rota, params={"ativo": ativo})
    assert resposta.status_code == 200
    assert resposta.json()[0]["nome"] == "Stone"
    assert banco.filtros(tabela) == [("ativo", ativo)]


@pytest.mark.parametrize("rota, tabela, _", RECURSOS)
def test_lista_mostra_so_as_ativas_por_padrao(api, rota, tabela, _):
    banco = usar(BancoFalso({"data": []}))
    api.get(rota)
    assert banco.filtros(tabela) == [("ativo", True)]


@pytest.mark.parametrize("rota, _, nome", RECURSOS)
def test_consulta_inexistente_da_404(api, rota, _, nome):
    usar(BancoFalso({"data": []}))
    resposta = api.get(f"{rota}/99")
    assert resposta.status_code == 404
    assert resposta.json()["detail"] == f"{nome.capitalize()} não encontrada"


@pytest.mark.parametrize("rota, _, __", RECURSOS)
def test_cadastro_limpa_espacos_do_nome(api, rota, _, __):
    banco = usar(BancoFalso({"data": [CIELO_INATIVA]}, {"data": [STONE]}))
    resposta = api.post(rota, json={"nome": "  Stone   Pagamentos "})
    assert resposta.status_code == 201
    assert banco.gravado("insert") == [{"nome": "Stone Pagamentos"}]


@pytest.mark.parametrize("rota, _, __", RECURSOS)
def test_cadastro_com_nome_em_branco_da_422(api, rota, _, __):
    banco = usar(BancoFalso())
    resposta = api.post(rota, json={"nome": "   "})
    assert resposta.status_code == 422
    assert banco.gravado("insert") == []


@pytest.mark.parametrize("rota, _, nome", RECURSOS)
def test_cadastro_repetido_da_409_sem_diferenciar_maiusculas(api, rota, _, nome):
    banco = usar(BancoFalso({"data": [STONE]}))
    resposta = api.post(rota, json={"nome": "  STONE "})
    assert resposta.status_code == 409
    assert resposta.json()["detail"] == f"Já existe uma {nome} chamada Stone"
    assert banco.gravado("insert") == []


@pytest.mark.parametrize("rota, _, __", RECURSOS)
def test_cadastro_repetido_de_uma_inativa_sugere_reativar(api, rota, _, __):
    usar(BancoFalso({"data": [CIELO_INATIVA]}))
    resposta = api.post(rota, json={"nome": "cielo"})
    assert resposta.status_code == 409
    assert "reative" in resposta.json()["detail"]


@pytest.mark.parametrize("rota, _, nome", RECURSOS)
def test_cadastro_simultaneo_barrado_pelo_banco_da_409(api, rota, _, nome):
    usar(BancoFalso({"data": []}, erro_do_banco("23505")))
    resposta = api.post(rota, json={"nome": "Stone"})
    assert resposta.status_code == 409
    assert resposta.json()["detail"] == f"Já existe uma {nome} chamada Stone"


@pytest.mark.parametrize("rota, _, __", RECURSOS)
@pytest.mark.parametrize(
    "corpo",
    [
        pytest.param({}, id="sem-campos"),
        pytest.param({"ativo": None}, id="ativo-nulo"),
        pytest.param({"nome": "  "}, id="nome-em-branco"),
        pytest.param({"nome": None}, id="nome-nulo"),
    ],
)
def test_edicao_invalida_da_422_sem_gravar(api, rota, _, __, corpo):
    banco = usar(BancoFalso())
    resposta = api.patch(f"{rota}/1", json=corpo)
    assert resposta.status_code == 422
    assert banco.gravado("update") == []


@pytest.mark.parametrize("rota, _, __", RECURSOS)
def test_edicao_de_inexistente_da_404(api, rota, _, __):
    banco = usar(BancoFalso({"data": []}))
    assert api.patch(f"{rota}/99", json={"ativo": False}).status_code == 404
    assert banco.gravado("update") == []


@pytest.mark.parametrize("rota, _, __", RECURSOS)
@pytest.mark.parametrize("ativo", [False, True])
def test_desativar_e_reativar_so_muda_a_situacao(api, rota, _, __, ativo):
    banco = usar(BancoFalso({"data": [STONE]}, {"data": [STONE | {"ativo": ativo}]}))
    resposta = api.patch(f"{rota}/1", json={"ativo": ativo})
    assert resposta.status_code == 200
    assert resposta.json()["ativo"] is ativo
    assert banco.gravado("update") == [{"ativo": ativo}]


@pytest.mark.parametrize("rota, _, __", RECURSOS)
def test_renomear_para_nome_de_outra_da_409(api, rota, _, __):
    banco = usar(BancoFalso({"data": [STONE]}, {"data": [STONE, CIELO_INATIVA]}))
    resposta = api.patch(f"{rota}/1", json={"nome": "CIELO"})
    assert resposta.status_code == 409
    assert banco.gravado("update") == []


@pytest.mark.parametrize("rota, _, __", RECURSOS)
def test_renomear_mudando_so_maiusculas_da_propria_e_permitido(api, rota, _, __):
    banco = usar(
        BancoFalso({"data": [STONE]}, {"data": [STONE]}, {"data": [STONE | {"nome": "STONE"}]})
    )
    resposta = api.patch(f"{rota}/1", json={"nome": "STONE"})
    assert resposta.status_code == 200
    assert banco.gravado("update") == [{"nome": "STONE"}]


def venda_no_cartao(**extra) -> dict:
    return {
        "id": 10,
        "criado_em": "2026-11-25T15:00:00+00:00",
        "origem": "portaria",
        "cliente_id": None,
        "forma_pagamento": "cartao_credito",
        "maquininha_id": 1,
        "bandeira_id": 3,
        "subtotal": "115.00",
        "desconto": "0.00",
        "taxa_entrega": "0.00",
        "total": "115.00",
        "status": "concluida",
        "clientes": None,
        "maquininhas": {"nome": "Stone"},
        "bandeiras": {"nome": "Elo"},
        "itens_venda": [],
        "entregas": None,
    } | extra


def test_venda_no_cartao_envia_maquininha_e_bandeira_para_a_funcao_sql(api):
    banco = usar(
        BancoFalso({"data": {"venda": {"id": 10}, "entrega": None}}, {"data": [venda_no_cartao()]})
    )
    corpo = {
        "origem": "portaria",
        "forma_pagamento": "cartao_credito",
        "maquininha_id": 1,
        "bandeira_id": 3,
        "itens": [{"produto_id": 1, "quantidade": 1}],
    }
    resposta = api.post("/vendas", json=corpo)
    assert resposta.status_code == 201, resposta.text
    dados = banco.gravado("rpc")[0]["p_dados"]
    assert (dados["maquininha_id"], dados["bandeira_id"]) == (1, 3)
    venda = resposta.json()
    assert (venda["maquininha_nome"], venda["bandeira_nome"]) == ("Stone", "Elo")


def test_recusa_da_funcao_sql_vira_422(api):
    recusa = erro_do_banco("UG422", "pagamento com cartao exige maquininha e bandeira")
    usar(BancoFalso(recusa))
    corpo = {
        "origem": "portaria",
        "forma_pagamento": "cartao_debito",
        "itens": [{"produto_id": 1, "quantidade": 1}],
    }
    resposta = api.post("/vendas", json=corpo)
    assert resposta.status_code == 422
    assert resposta.json()["detail"] == "pagamento com cartao exige maquininha e bandeira"


def test_venda_sem_cartao_sai_com_maquininha_e_bandeira_nulas(api):
    pix = venda_no_cartao(
        forma_pagamento="pix",
        maquininha_id=None,
        bandeira_id=None,
        maquininhas=None,
        bandeiras=None,
    )
    usar(BancoFalso({"data": [pix]}))
    venda = api.get("/vendas/10").json()
    assert venda["maquininha_id"] is None
    assert venda["bandeira_nome"] is None


def test_historico_filtra_por_maquininha_e_bandeira(api):
    banco = usar(BancoFalso({"data": [venda_no_cartao()]}))
    resposta = api.get("/vendas", params={"maquininha_id": 1, "bandeira_id": 3})
    assert resposta.status_code == 200
    assert resposta.json()["total"] == 1
    assert ("maquininha_id", 1) in banco.filtros("vendas")
    assert ("bandeira_id", 3) in banco.filtros("vendas")
