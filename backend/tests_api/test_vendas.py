from datetime import datetime, timedelta, timezone

import pytest

from tests_api.auxiliares import (
    cadastrar_cliente,
    inserir_venda_direto_no_banco,
    nome_unico,
    requer_supabase_local,
)

pytestmark = requer_supabase_local

UMA_TARDE_DE_MARCO = datetime(2026, 3, 10, 15, 0, tzinfo=timezone.utc)


@pytest.fixture
def cliente(api, apagar_no_fim, regiao):
    return cadastrar_cliente(
        api,
        apagar_no_fim,
        nome=nome_unico("Venda"),
        enderecos=[{"endereco": "Rua A, 1", "regiao_id": regiao["id"]}],
    )


def vender_no_atendimento(api, cliente, itens, **campos_extras):
    corpo = {
        "origem": "atendimento",
        "cliente_id": cliente["id"],
        "endereco_id": cliente["enderecos"][0]["id"],
        "forma_pagamento": "pix",
        "itens": itens,
    }
    return api.post("/vendas", json=corpo | campos_extras)


def estoque_cheio_e_vazio(db, produto):
    linha = (
        db.table("produtos")
        .select("estoque_atual, estoque_vazio")
        .eq("id", produto["id"])
        .execute()
        .data[0]
    )
    return linha["estoque_atual"], linha["estoque_vazio"]


def test_atendimento_calcula_valores_baixa_estoque_e_cria_entrega(
    api, db, cliente, produtos, regiao
):
    p13, kit = produtos["p13"], produtos["kit"]
    cheios_antes, vazios_antes = estoque_cheio_e_vazio(db, p13)

    resposta = vender_no_atendimento(
        api,
        cliente,
        [
            {"produto_id": p13["id"], "quantidade": 2, "desconto": 10},
            {"produto_id": kit["id"], "quantidade": 1},
        ],
        observacao_entregador="Portão azul",
    )
    assert resposta.status_code == 201, resposta.text
    venda = resposta.json()

    assert venda["subtotal"] == 260
    assert venda["desconto"] == 10
    assert venda["taxa_entrega"] == 7.5
    assert venda["total"] == 267.5
    assert venda["cliente_nome"] == cliente["nome"]
    assert [(i["produto_nome"], i["quantidade"], i["subtotal"]) for i in venda["itens"]] == [
        (p13["nome"], 2, 220),
        (kit["nome"], 1, 40),
    ]
    assert venda["entrega"]["status"] == "pendente"
    assert venda["entrega"]["regiao"] == regiao["nome"]
    assert estoque_cheio_e_vazio(db, p13) == (cheios_antes - 2, vazios_antes + 2)

    entrega = db.table("entregas").select("observacao").eq("venda_id", venda["id"]).execute()
    assert entrega.data == [{"observacao": "Portão azul"}]


def test_primeira_compra_vem_sem_frequencia_anterior(api, cliente, produtos):
    resposta = vender_no_atendimento(
        api, cliente, [{"produto_id": produtos["kit"]["id"], "quantidade": 1}]
    )
    assert resposta.json()["frequencia"]["anterior_dias"] is None


def test_modal_traz_o_recalculo_de_frequencia(api, db, cliente, produtos):
    agora = datetime.now(timezone.utc)
    inserir_venda_direto_no_banco(db, cliente, agora - timedelta(days=60))
    inserir_venda_direto_no_banco(db, cliente, agora - timedelta(days=30))

    resposta = vender_no_atendimento(
        api, cliente, [{"produto_id": produtos["kit"]["id"], "quantidade": 1}]
    )
    frequencia = resposta.json()["frequencia"]
    assert frequencia["anterior_dias"] == 30
    assert frequencia["nova_dias"] == 30
    assert frequencia["recompra_prevista_em_dias"] == 30
    assert frequencia["dentro_da_janela_de_contato"] is True


