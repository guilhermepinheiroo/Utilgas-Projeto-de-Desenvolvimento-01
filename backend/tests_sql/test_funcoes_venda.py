"""
Testes das funções SQL de venda e estoque (registrar_venda, cancelar_venda,
movimentar_estoque), contra um Postgres/Supabase LOCAL.

NUNCA aponte para o banco dev ou de produção: os testes gravam e apagam dados.

Como rodar (Supabase local):
    npx supabase start                    # precisa de Docker Desktop
    npx supabase db reset                 # aplica todas as migrations
    pip install "psycopg[binary]" pytest
    export TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    pytest backend/tests_sql -v

Cada teste cria os próprios dados (com nomes únicos) e apaga tudo no final.
"""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest

try:
    import psycopg
    from psycopg.types.json import Jsonb
except ImportError:
    pytest.skip('instale: pip install "psycopg[binary]"', allow_module_level=True)

DB_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="defina TEST_DATABASE_URL (banco LOCAL)")


def conectar():
    return psycopg.connect(DB_URL, autocommit=True)


def chamar(con, func, *args):
    """Chama uma função e devolve o resultado (jsonb vira dict)."""
    marcadores = ", ".join(["%s"] * len(args))
    return con.execute(f"select public.{func}({marcadores})", args).fetchone()[0]


def venda(con, payload):
    return chamar(con, "registrar_venda", Jsonb(payload), None)


def erro_de(con, func, *args):
    """Devolve o SQLSTATE do erro levantado pela função (ou None se não houve)."""
    try:
        chamar(con, func, *args)
    except psycopg.Error as e:
        return e.sqlstate
    return None


def estoque(con, produto_id):
    return con.execute(
        "select estoque_atual, estoque_vazio from public.produtos where id = %s",
        (produto_id,),
    ).fetchone()


def contar(con, tabela, **filtros):
    where = " and ".join(f"{k} = %s" for k in filtros) or "true"
    return con.execute(
        f"select count(*) from public.{tabela} where {where}", tuple(filtros.values())
    ).fetchone()[0]


@pytest.fixture
def con():
    c = conectar()
    yield c
    c.close()


@pytest.fixture
def loja(con):
    """Cria região, 3 produtos (2 de gás + 1 acessório), 2 clientes e endereços."""
    tag = uuid.uuid4().hex[:8]
    ids = {"tag": tag}

    def um(sql, *params):
        return con.execute(sql, params).fetchone()[0]

    ids["regiao"] = um(
        "insert into public.regioes (nome, taxa_entrega) values (%s, 8.00) returning id",
        f"Reg-{tag}",
    )
    # P13: preço 115, 10 cheios e 0 vazios | P45: preço 420, 5 cheios
    ids["p13"] = um(
        "insert into public.produtos (nome, categoria, preco, estoque_atual, controla_vazio)"
        " values (%s, 'gas', 115.00, 10, true) returning id",
        f"P13-{tag}",
    )
    ids["p45"] = um(
        "insert into public.produtos (nome, categoria, preco, estoque_atual, controla_vazio)"
        " values (%s, 'gas', 420.00, 5, true) returning id",
        f"P45-{tag}",
    )
    ids["kit"] = um(
        "insert into public.produtos (nome, categoria, preco, estoque_atual)"
        " values (%s, 'acessorio', 40.00, 10) returning id",
        f"Kit-{tag}",
    )
    ids["cliente"] = um(
        "insert into public.clientes (nome, telefone) values (%s, %s) returning id",
        f"Maria-{tag}", f"1{tag}",
    )
    ids["end"] = um(
        "insert into public.enderecos (cliente_id, endereco, regiao_id, principal)"
        " values (%s, 'Rua A, 1', %s, true) returning id",
        ids["cliente"], ids["regiao"],
    )
    ids["outro_cliente"] = um(
        "insert into public.clientes (nome, telefone) values (%s, %s) returning id",
        f"Joao-{tag}", f"2{tag}",
    )
    ids["end_outro"] = um(
        "insert into public.enderecos (cliente_id, endereco, regiao_id, principal)"
        " values (%s, 'Rua B, 2', %s, true) returning id",
        ids["outro_cliente"], ids["regiao"],
    )

    yield ids

    produtos = (ids["p13"], ids["p45"], ids["kit"])
    con.execute("delete from public.movimentacoes_estoque where produto_id = any(%s)", (list(produtos),))
    con.execute(
        "delete from public.vendas where cliente_id = any(%s) or id in"
        " (select venda_id from public.itens_venda where produto_id = any(%s))",
        ([ids["cliente"], ids["outro_cliente"]], list(produtos)),
    )
    con.execute("delete from public.produtos where id = any(%s)", (list(produtos),))
    con.execute("delete from public.clientes where id = any(%s)", ([ids["cliente"], ids["outro_cliente"]],))
    con.execute("delete from public.regioes where id = %s", (ids["regiao"],))


