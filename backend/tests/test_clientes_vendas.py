"""Testes de Clientes, Vendas e Auth (FakeDB, igual a test_operacao.py)."""
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.clientes.router import _dados_endereco
from app.clientes.schemas import EnderecoCreate
from app.core.auth import get_current_user, get_db
from app.main import app


class FakeQuery:
    def __init__(self, roteiro):
        self._roteiro = roteiro

    def __getattr__(self, nome):
        return lambda *a, **k: self

    def execute(self):
        resp = self._roteiro.pop(0)
        if isinstance(resp, Exception):
            raise resp
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


def test_endereco_salva_ponto_de_referencia():
    endereco = EnderecoCreate(
        endereco="Rua das Flores, 10",
        ponto_referencia="  portão azul  ",
    )

    assert _dados_endereco(endereco)["ponto_referencia"] == "portão azul"


def test_criar_cliente_telefone_invalido(client):
    usar_db(FakeDB())
    r = client.post("/clientes", json={"nome": "Ana", "telefone": "123"})
    assert r.status_code == 422


def test_criar_cliente_guarda_so_digitos_e_um_principal(client):
    db = usar_db(
        FakeDB(
            1,  # rpc criar_cliente -> id
            [cliente_row()],  # busca final
            [],  # vendas (frequência)
        )
    )
    r = client.post(
        "/clientes",
        json={
            "nome": " Maria Souza ",
            "telefone": "(53) 98812-4477",
            "cpf_cnpj": "529.982.247-25",
            "enderecos": [{"endereco": "R. Santos Dumont, 412", "regiao_id": 1}],
        },
    )
    assert r.status_code == 201, r.text
    corpo = r.json()
    assert corpo["telefone"] == "53988124477"
    assert corpo["enderecos"][0]["taxa_entrega"] == 8.0
    assert corpo["indicadores"]["total_pedidos"] == 0

    # cliente + endereços vão juntos, numa única função SQL (transação)
    nome, params = db.rpcs[0]
    assert nome == "criar_cliente"
    assert params["p_cliente"]["nome"] == "Maria Souza"
    assert params["p_cliente"]["telefone"] == "53988124477"
    assert params["p_cliente"]["cpf_cnpj"] == "52998224725"
    assert [e["principal"] for e in params["p_enderecos"]] == [True]


def test_criar_cliente_envia_ponto_de_referencia_ao_banco(client):
    db = usar_db(FakeDB(1, [cliente_row()], []))
    r = client.post(
        "/clientes",
        json={
            "nome": "Maria",
            "telefone": "53988124477",
            "enderecos": [{"endereco": "Rua A, 1", "ponto_referencia": "  portão azul "}],
        },
    )
    assert r.status_code == 201, r.text
    assert db.rpcs[0][1]["p_enderecos"][0]["ponto_referencia"] == "portão azul"


def test_criar_cliente_cpf_invalido_da_422(client):
    db = usar_db(FakeDB())
    r = client.post(
        "/clientes", json={"nome": "Ana", "telefone": "53988124477", "cpf_cnpj": "111.111.111-11"}
    )
    assert r.status_code == 422
    assert db.rpcs == []


def test_criar_cliente_email_invalido_da_422(client):
    usar_db(FakeDB())
    r = client.post(
        "/clientes", json={"nome": "Ana", "telefone": "53988124477", "email": "ana@"}
    )
    assert r.status_code == 422


def test_criar_cliente_telefone_duplicado_da_409(client):
    erro = APIError(
        {
            "message": 'duplicate key value violates unique constraint "clientes_telefone_key"',
            "code": "23505",
            "details": "Key (telefone)=(53988124477) already exists.",
        }
    )
    usar_db(FakeDB(erro))
    r = client.post("/clientes", json={"nome": "Ana", "telefone": "53988124477"})
    assert r.status_code == 409
    assert "telefone" in r.json()["detail"]


def test_criar_cliente_cpf_duplicado_da_409(client):
    erro = APIError(
        {
            "message": 'duplicate key value violates unique constraint "clientes_cpf_cnpj_key"',
            "code": "23505",
            "details": "Key (cpf_cnpj)=(52998224725) already exists.",
        }
    )
    usar_db(FakeDB(erro))
    r = client.post(
        "/clientes", json={"nome": "Ana", "telefone": "53988124477", "cpf_cnpj": "52998224725"}
    )
    assert r.status_code == 409
    assert "CPF" in r.json()["detail"]


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