def test_portaria_sem_cliente_nao_tem_entrega_nem_taxa(api, apagar_no_fim, produtos):
    resposta = api.post(
        "/vendas",
        json={
            "origem": "portaria",
            "forma_pagamento": "dinheiro",
            "itens": [{"produto_id": produtos["kit"]["id"], "quantidade": 3}],
        },
    )
    assert resposta.status_code == 201, resposta.text
    venda = resposta.json()
    apagar_no_fim.vendas.append(venda["id"])
    assert venda["taxa_entrega"] == 0
    assert venda["total"] == 120
    assert venda["entrega"] is None
    assert venda["frequencia"] is None
    assert venda["cliente_nome"] is None


def test_endereco_sem_regiao_recusa_a_venda(api, db, apagar_no_fim, produtos):
    sem_regiao = cadastrar_cliente(api, apagar_no_fim, enderecos=[{"endereco": "Rua X"}])
    resposta = vender_no_atendimento(
        api, sem_regiao, [{"produto_id": produtos["kit"]["id"], "quantidade": 1}]
    )
    assert resposta.status_code == 422
    assert "região" in resposta.json()["detail"]
    assert db.table("vendas").select("id").eq("cliente_id", sem_regiao["id"]).execute().data == []


@pytest.mark.parametrize(
    "alteracao_no_item, status_esperado",
    [
        pytest.param({"quantidade": 10**6}, 409, id="estoque-insuficiente"),
        pytest.param({"produto_id": 999999999}, 404, id="produto-inexistente"),
        pytest.param({"desconto": 10**4}, 422, id="desconto-maior-que-o-item"),
    ],
)
def test_erros_da_funcao_sql_viram_status_http(
    api, cliente, produtos, alteracao_no_item, status_esperado
):
    item = {"produto_id": produtos["kit"]["id"], "quantidade": 1} | alteracao_no_item
    resposta = vender_no_atendimento(api, cliente, [item])
    assert resposta.status_code == status_esperado, resposta.text


def test_endereco_de_outro_cliente_da_404(api, apagar_no_fim, cliente, produtos, regiao):
    outro = cadastrar_cliente(
        api, apagar_no_fim, enderecos=[{"endereco": "Rua B", "regiao_id": regiao["id"]}]
    )
    resposta = vender_no_atendimento(
        api,
        cliente,
        [{"produto_id": produtos["kit"]["id"], "quantidade": 1}],
        endereco_id=outro["enderecos"][0]["id"],
    )
    assert resposta.status_code == 404


def test_obter_venda_devolve_o_mesmo_que_o_registro(api, cliente, produtos):
    registrada = vender_no_atendimento(
        api, cliente, [{"produto_id": produtos["kit"]["id"], "quantidade": 2}]
    ).json()
    resposta = api.get(f"/vendas/{registrada['id']}")
    assert resposta.status_code == 200
    venda = resposta.json()
    assert venda["id"] == registrada["id"]
    assert venda["total"] == registrada["total"]
    assert venda["cliente_nome"] == registrada["cliente_nome"]
    assert venda["itens"] == registrada["itens"]


def test_venda_inexistente_da_404(api):
    assert api.get("/vendas/999999999").status_code == 404


def test_historico_lista_canceladas_mas_nao_soma_nos_totais(api, db, cliente):
    inserir_venda_direto_no_banco(db, cliente, UMA_TARDE_DE_MARCO, total=100)
    inserir_venda_direto_no_banco(db, cliente, UMA_TARDE_DE_MARCO + timedelta(hours=1), total=300)
    inserir_venda_direto_no_banco(
        db, cliente, UMA_TARDE_DE_MARCO + timedelta(hours=2), total=50, status="cancelada"
    )

    historico = api.get("/vendas", params={"cliente_id": cliente["id"]}).json()
    assert historico["total"] == 3
    assert historico["totais"] == {
        "total_vendas": 400,
        "quantidade_vendas": 2,
        "clientes_atendidos": 1,
        "ticket_medio": 200,
    }