def pedido(loja, itens, **extra):
    base = {
        "origem": "atendimento",
        "cliente_id": loja["cliente"],
        "endereco_id": loja["end"],
        "forma_pagamento": "pix",
        "itens": itens,
    }
    base.update(extra)
    return base


# ---------------------------------------------------------------------
# registrar_venda
# ---------------------------------------------------------------------
def test_venda_baixa_cheio_e_soma_vazio(con, loja):
    res = venda(con, pedido(loja, [{"produto_id": loja["p13"], "quantidade": 3}]))
    assert estoque(con, loja["p13"]) == (7, 3)
    movs = con.execute(
        "select tipo, tipo_estoque, quantidade from public.movimentacoes_estoque"
        " where produto_id = %s and origem = 'venda' order by tipo",
        (loja["p13"],),
    ).fetchall()
    assert movs == [("entrada", "vazio", 3), ("saida", "cheio", 3)]
    assert res["venda"]["origem"] == "atendimento"


def test_totais_com_desconto_e_taxa_de_entrega(con, loja):
    # Igual ao protótipo: 115 - 10 de desconto = 105; taxa 8; total 113
    res = venda(con, pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1, "desconto": 10}]))
    v = res["venda"]
    assert float(v["subtotal"]) == 105.00
    assert float(v["desconto"]) == 10.00
    assert float(v["taxa_entrega"]) == 8.00
    assert float(v["total"]) == 113.00
    assert float(res["itens"][0]["preco_unitario"]) == 115.00


def test_atendimento_cria_entrega_pendente_sem_entregador(con, loja):
    res = venda(
        con,
        pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}], observacao_entregador="portao azul"),
    )
    assert res["entrega"]["status"] == "pendente"
    assert res["entrega"]["entregador_id"] is None
    assert res["entrega"]["regiao"] == f"Reg-{loja['tag']}"
    obs = con.execute(
        "select observacao, entregador_id from public.entregas where id = %s",
        (res["entrega"]["id"],),
    ).fetchone()
    assert obs == ("portao azul", None)


def test_produto_sem_vasilhame_nao_mexe_no_vazio(con, loja):
    venda(con, pedido(loja, [{"produto_id": loja["kit"], "quantidade": 2}]))
    assert estoque(con, loja["kit"]) == (8, 0)
    assert contar(con, "movimentacoes_estoque", produto_id=loja["kit"], tipo_estoque="vazio") == 0


def test_item_repetido_e_somado(con, loja):
    res = venda(
        con,
        pedido(
            loja,
            [
                {"produto_id": loja["p13"], "quantidade": 1},
                {"produto_id": loja["p13"], "quantidade": 2},
            ],
        ),
    )
    assert len(res["itens"]) == 1
    assert res["itens"][0]["quantidade"] == 3
    assert estoque(con, loja["p13"]) == (7, 3)


def test_estoque_insuficiente_nao_grava_nada(con, loja):
    antes = contar(con, "vendas", cliente_id=loja["cliente"])
    # P13 tem 10; o P45 (5) não comporta 6: a venda inteira precisa falhar,
    # inclusive a parte do P13 que "já tinha passado".
    erro = erro_de(
        con,
        "registrar_venda",
        Jsonb(
            pedido(
                loja,
                [
                    {"produto_id": loja["p13"], "quantidade": 2},
                    {"produto_id": loja["p45"], "quantidade": 6},
                ],
            )
        ),
        None,
    )
    assert erro == "UG409"
    assert estoque(con, loja["p13"]) == (10, 0)
    assert estoque(con, loja["p45"]) == (5, 0)
    assert contar(con, "vendas", cliente_id=loja["cliente"]) == antes
    assert contar(con, "movimentacoes_estoque", produto_id=loja["p13"]) == 0