# ------------------------------------------------------------- inadimplência


def inadimplente_row(**extra):
    return cliente_row(
        status="inadimplente",
        inadimplente_desde="2026-11-01T15:00:00+00:00",
        motivo_inadimplencia="2 botijões fiado",
        valor_devido="230.00",
        **extra,
    )


def test_marcar_inadimplente(client):
    db = usar_db(
        FakeDB(
            [cliente_row()],  # busca
            [],  # update
            [inadimplente_row()],  # busca final
            [],  # vendas (frequência)
        )
    )
    r = client.post(
        "/clientes/1/inadimplente", json={"motivo": " 2 botijões fiado ", "valor_devido": "230.00"}
    )
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["status"] == "inadimplente"
    assert corpo["inadimplente_desde"] is not None
    assert corpo["motivo_inadimplencia"] == "2 botijões fiado"
    assert float(corpo["valor_devido"]) == 230.0
    assert db.tabelas[:2] == ["clientes", "clientes"]


def test_marcar_inadimplente_sem_corpo(client):
    usar_db(FakeDB([cliente_row()], [], [inadimplente_row()], []))
    assert client.post("/clientes/1/inadimplente").status_code == 200


def test_marcar_inadimplente_ja_inadimplente_da_409(client):
    usar_db(FakeDB([inadimplente_row()]))
    assert client.post("/clientes/1/inadimplente").status_code == 409


def test_marcar_inadimplente_cliente_inexistente_da_404(client):
    usar_db(FakeDB([]))
    assert client.post("/clientes/99/inadimplente").status_code == 404


def test_marcar_inadimplente_valor_negativo_da_422(client):
    usar_db(FakeDB())
    assert client.post("/clientes/1/inadimplente", json={"valor_devido": "-5"}).status_code == 422


def test_remover_inadimplente(client):
    usar_db(FakeDB([inadimplente_row()], [], [cliente_row()], []))
    r = client.delete("/clientes/1/inadimplente")
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["status"] == "ativo"
    assert corpo["inadimplente_desde"] is None
    assert corpo["valor_devido"] is None


def test_remover_inadimplente_de_quem_nao_e_da_409(client):
    usar_db(FakeDB([cliente_row()]))
    assert client.delete("/clientes/1/inadimplente").status_code == 409


def test_remover_inadimplente_cliente_inexistente_da_404(client):
    usar_db(FakeDB([]))
    assert client.delete("/clientes/99/inadimplente").status_code == 404


def test_listar_inadimplentes(client):
    linha = {
        "id": 1,
        "nome": "Maria Souza",
        "telefone": "53988124477",
        "cpf_cnpj": None,
        "status": "inadimplente",
        "inadimplente_desde": "2026-11-01T15:00:00+00:00",
        "motivo_inadimplencia": "2 botijões fiado",
        "valor_devido": "230.00",
    }
    usar_db(
        FakeDB(
            {"data": [linha], "count": 3},  # página
            [{"valor_devido": "230.00"}, {"valor_devido": None}, {"valor_devido": "70.50"}],
        )
    )
    r = client.get("/clientes/inadimplentes", params={"busca": "maria"})
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["total"] == 3
    assert float(corpo["total_devido"]) == 300.5
    item = corpo["itens"][0]
    assert item["nome"] == "Maria Souza"
    assert item["dias_inadimplente"] >= 0
    assert float(item["valor_devido"]) == 230.0


def test_rota_inadimplentes_nao_e_confundida_com_id(client):
    # /clientes/inadimplentes tem que cair na listagem, não em /clientes/{id}
    usar_db(FakeDB({"data": [], "count": 0}, []))
    assert client.get("/clientes/inadimplentes").status_code == 200


# -------------------------------------------------------------------- vendas


@pytest.mark.parametrize("forma_pagamento", ["pix", "gas_do_povo"])
def test_registrar_venda_chama_funcao_sql(client, forma_pagamento):
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
        "forma_pagamento": forma_pagamento,
        "itens": [{"produto_id": 1, "quantidade": 1}],
    }
    r = client.post("/vendas", json=corpo)
    assert r.status_code == 201, r.text
    nome, params = db.rpcs[0]
    assert nome == "registrar_venda"
    assert params["p_usuario_id"] == USUARIO["id"]
    assert params["p_dados"]["forma_pagamento"] == forma_pagamento
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
