"""Testes dos módulos Produtos/Estoque, Entregas e Dashboard (sem Supabase real).

FakeDB devolve respostas na ordem em que o código chama .execute(). Qualquer
encadeamento (.select().eq()...) é aceito. Se a rota mudar a ordem das consultas,
ajuste o roteiro do teste.
"""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user, get_db
from app.main import app
from app.produtos.service import nivel_estoque


class FakeQuery:
    def __init__(self, db, roteiro):
        self._db, self._roteiro = db, roteiro

    def __getattr__(self, nome):
        return lambda *a, **k: self

    def execute(self):
        return SimpleNamespace(data=self._roteiro.pop(0), count=None)


class FakeDB:
    def __init__(self, *respostas):
        self.roteiro = list(respostas)
        self.rpcs: list[tuple[str, dict]] = []

    def table(self, _nome):
        return FakeQuery(self, self.roteiro)

    def rpc(self, nome, params):
        self.rpcs.append((nome, params))
        return FakeQuery(self, self.roteiro)


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "00000000-0000-0000-0000-000000000001",
        "nome": "Teste",
        "papel": "admin",
    }
    yield TestClient(app)
    app.dependency_overrides.clear()


def usar_db(db: FakeDB):
    app.dependency_overrides[get_db] = lambda: db
    return db


def entrega_row(status="pendente", entregador_id=None):
    return {
        "id": 1,
        "venda_id": 10,
        "status": status,
        "entregador_id": entregador_id,
        "observacao": None,
        "criado_em": "2026-10-16T12:00:00+00:00",
        "entregue_em": None,
        "entregadores": {"nome": "João Costa"} if entregador_id else None,
        "enderecos": {"endereco": "R. Santos Dumont, 412", "complemento": "casa"},
        "vendas": {
            "total": 123.0,
            "clientes": {"nome": "Maria Souza", "telefone": "53988124477"},
            "itens_venda": [{"quantidade": 1, "produtos": {"nome": "Botijão P13 - Recarga"}}],
        },
    }


# ------------------------------------------------------------------ estoque


@pytest.mark.parametrize(
    "atual,minimo,esperado",
    [
        (40, 10, "normal"),
        (11, 10, "normal"),
        (10, 10, "baixo"),
        (6, 10, "baixo"),
        (5, 10, "critico"),
        (0, 10, "critico"),
        (0, 0, "critico"),
    ],
)
def test_nivel_estoque(atual, minimo, esperado):
    assert nivel_estoque(atual, minimo) == esperado


def test_alertas_so_produtos_no_minimo_ou_abaixo(client):
    usar_db(
        FakeDB(
            [
                {"id": 1, "nome": "P13", "estoque_atual": 40, "estoque_minimo": 10},
                {"id": 2, "nome": "P45", "estoque_atual": 4, "estoque_minimo": 4},
                {"id": 3, "nome": "Água", "estoque_atual": 0, "estoque_minimo": 15},
            ]
        )
    )
    r = client.get("/estoque/alertas")
    assert r.status_code == 200
    assert [a["produto_id"] for a in r.json()] == [3, 2]  # crítico primeiro
    assert r.json()[0]["nivel"] == "critico"


def test_movimentacao_chama_funcao_sql_com_usuario(client):
    db = usar_db(
        FakeDB(
            {"produto_id": 1, "estoque_atual": 50, "estoque_vazio": 15},  # rpc
            [
                {
                    "id": 7,
                    "produto_id": 1,
                    "tipo": "entrada",
                    "tipo_estoque": "cheio",
                    "quantidade": 10,
                    "origem": "compra",
                    "venda_id": None,
                    "observacao": None,
                    "criado_em": "2026-10-16T12:00:00+00:00",
                    "produtos": {"nome": "P13"},
                }
            ],
        )
    )
    r = client.post(
        "/estoque/movimentacoes",
        json={"produto_id": 1, "tipo": "entrada", "quantidade": 10, "origem": "compra"},
    )
    assert r.status_code == 201
    assert r.json()["produto_nome"] == "P13"
    nome, params = db.rpcs[0]
    assert nome == "movimentar_estoque"
    assert params["p_quantidade"] == 10 and params["p_usuario_id"].endswith("1")