def test_endereco_de_outro_cliente_e_recusado(con, loja):
    erro = erro_de(
        con,
        "registrar_venda",
        Jsonb(pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}], endereco_id=loja["end_outro"])),
        None,
    )
    assert erro == "UG404"
    assert estoque(con, loja["p13"]) == (10, 0)


@pytest.mark.parametrize(
    "mudanca, esperado",
    [
        ({"cliente_id": 999999999}, "UG404"),
        ({"origem": "outra"}, "UG422"),
        ({"forma_pagamento": "cheque"}, "UG422"),
        ({"itens": []}, "UG422"),
        ({"itens": [{"produto_id": 999999999, "quantidade": 1}]}, "UG404"),
        ({"itens": "texto"}, "UG422"),
        ({"cliente_id": "abc"}, "UG422"),
    ],
)
def test_validacoes(con, loja, mudanca, esperado):
    payload = pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}])
    payload.update(mudanca)
    assert erro_de(con, "registrar_venda", Jsonb(payload), None) == esperado


@pytest.mark.parametrize(
    "item",
    [
        {"quantidade": 0},
        {"quantidade": -1},
        {"quantidade": 1, "desconto": -5},
        {"quantidade": 1, "desconto": 9999},  # maior que o valor do item
    ],
)
def test_item_invalido(con, loja, item):
    item = {"produto_id": loja["p13"], **item}
    assert erro_de(con, "registrar_venda", Jsonb(pedido(loja, [item])), None) == "UG422"
    assert estoque(con, loja["p13"]) == (10, 0)


def test_produto_inativo_e_recusado(con, loja):
    con.execute("update public.produtos set ativo = false where id = %s", (loja["p13"],))
    erro = erro_de(
        con,
        "registrar_venda",
        Jsonb(pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}])),
        None,
    )
    assert erro == "UG422"


def test_portaria_sem_cliente_nao_cria_entrega_nem_taxa(con, loja):
    res = venda(
        con,
        {
            "origem": "portaria",
            "forma_pagamento": "dinheiro",
            "itens": [{"produto_id": loja["p13"], "quantidade": 1}],
        },
    )
    assert res["entrega"] is None
    assert res["venda"]["cliente_id"] is None
    assert float(res["venda"]["taxa_entrega"]) == 0
    assert float(res["venda"]["total"]) == 115.00
    assert estoque(con, loja["p13"]) == (9, 1)  # a regra do vazio vale na portaria também


def test_atendimento_sem_cliente_e_recusado(con, loja):
    payload = pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}])
    del payload["cliente_id"]
    assert erro_de(con, "registrar_venda", Jsonb(payload), None) == "UG422"


def test_portaria_com_endereco_e_recusada(con, loja):
    payload = pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}], origem="portaria")
    assert erro_de(con, "registrar_venda", Jsonb(payload), None) == "UG422"


# ---------------------------------------------------------------------
# Concorrência
# ---------------------------------------------------------------------
def test_concorrencia_ultimo_item_nunca_vende_duas_vezes(loja):
    """12 vendas simultâneas de 1 botijão com apenas 5 em estoque: só 5 passam."""
    con0 = conectar()
    con0.execute("update public.produtos set estoque_atual = 5 where id = %s", (loja["p13"],))

    def tentar(_):
        with conectar() as c:
            return erro_de(c, "registrar_venda", Jsonb(pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}])), None)

    with ThreadPoolExecutor(max_workers=12) as pool:
        resultados = list(pool.map(tentar, range(12)))

    assert resultados.count(None) == 5, resultados
    assert resultados.count("UG409") == 7, resultados
    assert estoque(con0, loja["p13"]) == (0, 5)
    assert contar(con0, "vendas", cliente_id=loja["cliente"]) == 5
    con0.close()


