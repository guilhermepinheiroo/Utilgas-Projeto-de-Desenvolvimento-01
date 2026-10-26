from datetime import datetime, timedelta, timezone

from app.clientes.indicadores import VENDAS_LIDAS_PARA_INDICADORES
from tests_api.auxiliares import (
    cadastrar_cliente,
    celular_aleatorio_de_pelotas,
    cpf_aleatorio_valido,
    inserir_venda_direto_no_banco,
    nome_unico,
    requer_supabase_local,
)

pytestmark = requer_supabase_local


def com_mascara(telefone: str) -> str:
    return f"({telefone[:2]}) {telefone[2:7]}-{telefone[7:]}"


def test_cadastro_grava_telefone_so_com_digitos_e_traz_enderecos(api, apagar_no_fim, regiao):
    telefone = celular_aleatorio_de_pelotas()
    cliente = cadastrar_cliente(
        api,
        apagar_no_fim,
        telefone=com_mascara(telefone),
        enderecos=[
            {"endereco": "Rua A, 1", "regiao_id": regiao["id"]},
            {"endereco": "Rua B, 2", "cep": "96077520"},
        ],
    )
    assert cliente["telefone"] == telefone
    assert [e["endereco"] for e in cliente["enderecos"]] == ["Rua A, 1", "Rua B, 2"]
    assert cliente["enderecos"][0]["regiao_nome"] == regiao["nome"]
    assert cliente["enderecos"][0]["taxa_entrega"] == 7.5
    assert cliente["enderecos"][1]["cep"] == "96077-520"
    assert cliente["indicadores"]["total_pedidos"] == 0


def test_sem_principal_marcado_o_primeiro_endereco_do_cadastro_vira_principal(api, apagar_no_fim):
    cliente = cadastrar_cliente(
        api, apagar_no_fim, enderecos=[{"endereco": "Rua A"}, {"endereco": "Rua B"}]
    )
    assert [e["principal"] for e in cliente["enderecos"]] == [True, False]


def test_busca_por_telefone_aceita_outro_formato_do_mesmo_numero(api, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim)
    resposta = api.get(f"/clientes/por-telefone/+55{cliente['telefone']}")
    assert resposta.status_code == 200
    assert resposta.json()["id"] == cliente["id"]


def test_busca_por_telefone_desconhecido_da_404(api):
    assert api.get(f"/clientes/por-telefone/{celular_aleatorio_de_pelotas()}").status_code == 404


def test_busca_por_telefone_invalido_da_422(api):
    assert api.get("/clientes/por-telefone/123").status_code == 422


def test_telefone_duplicado_da_409_dizendo_quem_ja_usa(api, apagar_no_fim):
    existente = cadastrar_cliente(api, apagar_no_fim)
    resposta = api.post("/clientes", json={"nome": "Outro", "telefone": existente["telefone"]})
    assert resposta.status_code == 409
    assert existente["nome"] in resposta.json()["detail"]


def test_cpf_duplicado_da_409(api, apagar_no_fim):
    cpf = cpf_aleatorio_valido()
    cadastrar_cliente(api, apagar_no_fim, cpf_cnpj=cpf)
    resposta = api.post(
        "/clientes",
        json={"nome": "Outro", "telefone": celular_aleatorio_de_pelotas(), "cpf_cnpj": cpf},
    )
    assert resposta.status_code == 409


def test_regiao_invalida_recusa_o_cadastro_inteiro(api):
    telefone = celular_aleatorio_de_pelotas()
    resposta = api.post(
        "/clientes",
        json={
            "nome": "X",
            "telefone": telefone,
            "enderecos": [{"endereco": "Rua A", "regiao_id": 999999}],
        },
    )
    assert resposta.status_code == 422
    assert api.get(f"/clientes/por-telefone/{telefone}").status_code == 404


def test_atualizacao_altera_so_os_campos_enviados(api, apagar_no_fim):
    cliente = cadastrar_cliente(
        api, apagar_no_fim, email="a@b.com", cpf_cnpj=cpf_aleatorio_valido()
    )
    novo_telefone = celular_aleatorio_de_pelotas()

    resposta = api.put(
        f"/clientes/{cliente['id']}",
        json={"telefone": com_mascara(novo_telefone), "cpf_cnpj": None},
    )
    assert resposta.status_code == 200, resposta.text
    atualizado = resposta.json()
    assert atualizado["telefone"] == novo_telefone
    assert atualizado["cpf_cnpj"] is None
    assert atualizado["email"] == "a@b.com"
    assert atualizado["nome"] == cliente["nome"]


