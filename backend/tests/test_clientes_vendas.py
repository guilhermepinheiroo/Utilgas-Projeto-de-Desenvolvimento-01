"""Testes de Clientes, Vendas e Auth (FakeDB, igual a test_operacao.py)."""
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user, get_db
from app.main import app


class FakeQuery:
    def __init__(self, roteiro):
        self._roteiro = roteiro

    def __getattr__(self, nome):
        return lambda *a, **k: self

    def execute(self):
        resp = self._roteiro.pop(0)
        if isinstance(resp, dict) and "data" in resp and "count" in resp:
            return SimpleNamespace(data=resp["data"], count=resp["count"])
        return SimpleNamespace(data=resp, count=None)


class FakeDB:
    def __init__(self, *respostas):
        self.roteiro = list(respostas)
        self.rpcs: list[tuple[str, dict]] = []
        self.tabelas: list[str] = []

    def table(self, nome):
        self.tabelas.append(nome)
        return FakeQuery(self.roteiro)

    def rpc(self, nome, params):
        self.rpcs.append((nome, params))
        return FakeQuery(self.roteiro)


USUARIO = {"id": "00000000-0000-0000-0000-000000000001", "nome": "Teste", "papel": "admin"}


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = lambda: USUARIO
    yield TestClient(app)
    app.dependency_overrides.clear()


def usar_db(db: FakeDB) -> FakeDB:
    app.dependency_overrides[get_db] = lambda: db
    return db


def cliente_row(**extra):
    row = {
        "id": 1,
        "nome": "Maria Souza",
        "telefone": "53988124477",
        "cpf_cnpj": None,
        "email": None,
        "observacoes": None,
        "status": "ativo",
        "criado_em": "2026-10-01T12:00:00+00:00",
        "atualizado_em": "2026-10-01T12:00:00+00:00",
        "enderecos": [
            {
                "id": 3,
                "cliente_id": 1,
                "endereco": "R. Santos Dumont, 412",
                "complemento": "casa",
                "cep": "96077520",
                "bairro": "Areal",
                "regiao_id": 1,
                "principal": True,
                "criado_em": "2026-10-01T12:00:00+00:00",
                "regioes": {"nome": "Areal", "taxa_entrega": "8.00"},
            }
        ],
    }
    row.update(extra)
    return row


def venda_row(status="concluida", **extra):
    row = {
        "id": 10,
        "criado_em": "2026-10-20T15:00:00+00:00",
        "origem": "atendimento",
        "cliente_id": 1,
        "forma_pagamento": "pix",
        "subtotal": "115.00",
        "desconto": "0.00",
        "taxa_entrega": "8.00",
        "total": "123.00",
        "status": status,
        "usuario_id": USUARIO["id"],
        "clientes": {"nome": "Maria Souza", "cpf_cnpj": "12345678901", "telefone": "53988124477"},
        "itens_venda": [
            {
                "id": 1,
                "produto_id": 1,
                "quantidade": 1,
                "preco_unitario": "115.00",
                "desconto": "0.00",
                "subtotal": "115.00",
                "produtos": {"nome": "Botijão P13 - Recarga", "categoria": "gas"},
            }
        ],
        "entregas": {
            "id": 5,
            "status": "pendente",
            "entregador_id": None,
            "enderecos": {"regioes": {"nome": "Areal"}},
        },
    }
    row.update(extra)
    return row


# ------------------------------------------------------------------ clientes


def test_criar_cliente_telefone_invalido(client):
    usar_db(FakeDB())
    r = client.post("/clientes", json={"nome": "Ana", "telefone": "123"})
    assert r.status_code == 422


def test_criar_cliente_guarda_so_digitos_e_um_principal(client):
    db = usar_db(
        FakeDB(
            [{"id": 1}],  # insert cliente
            [{"id": 3}],  # insert endereços
            [cliente_row()],  # busca final
            [],  # vendas (frequência)
        )
    )
    r = client.post(
        "/clientes",
        json={
            "nome": " Maria Souza ",
            "telefone": "(53) 98812-4477",
            "enderecos": [{"endereco": "R. Santos Dumont, 412", "regiao_id": 1}],
        },
    )
    assert r.status_code == 201, r.text
    corpo = r.json()
    assert corpo["telefone"] == "53988124477"
    assert corpo["enderecos"][0]["taxa_entrega"] == 8.0
    assert corpo["indicadores"]["total_pedidos"] == 0
    assert db.tabelas[:2] == ["clientes", "enderecos"]


def test_por_telefone_inexistente_da_404(client):
    usar_db(FakeDB([]))
    assert client.get("/clientes/por-telefone/53999999999").status_code == 404


def test_por_telefone_calcula_frequencia(client):
    usar_db(
        FakeDB(
            [cliente_row()],
            [
                {"criado_em": "2026-09-01T15:00:00+00:00"},
                {"criado_em": "2026-09-11T15:00:00+00:00"},
                {"criado_em": "2026-09-21T15:00:00+00:00"},
            ],
        )
    )
    r = client.get("/clientes/por-telefone/53988124477")
    assert r.status_code == 200
    ind = r.json()["indicadores"]
    assert ind["total_pedidos"] == 3
    assert ind["frequencia_media_dias"] == 10