def test_movimentacao_quantidade_zero_e_rejeitada(client):
    usar_db(FakeDB())
    corpo = {"produto_id": 1, "tipo": "saida", "quantidade": 0}
    r = client.post("/estoque/movimentacoes", json=corpo)
    assert r.status_code == 422


# ------------------------------------------------------------------ entregas


def test_entregue_exige_entregador(client):
    usar_db(FakeDB([entrega_row()]))
    r = client.patch("/entregas/1", json={"status": "entregue"})
    assert r.status_code == 422


def test_entrega_finalizada_nao_muda(client):
    usar_db(FakeDB([entrega_row(status="entregue", entregador_id=1)]))
    r = client.patch("/entregas/1", json={"entregador_id": 2})
    assert r.status_code == 409


def test_entregador_inexistente_da_404(client):
    usar_db(FakeDB([entrega_row()], []))  # entrega, entregador (vazio)
    r = client.patch("/entregas/1", json={"entregador_id": 99})
    assert r.status_code == 404


def test_cancelar_entrega_chama_cancelar_venda(client):
    db = usar_db(
        FakeDB(
            [entrega_row()],  # busca a entrega
            {"venda_id": 10, "status": "cancelada"},  # rpc cancelar_venda
            [entrega_row(status="cancelada")],  # busca final
        )
    )
    r = client.patch("/entregas/1", json={"status": "cancelada"})
    assert r.status_code == 200
    assert r.json()["status"] == "cancelada"
    assert db.rpcs[0][0] == "cancelar_venda"
    assert db.rpcs[0][1]["p_venda_id"] == 10


def test_atribuir_e_entregar(client):
    usar_db(
        FakeDB(
            [entrega_row()],  # busca
            [{"id": 1, "ativo": True}],  # valida entregador
            [{"id": 1}],  # update ok
            [entrega_row(status="entregue", entregador_id=1)],  # busca final
        )
    )
    r = client.patch("/entregas/1", json={"entregador_id": 1, "status": "entregue"})
    assert r.status_code == 200
    assert r.json()["entregador_nome"] == "João Costa"
    assert r.json()["itens"][0]["quantidade"] == 1


def test_update_perdeu_corrida_da_409(client):
    usar_db(FakeDB([entrega_row()], [{"id": 1, "ativo": True}], []))  # update sem linhas
    r = client.patch("/entregas/1", json={"entregador_id": 1})
    assert r.status_code == 409


def test_busca_por_numero_do_pedido(client):
    usar_db(FakeDB([entrega_row()]))
    assert len(client.get("/entregas", params={"busca": "#10"}).json()) == 1
    usar_db(FakeDB([entrega_row()]))
    assert client.get("/entregas", params={"busca": "zzz"}).json() == []


# ----------------------------------------------------------------- dashboard


def test_dashboard_periodo_invertido(client):
    usar_db(FakeDB())
    r = client.get("/dashboard/faturamento", params={"inicio": "2026-10-10", "fim": "2026-10-01"})
    assert r.status_code == 422


def test_dashboard_estoque_valor_total(client):
    usar_db(
        FakeDB(
            [
                {"preco": "115.00", "estoque_atual": 40, "estoque_vazio": 15, "estoque_minimo": 10},
                {"preco": "18.00", "estoque_atual": 10, "estoque_vazio": 0, "estoque_minimo": 15},
            ]
        )
    )
    r = client.get("/dashboard/estoque")
    assert r.json()["valor_em_estoque"] == 40 * 115 + 10 * 18
    assert r.json()["produtos_em_alerta"] == 1