def test_atualizar_para_telefone_de_outro_cliente_da_409(api, apagar_no_fim):
    primeiro = cadastrar_cliente(api, apagar_no_fim)
    segundo = cadastrar_cliente(api, apagar_no_fim)
    resposta = api.put(f"/clientes/{segundo['id']}", json={"telefone": primeiro["telefone"]})
    assert resposta.status_code == 409
    assert primeiro["nome"] in resposta.json()["detail"]


def test_reenviar_o_proprio_telefone_nao_e_duplicidade(api, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim)
    resposta = api.put(f"/clientes/{cliente['id']}", json={"telefone": cliente["telefone"]})
    assert resposta.status_code == 200


def test_cliente_inexistente_da_404(api):
    assert api.put("/clientes/999999999", json={"nome": "X"}).status_code == 404
    assert api.get("/clientes/999999999").status_code == 404


def test_listagem_em_ordem_alfabetica_e_paginada(api, apagar_no_fim):
    nome = nome_unico()
    for letra in "CAB":
        cadastrar_cliente(api, apagar_no_fim, nome=f"{nome} {letra}")

    primeira_pagina = api.get("/clientes", params={"busca": nome.lower(), "tamanho": 2}).json()
    assert primeira_pagina["total"] == 3
    assert [c["nome"] for c in primeira_pagina["itens"]] == [f"{nome} A", f"{nome} B"]

    segunda_pagina = api.get("/clientes", params={"busca": nome, "tamanho": 2, "pagina": 2})
    assert [c["nome"] for c in segunda_pagina.json()["itens"]] == [f"{nome} C"]


def test_pagina_alem_do_fim_vem_vazia_com_o_total(api, apagar_no_fim):
    nome = nome_unico()
    cadastrar_cliente(api, apagar_no_fim, nome=nome)
    resposta = api.get("/clientes", params={"busca": nome, "tamanho": 2, "pagina": 9})
    assert resposta.status_code == 200
    assert resposta.json() == {"itens": [], "total": 1, "pagina": 9, "tamanho": 2}


def test_busca_por_parte_do_telefone_com_mascara(api, apagar_no_fim):
    telefone = cadastrar_cliente(api, apagar_no_fim)["telefone"]
    resposta = api.get("/clientes", params={"busca": f"{telefone[2:7]}-{telefone[7:]}"})
    assert [c["telefone"] for c in resposta.json()["itens"]] == [telefone]


def test_busca_com_caracteres_especiais_nao_quebra(api):
    for termo in ['a,b(c)', 'x"y', "50%", "o'brien", "a\\b", "nome.ilike.*"]:
        resposta = api.get("/clientes", params={"busca": termo})
        assert resposta.status_code == 200, (termo, resposta.text)


def test_porcento_e_sublinhado_na_busca_sao_texto_e_nao_curinga(api, apagar_no_fim):
    nome = nome_unico()
    cadastrar_cliente(api, apagar_no_fim, nome=f"{nome} Silva")
    assert api.get("/clientes", params={"busca": "%"}).json()["total"] == 0
    assert api.get("/clientes", params={"busca": f"{nome} Silv_"}).json()["total"] == 0


def test_filtro_por_status(api, apagar_no_fim):
    nome = nome_unico()
    cadastrar_cliente(api, apagar_no_fim, nome=f"{nome} ativo")
    cadastrar_cliente(api, apagar_no_fim, nome=f"{nome} inativo", status="inativo")
    resposta = api.get("/clientes", params={"busca": nome, "status": "inativo"})
    assert [c["nome"] for c in resposta.json()["itens"]] == [f"{nome} inativo"]


def test_novo_endereco_principal_desmarca_o_anterior(api, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim, enderecos=[{"endereco": "Rua A, 1"}])
    anterior = cliente["enderecos"][0]

    resposta = api.post(
        f"/clientes/{cliente['id']}/enderecos", json={"endereco": "Rua B, 2", "principal": True}
    )
    assert resposta.status_code == 201, resposta.text
    novo = resposta.json()

    enderecos = api.get(f"/clientes/{cliente['id']}").json()["enderecos"]
    assert [(e["id"], e["principal"]) for e in enderecos] == [
        (novo["id"], True),
        (anterior["id"], False),
    ]


def test_put_sem_o_campo_principal_mantem_o_valor_atual(api, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim, enderecos=[{"endereco": "Rua A"}])
    principal = cliente["enderecos"][0]
    rota = f"/clientes/{cliente['id']}/enderecos/{principal['id']}"
    assert api.put(rota, json={"endereco": "Rua A, 20"}).json()["principal"] is True


