from types import SimpleNamespace

import pytest

from scripts import criar_usuario


class FakeAdmin:
    def __init__(self, existentes):
        self.existentes = existentes
        self.criados = []

    def list_users(self, page=1, per_page=50):
        return self.existentes if page == 1 else []

    def create_user(self, dados):
        self.criados.append(dados)
        return SimpleNamespace(user=SimpleNamespace(id="novo-id", email=dados["email"]))


class FakeDB:
    def __init__(self, existentes=()):
        self.auth = SimpleNamespace(admin=FakeAdmin(list(existentes)))
        self.upserts = []

    def table(self, nome):
        db = self

        class Q:
            def upsert(self, dados):
                db.upserts.append((nome, dados))
                return self

            def execute(self):
                return SimpleNamespace(data=[])

        return Q()


@pytest.fixture
def ambiente(monkeypatch):
    monkeypatch.setattr(criar_usuario.settings, "supabase_url", "https://x.supabase.co")
    monkeypatch.setattr(criar_usuario.settings, "supabase_service_key", "sb_secret_x")

    def preparar(db, argv, senhas=()):
        monkeypatch.setattr(criar_usuario, "get_db", lambda: db)
        monkeypatch.setattr("sys.argv", ["criar_usuario", *argv])
        respostas = iter(senhas)
        monkeypatch.setattr(criar_usuario.getpass, "getpass", lambda _: next(respostas))

    return preparar


def test_cria_usuario_e_perfil(ambiente):
    db = FakeDB()
    ambiente(db, ["--email", "Gui@Utilgas.com", "--nome", "Guilherme", "--papel", "admin"],
             ["senha123", "senha123"])
    assert criar_usuario.main() == 0
    assert db.auth.admin.criados[0]["email"] == "gui@utilgas.com"
    assert db.auth.admin.criados[0]["email_confirm"] is True
    assert db.upserts == [
        ("perfis", {"id": "novo-id", "nome": "Guilherme", "papel": "admin", "ativo": True})
    ]


def test_email_existente_so_cria_perfil(ambiente):
    db = FakeDB([SimpleNamespace(id="antigo", email="gui@utilgas.com")])
    ambiente(db, ["--email", "gui@utilgas.com", "--nome", "Gui"])
    assert criar_usuario.main() == 0
    assert db.auth.admin.criados == []
    assert db.upserts[0][1]["id"] == "antigo"
    assert db.upserts[0][1]["papel"] == "operador"


def test_senha_curta_nao_cria(ambiente):
    db = FakeDB()
    ambiente(db, ["--email", "a@b.com", "--nome", "A"], ["123"])
    assert criar_usuario.main() == 1
    assert db.auth.admin.criados == [] and db.upserts == []
