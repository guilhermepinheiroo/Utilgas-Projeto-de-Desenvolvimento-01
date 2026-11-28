"""
Testes do banco para inadimplência e cadastro atômico de clientes
(trigger trg_clientes_inadimplencia, constraint ck_clientes_inadimplencia_coerente
e função criar_cliente), contra um Postgres/Supabase LOCAL.

Mesmo setup de test_funcoes_venda.py (leia o topo daquele arquivo).
NUNCA aponte para o banco dev ou de produção.
"""
import json
import os
import uuid

import pytest

try:
    import psycopg
    from psycopg import errors
except ImportError:
    pytest.skip('instale: pip install "psycopg[binary]"', allow_module_level=True)

DB_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="defina TEST_DATABASE_URL (banco LOCAL)")


@pytest.fixture
def con():
    with psycopg.connect(DB_URL, autocommit=True) as c:
        yield c


@pytest.fixture
def telefone(con):
    tel = "539" + str(uuid.uuid4().int)[:8]
    yield tel
    con.execute("delete from public.clientes where telefone = %s", (tel,))


def criar(con, telefone, enderecos=None, **extra):
    cliente = {"nome": "Teste", "telefone": telefone, **extra}
    return con.execute(
        "select public.criar_cliente(%s::jsonb, %s::jsonb)",
        (json.dumps(cliente), json.dumps(enderecos or [])),
    ).fetchone()[0]


def estado(con, cid):
    return con.execute(
        "select status, inadimplente_desde, motivo_inadimplencia, valor_devido "
        "from public.clientes where id = %s",
        (cid,),
    ).fetchone()


def test_marcar_grava_data_motivo_e_valor(con, telefone):
    cid = criar(con, telefone)
    con.execute(
        "update public.clientes set status='inadimplente', "
        "motivo_inadimplencia='fiado', valor_devido=50 where id=%s",
        (cid,),
    )
    status, desde, motivo, valor = estado(con, cid)
    assert status == "inadimplente"
    assert desde is not None
    assert motivo == "fiado"
    assert float(valor) == 50.0


def test_data_original_e_preservada_ao_editar(con, telefone):
    cid = criar(con, telefone)
    con.execute("update public.clientes set status='inadimplente' where id=%s", (cid,))
    desde = estado(con, cid)[1]
    con.execute("update public.clientes set valor_devido=99 where id=%s", (cid,))
    assert estado(con, cid)[1] == desde


def test_remover_limpa_tudo(con, telefone):
    cid = criar(con, telefone)
    con.execute(
        "update public.clientes set status='inadimplente', "
        "motivo_inadimplencia='fiado', valor_devido=50 where id=%s",
        (cid,),
    )
    con.execute("update public.clientes set status='ativo' where id=%s", (cid,))
    assert estado(con, cid) == ("ativo", None, None, None)


def test_cadastro_ja_inadimplente_recebe_data(con, telefone):
    cid = criar(con, telefone, status="inadimplente")
    status, desde, _, _ = estado(con, cid)
    assert status == "inadimplente"
    assert desde is not None


def test_constraint_barra_classificacao_incoerente(con, telefone):
    cid = criar(con, telefone)
    con.execute("alter table public.clientes disable trigger trg_clientes_inadimplencia")
    try:
        with pytest.raises(errors.CheckViolation):
            con.execute("update public.clientes set valor_devido=5 where id=%s", (cid,))
    finally:
        con.execute("alter table public.clientes enable trigger trg_clientes_inadimplencia")


def test_valor_devido_negativo_e_recusado(con, telefone):
    cid = criar(con, telefone)
    with pytest.raises(errors.CheckViolation):
        con.execute(
            "update public.clientes set status='inadimplente', valor_devido=-1 where id=%s",
            (cid,),
        )


def test_criar_cliente_grava_cliente_e_enderecos(con, telefone):
    cid = criar(con, telefone, [{"endereco": "Rua A, 1", "bairro": "Centro", "principal": True}])
    n = con.execute("select count(*) from public.enderecos where cliente_id=%s", (cid,)).fetchone()[0]
    assert n == 1


def test_criar_cliente_guarda_ponto_de_referencia(con, telefone):
    cid = criar(
        con,
        telefone,
        [{"endereco": "Rua A, 1", "ponto_referencia": "portão azul", "principal": True}],
    )
    ponto = con.execute(
        "select ponto_referencia from public.enderecos where cliente_id=%s", (cid,)
    ).fetchone()[0]
    assert ponto == "portão azul"


def test_criar_cliente_e_atomico(con, telefone):
    # dois endereços principais violam uq_endereco_principal: nada pode ficar gravado
    with pytest.raises(errors.UniqueViolation):
        criar(
            con,
            telefone,
            [
                {"endereco": "A", "principal": True},
                {"endereco": "B", "principal": True},
            ],
        )
    n = con.execute("select count(*) from public.clientes where telefone=%s", (telefone,)).fetchone()[0]
    assert n == 0


def test_criar_cliente_telefone_duplicado(con, telefone):
    criar(con, telefone)
    with pytest.raises(errors.UniqueViolation):
        criar(con, telefone)
