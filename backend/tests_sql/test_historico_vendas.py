import os

import pytest

try:
    import psycopg
except ImportError:
    pytest.skip('instale: pip install "psycopg[binary]"', allow_module_level=True)

DB_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="defina TEST_DATABASE_URL (banco LOCAL)")


@pytest.fixture
def con():
    c = psycopg.connect(DB_URL, autocommit=True)
    yield c
    c.close()


@pytest.mark.parametrize("papel", ["anon", "authenticated"])
def test_front_nao_consegue_ler_o_historico(con, papel):
    with con.transaction():
        con.execute(f"set local role {papel}")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            con.execute("select public.historico_vendas()")


def test_service_role_consegue_ler_o_historico(con):
    with con.transaction():
        con.execute("set local role service_role")
        res = con.execute("select public.historico_vendas(p_limite => 1)").fetchone()[0]
    assert set(res) == {"totais", "total", "itens"}


@pytest.mark.parametrize(
    "args",
    ["p_ordem => 'qualquer'", "p_limite => 0", "p_limite => 101", "p_deslocamento => -1"],
)
def test_parametros_invalidos_dao_ug422(con, args):
    with pytest.raises(psycopg.Error) as erro:
        con.execute(f"select public.historico_vendas({args})")
    assert erro.value.sqlstate == "UG422"