def test_listar_clientes_paginado(client):
    usar_db(
        FakeDB(
            {
                "data": [
                    {
                        "id": 1,
                        "nome": "Maria Souza",
                        "telefone": "53988124477",
                        "cpf_cnpj": None,
                        "status": "ativo",
                        "criado_em": "2026-10-01T12:00:00+00:00",
                        "enderecos": [
                            {"endereco": "R. A, 1", "bairro": "Centro", "principal": True}
                        ],
                        "vendas": [
                            {"criado_em": "2026-10-10T12:00:00+00:00", "status": "concluida"},
                            {"criado_em": "2026-10-20T12:00:00+00:00", "status": "cancelada"},
                        ],
                    }
                ],
                "count": 41,
            }
        )
    )
    r = client.get("/clientes", params={"busca": "maria", "pagina": 2, "tamanho": 10})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["total"] == 41
    assert corpo["itens"][0]["endereco_principal"] == "R. A, 1"
    assert corpo["itens"][0]["ultima_compra"] == "2026-10-10"  # cancelada não conta


def test_excluir_cliente_com_vendas_da_409(client):
    usar_db(FakeDB([cliente_row()], [{"id": 10}]))
    assert client.delete("/clientes/1").status_code == 409


def test_excluir_cliente_sem_vendas(client):
    usar_db(FakeDB([cliente_row()], [], []))
    assert client.delete("/clientes/1").status_code == 204


# -------------------------------------------------------------------- vendas


def test_registrar_venda_chama_funcao_sql(client):
    db = usar_db(
        FakeDB(
            [
                {"criado_em": "2026-10-01T15:00:00+00:00"},
                {"criado_em": "2026-10-11T15:00:00+00:00"},
            ],
            {  # rpc registrar_venda
                "venda": {"id": 10},
                "itens": [],
                "entrega": {"id": 5, "status": "pendente", "regiao": "Areal"},
            },
            [venda_row()],  # busca da venda
            [
                {"criado_em": "2026-10-01T15:00:00+00:00"},
                {"criado_em": "2026-10-11T15:00:00+00:00"},
                {"criado_em": "2026-10-21T15:00:00+00:00"},
            ],
        )
    )
    corpo = {
        "origem": "atendimento",
        "cliente_id": 1,
        "endereco_id": 3,
        "forma_pagamento": "pix",
        "itens": [{"produto_id": 1, "quantidade": 1}],
    }
    r = client.post("/vendas", json=corpo)
    assert r.status_code == 201, r.text
    nome, params = db.rpcs[0]
    assert nome == "registrar_venda"
    assert params["p_usuario_id"] == USUARIO["id"]
    assert params["p_dados"]["itens"][0]["produto_id"] == 1
    resp = r.json()
    assert resp["total"] == 123.0
    assert resp["entrega"]["regiao"] == "Areal"
    assert resp["frequencia"]["anterior_dias"] == 10
    assert resp["frequencia"]["nova_dias"] == 10
    assert resp["frequencia"]["dentro_da_janela_de_contato"] is True


def test_venda_sem_itens_e_rejeitada(client):
    usar_db(FakeDB())
    r = client.post("/vendas", json={"origem": "portaria", "forma_pagamento": "pix", "itens": []})
    assert r.status_code == 422


def test_listar_vendas_totais_ignoram_canceladas(client):
    usar_db(
        FakeDB(
            [
                venda_row(),
                venda_row(id=11, status="cancelada"),
                venda_row(id=12, cliente_id=None, clientes=None, total="18.00"),
            ]
        )
    )
    r = client.get("/vendas", params={"periodo": "30d", "ordem": "menor_valor"})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["total"] == 3
    assert corpo["totais"]["quantidade_vendas"] == 2
    assert corpo["totais"]["total_vendas"] == 141.0
    assert corpo["totais"]["clientes_atendidos"] == 1
    assert corpo["itens"][0]["id"] == 12


def test_listar_vendas_busca_por_numero_e_produto(client):
    usar_db(FakeDB([venda_row(), venda_row(id=11)]))
    assert [v["id"] for v in client.get("/vendas", params={"busca": "#11"}).json()["itens"]] == [11]
    usar_db(FakeDB([venda_row()]))
    assert client.get("/vendas", params={"busca": "botijao"}).json()["total"] == 1


def test_cancelar_venda(client):
    db = usar_db(FakeDB({"venda_id": 10, "status": "cancelada"}, [venda_row(status="cancelada")]))
    r = client.post("/vendas/10/cancelar")
    assert r.status_code == 200
    assert r.json()["status"] == "cancelada"
    assert db.rpcs[0][0] == "cancelar_venda"


# ---------------------------------------------------------------------- auth


def test_login_sem_perfil_da_403(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "supabase_url", "https://x.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "sb_secret_x")
    monkeypatch.setattr(
        httpx,
        "post",
        lambda *a, **k: httpx.Response(
            200, json={"access_token": "a", "refresh_token": "r", "user": {"id": "u1"}}
        ),
    )
    usar_db(FakeDB([]))
    r = client.post("/auth/login", json={"email": "a@b.com", "senha": "x"})
    assert r.status_code == 403


def test_login_senha_errada_da_401(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "supabase_url", "https://x.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "sb_secret_x")
    monkeypatch.setattr(httpx, "post", lambda *a, **k: httpx.Response(400, json={}))
    usar_db(FakeDB())
    r = client.post("/auth/login", json={"email": "a@b.com", "senha": "x"})
    assert r.status_code == 401


def test_login_ok(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "supabase_url", "https://x.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "sb_secret_x")
    monkeypatch.setattr(
        httpx,
        "post",
        lambda *a, **k: httpx.Response(
            200,
            json={"access_token": "a", "refresh_token": "r", "expires_at": 1, "user": {"id": "u1"}},
        ),
    )
    usar_db(FakeDB([{"id": "u1", "nome": "Gui", "papel": "admin", "ativo": True}]))
    r = client.post("/auth/login", json={"email": "a@b.com", "senha": "x"})
    assert r.status_code == 200
    assert r.json()["usuario"]["nome"] == "Gui"