def test_concorrencia_ordem_invertida_nao_gera_deadlock(loja):
    """Vendas com os mesmos produtos em ordens opostas não podem travar uma à outra."""
    con0 = conectar()
    con0.execute("update public.produtos set estoque_atual = 100 where id in (%s, %s)", (loja["p13"], loja["p45"]))
    a = {"produto_id": loja["p13"], "quantidade": 1}
    b = {"produto_id": loja["p45"], "quantidade": 1}

    def tentar(i):
        with conectar() as c:
            itens = [a, b] if i % 2 == 0 else [b, a]
            return erro_de(c, "registrar_venda", Jsonb(pedido(loja, itens)), None)

    with ThreadPoolExecutor(max_workers=16) as pool:
        resultados = list(pool.map(tentar, range(40)))

    assert resultados.count(None) == 40, resultados  # nenhum deadlock (40P01)
    assert estoque(con0, loja["p13"]) == (60, 40)
    assert estoque(con0, loja["p45"]) == (60, 40)
    con0.close()


# ---------------------------------------------------------------------
# cancelar_venda
# ---------------------------------------------------------------------
def test_cancelar_devolve_cheio_retira_vazio_e_cancela_entrega(con, loja):
    res = venda(con, pedido(loja, [{"produto_id": loja["p13"], "quantidade": 4}]))
    assert estoque(con, loja["p13"]) == (6, 4)

    chamar(con, "cancelar_venda", res["venda"]["id"], None)

    assert estoque(con, loja["p13"]) == (10, 0)
    assert con.execute("select status from public.vendas where id = %s", (res["venda"]["id"],)).fetchone()[0] == "cancelada"
    assert con.execute("select status from public.entregas where id = %s", (res["entrega"]["id"],)).fetchone()[0] == "cancelada"


def test_cancelar_duas_vezes_da_409_e_nao_duplica_estoque(con, loja):
    res = venda(con, pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}]))
    chamar(con, "cancelar_venda", res["venda"]["id"], None)
    assert erro_de(con, "cancelar_venda", res["venda"]["id"], None) == "UG409"
    assert estoque(con, loja["p13"]) == (10, 0)


def test_nao_cancela_entrega_ja_realizada(con, loja):
    res = venda(con, pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}]))
    con.execute("update public.entregas set status = 'entregue' where id = %s", (res["entrega"]["id"],))
    assert erro_de(con, "cancelar_venda", res["venda"]["id"], None) == "UG409"
    assert estoque(con, loja["p13"]) == (9, 1)


def test_cancelar_venda_inexistente(con):
    assert erro_de(con, "cancelar_venda", 999999999, None) == "UG404"


def test_cancelar_com_vazios_insuficientes_nao_bloqueia(con, loja):
    res = venda(con, pedido(loja, [{"produto_id": loja["p13"], "quantidade": 3}]))
    # os vazios foram enviados à distribuidora antes do cancelamento
    chamar(con, "movimentar_estoque", loja["p13"], "vazio", "saida", 2, "ajuste", None, None)
    assert estoque(con, loja["p13"]) == (7, 1)

    chamar(con, "cancelar_venda", res["venda"]["id"], None)

    assert estoque(con, loja["p13"]) == (10, 0)  # retirou só 1 vazio, sem erro
    obs = con.execute(
        "select observacao from public.movimentacoes_estoque"
        " where venda_id = %s and origem = 'cancelamento' and tipo_estoque = 'vazio'",
        (res["venda"]["id"],),
    ).fetchone()[0]
    assert "vazios insuficientes" in obs


def test_cancelar_venda_de_portaria(con, loja):
    res = venda(
        con,
        {"origem": "portaria", "forma_pagamento": "pix", "itens": [{"produto_id": loja["p13"], "quantidade": 2}]},
    )
    out = chamar(con, "cancelar_venda", res["venda"]["id"], None)
    assert out["entrega_cancelada"] is False
    assert estoque(con, loja["p13"]) == (10, 0)


# ---------------------------------------------------------------------
# movimentar_estoque
# ---------------------------------------------------------------------
def mover(con, produto, estoque_, tipo, qtd, origem="ajuste"):
    return chamar(con, "movimentar_estoque", produto, estoque_, tipo, qtd, origem, None, None)