def test_filtrando_canceladas_os_totais_sao_das_canceladas(api, db, cliente):
    inserir_venda_direto_no_banco(db, cliente, UMA_TARDE_DE_MARCO, total=100)
    inserir_venda_direto_no_banco(db, cliente, UMA_TARDE_DE_MARCO, total=50, status="cancelada")
    filtro = {"cliente_id": cliente["id"], "status": "cancelada"}
    assert api.get("/vendas", params=filtro).json()["totais"]["total_vendas"] == 50


def test_historico_ordena_e_pagina(api, db, cliente):
    ids = [
        inserir_venda_direto_no_banco(
            db, cliente, UMA_TARDE_DE_MARCO + timedelta(hours=hora), total=total
        )["id"]
        for hora, total in [(0, 50), (1, 300), (2, 100)]
    ]

    def historico(**params):
        resposta = api.get("/vendas", params={"cliente_id": cliente["id"]} | params)
        assert resposta.status_code == 200, resposta.text
        return resposta.json()

    assert [v["id"] for v in historico()["itens"]] == ids[::-1]
    assert [v["id"] for v in historico(ordem="mais_antigas")["itens"]] == ids
    assert [v["total"] for v in historico(ordem="maior_valor")["itens"]] == [300, 100, 50]

    segunda_pagina = historico(tamanho=2, pagina=2)
    assert [v["id"] for v in segunda_pagina["itens"]] == [ids[0]]
    assert segunda_pagina["total"] == 3
    assert segunda_pagina["totais"]["quantidade_vendas"] == 3


def test_historico_busca_pelo_numero_do_pedido(api, db, cliente):
    venda = inserir_venda_direto_no_banco(db, cliente, UMA_TARDE_DE_MARCO)
    resposta = api.get("/vendas", params={"busca": f"#{venda['id']}"}).json()
    assert [v["id"] for v in resposta["itens"]] == [venda["id"]]


def test_historico_busca_pelo_nome_do_cliente(api, db, cliente):
    venda = inserir_venda_direto_no_banco(db, cliente, UMA_TARDE_DE_MARCO)
    resposta = api.get("/vendas", params={"busca": cliente["nome"].lower()}).json()
    assert [v["id"] for v in resposta["itens"]] == [venda["id"]]
    assert resposta["itens"][0]["cliente_nome"] == cliente["nome"]


def test_historico_aceita_curingas_do_like_na_busca(api):
    assert api.get("/vendas", params={"busca": "100%_x"}).status_code == 200


def test_venda_as_22h30_de_brasilia_conta_no_mesmo_dia(api, db, cliente):
    dia_15_as_22h30_em_brasilia = datetime(2026, 1, 16, 1, 30, tzinfo=timezone.utc)
    venda = inserir_venda_direto_no_banco(db, cliente, dia_15_as_22h30_em_brasilia)

    def ids_no_dia(dia):
        params = {"cliente_id": cliente["id"], "data_inicio": dia, "data_fim": dia}
        return [v["id"] for v in api.get("/vendas", params=params).json()["itens"]]

    assert ids_no_dia("2026-01-15") == [venda["id"]]
    assert ids_no_dia("2026-01-16") == []


def test_historico_resume_os_itens_de_cada_venda(api, cliente, produtos):
    vender_no_atendimento(
        api,
        cliente,
        [
            {"produto_id": produtos["p13"]["id"], "quantidade": 2},
            {"produto_id": produtos["kit"]["id"], "quantidade": 1},
        ],
    )
    historico = api.get("/vendas", params={"cliente_id": cliente["id"], "periodo": "hoje"}).json()
    assert historico["itens"][0]["itens_resumo"] == [
        f"2x {produtos['p13']['nome']}",
        f"1x {produtos['kit']['nome']}",
    ]


@pytest.mark.parametrize(
    "filtro",
    [
        pytest.param({"periodo": "7d", "data_inicio": "2026-01-01"}, id="periodo-e-datas-juntos"),
        pytest.param(
            {"data_inicio": "2026-02-01", "data_fim": "2026-01-01"}, id="inicio-depois-do-fim"
        ),
    ],
)
def test_filtro_de_data_invalido_da_422(api, filtro):
    assert api.get("/vendas", params=filtro).status_code == 422