def test_desmarcar_o_principal_direto_da_422(api, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim, enderecos=[{"endereco": "Rua A"}])
    principal = cliente["enderecos"][0]
    rota = f"/clientes/{cliente['id']}/enderecos/{principal['id']}"
    assert api.put(rota, json={"endereco": "Rua A", "principal": False}).status_code == 422


def test_primeiro_endereco_vira_principal_mesmo_sem_pedir(api, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim)
    resposta = api.post(
        f"/clientes/{cliente['id']}/enderecos", json={"endereco": "Rua A", "principal": False}
    )
    assert resposta.json()["principal"] is True


def test_remover_o_principal_promove_o_endereco_mais_recente(api, apagar_no_fim):
    cliente = cadastrar_cliente(
        api, apagar_no_fim, enderecos=[{"endereco": "Rua A"}, {"endereco": "Rua B"}]
    )
    principal, outro = cliente["enderecos"]
    rota = f"/clientes/{cliente['id']}/enderecos"
    mais_recente = api.post(rota, json={"endereco": "Rua C"}).json()

    assert api.delete(f"{rota}/{principal['id']}").status_code == 204
    enderecos = api.get(f"/clientes/{cliente['id']}").json()["enderecos"]
    assert [(e["id"], e["principal"]) for e in enderecos] == [
        (mais_recente["id"], True),
        (outro["id"], False),
    ]


def test_endereco_de_outro_cliente_da_404(api, apagar_no_fim):
    dono = cadastrar_cliente(api, apagar_no_fim, enderecos=[{"endereco": "Rua A"}])
    outro = cadastrar_cliente(api, apagar_no_fim)
    rota = f"/clientes/{outro['id']}/enderecos/{dono['enderecos'][0]['id']}"
    assert api.put(rota, json={"endereco": "X"}).status_code == 404
    assert api.delete(rota).status_code == 404


def test_endereco_para_cliente_inexistente_da_404(api):
    resposta = api.post("/clientes/999999999/enderecos", json={"endereco": "X"})
    assert resposta.status_code == 404


def test_endereco_usado_em_entrega_nao_pode_ser_removido(api, db, apagar_no_fim):
    cliente = cadastrar_cliente(
        api, apagar_no_fim, enderecos=[{"endereco": "Rua A"}, {"endereco": "Rua B"}]
    )
    usado = cliente["enderecos"][1]
    venda = inserir_venda_direto_no_banco(db, cliente, origem="atendimento")
    db.table("entregas").insert({"venda_id": venda["id"], "endereco_id": usado["id"]}).execute()

    resposta = api.delete(f"/clientes/{cliente['id']}/enderecos/{usado['id']}")
    assert resposta.status_code == 409
    assert len(api.get(f"/clientes/{cliente['id']}").json()["enderecos"]) == 2


def test_indicadores_e_ultima_compra_ignoram_vendas_canceladas(api, db, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim)
    agora = datetime.now(timezone.utc)
    for dias in (66, 38, 10):
        inserir_venda_direto_no_banco(db, cliente, agora - timedelta(days=dias))
    inserir_venda_direto_no_banco(db, cliente, agora - timedelta(days=1), status="cancelada")

    indicadores = api.get(f"/clientes/{cliente['id']}").json()["indicadores"]
    assert indicadores["total_pedidos"] == 3
    assert indicadores["dias_desde_ultima_compra"] == 10
    assert indicadores["frequencia_media_dias"] == 28
    assert indicadores["recompra_prevista_em_dias"] == 18

    linha = api.get("/clientes", params={"busca": cliente["nome"]}).json()["itens"][0]
    assert linha["ultima_compra"] == indicadores["ultima_compra"]


def test_cliente_com_mais_compras_do_que_as_lidas_tem_o_total_exato(api, db, apagar_no_fim):
    cliente = cadastrar_cliente(api, apagar_no_fim)
    quantidade = VENDAS_LIDAS_PARA_INDICADORES + 1
    vendas = [
        {
            "cliente_id": cliente["id"],
            "origem": "portaria",
            "forma_pagamento": "pix",
            "subtotal": 10,
            "total": 10,
        }
        for _ in range(quantidade)
    ]
    db.table("vendas").insert(vendas).execute()

    indicadores = api.get(f"/clientes/{cliente['id']}").json()["indicadores"]
    assert indicadores["total_pedidos"] == quantidade