def test_entrada_e_saida_de_cheios(con, loja):
    assert mover(con, loja["p13"], "cheio", "entrada", 5, "compra")["estoque_atual"] == 15
    assert mover(con, loja["p13"], "cheio", "saida", 3)["estoque_atual"] == 12


def test_saida_maior_que_o_estoque_da_409(con, loja):
    assert erro_de(con, "movimentar_estoque", loja["p13"], "cheio", "saida", 11, "ajuste", None, None) == "UG409"
    assert estoque(con, loja["p13"]) == (10, 0)


def test_troca_de_vazio_com_a_distribuidora(con, loja):
    venda(con, pedido(loja, [{"produto_id": loja["p13"], "quantidade": 4}]))  # 6 cheios, 4 vazios
    out = mover(con, loja["p13"], "cheio", "entrada", 3, "troca_vazio")  # p_estoque/p_tipo são ignorados
    assert (out["estoque_atual"], out["estoque_vazio"]) == (9, 1)
    assert contar(con, "movimentacoes_estoque", produto_id=loja["p13"], origem="troca_vazio") == 2


def test_troca_de_vazio_sem_vazios_suficientes(con, loja):
    assert erro_de(con, "movimentar_estoque", loja["p13"], "cheio", "entrada", 1, "troca_vazio", None, None) == "UG409"


def test_vazio_em_produto_sem_vasilhame(con, loja):
    assert erro_de(con, "movimentar_estoque", loja["kit"], "vazio", "entrada", 1, "ajuste", None, None) == "UG422"
    assert erro_de(con, "movimentar_estoque", loja["kit"], "cheio", "entrada", 1, "troca_vazio", None, None) == "UG422"


@pytest.mark.parametrize(
    "args",
    [
        ("cheio", "entrada", 0, "ajuste"),
        ("cheio", "entrada", -1, "ajuste"),
        ("cheio", "meio", 1, "ajuste"),
        ("grande", "entrada", 1, "ajuste"),
        ("cheio", "entrada", 1, "venda"),  # venda/cancelamento têm função própria
    ],
)
def test_movimentacao_invalida(con, loja, args):
    assert erro_de(con, "movimentar_estoque", loja["p13"], *args, None, None) == "UG422"


def test_movimentar_produto_inexistente(con):
    assert erro_de(con, "movimentar_estoque", 999999999, "cheio", "entrada", 1, "ajuste", None, None) == "UG404"


def test_saidas_simultaneas_nao_deixam_estoque_negativo(loja):
    con0 = conectar()

    def tentar(_):
        with conectar() as c:
            return erro_de(c, "movimentar_estoque", loja["p13"], "cheio", "saida", 1, "ajuste", None, None)

    with ThreadPoolExecutor(max_workers=15) as pool:
        resultados = list(pool.map(tentar, range(15)))

    assert resultados.count(None) == 10  # havia 10 cheios
    assert resultados.count("UG409") == 5
    assert estoque(con0, loja["p13"]) == (0, 0)
    con0.close()


# ---------------------------------------------------------------------
# Segurança
# ---------------------------------------------------------------------
@pytest.mark.parametrize("papel", ["anon", "authenticated"])
def test_front_nao_consegue_chamar_as_funcoes(con, loja, papel):
    payload = Jsonb(pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}]))
    chamadas = [
        ("select public.registrar_venda(%s, null)", (payload,)),
        ("select public.cancelar_venda(1, null)", ()),
        ("select public.movimentar_estoque(%s, 'cheio', 'entrada', 1, 'ajuste', null, null)", (loja["p13"],)),
    ]
    for sql, params in chamadas:
        with con.transaction():
            con.execute(f"set local role {papel}")
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                con.execute(sql, params)
    assert estoque(con, loja["p13"]) == (10, 0)


def test_service_role_consegue_chamar(con, loja):
    with con.transaction():
        con.execute("set local role service_role")
        res = con.execute(
            "select public.registrar_venda(%s, null)",
            (Jsonb(pedido(loja, [{"produto_id": loja["p13"], "quantidade": 1}])),),
        ).fetchone()[0]
    assert res["venda"]["id"]
