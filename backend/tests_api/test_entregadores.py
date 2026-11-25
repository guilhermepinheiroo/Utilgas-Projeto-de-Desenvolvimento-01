from tests_api.auxiliares import nome_unico, requer_supabase_local

pytestmark = requer_supabase_local


def cadastrar(api, apagar_no_fim, **campos) -> dict:
    resposta = api.post("/entregadores", json={"nome": nome_unico("Entregador")} | campos)
    assert resposta.status_code == 201, resposta.text
    apagar_no_fim.entregadores.append(resposta.json()["id"])
    return resposta.json()


def entrega_pendente_para(db, apagar_no_fim, entregador_id: int) -> dict:
    venda = {"origem": "portaria", "forma_pagamento": "pix", "subtotal": 0, "total": 0}
    venda_id = db.table("vendas").insert(venda).execute().data[0]["id"]
    apagar_no_fim.vendas.append(venda_id)
    entrega = {"venda_id": venda_id, "entregador_id": entregador_id}
    return db.table("entregas").insert(entrega).execute().data[0]


def test_cadastro_grava_telefone_fixo_so_com_digitos(api, apagar_no_fim):
    entregador = cadastrar(api, apagar_no_fim, telefone="(53) 3222-1234")
    assert entregador["telefone"] == "5332221234"
    assert entregador["ativo"] is True


def test_consultar_e_entregador_inexistente(api, apagar_no_fim):
    entregador = cadastrar(api, apagar_no_fim)
    assert api.get(f"/entregadores/{entregador['id']}").json()["nome"] == entregador["nome"]
    assert api.get("/entregadores/999999999").status_code == 404


def test_editar_nome_e_apagar_telefone(api, apagar_no_fim):
    entregador = cadastrar(api, apagar_no_fim, telefone="53988124477")
    novo_nome = nome_unico("Editado")
    resposta = api.patch(
        f"/entregadores/{entregador['id']}", json={"nome": novo_nome, "telefone": None}
    )
    assert resposta.status_code == 200, resposta.text
    assert (resposta.json()["nome"], resposta.json()["telefone"]) == (novo_nome, None)


def test_desativar_e_reativar_mudam_a_listagem(api, apagar_no_fim):
    entregador = cadastrar(api, apagar_no_fim)
    rota = f"/entregadores/{entregador['id']}"

    assert api.patch(rota, json={"ativo": False}).json()["ativo"] is False
    inativos = [e["id"] for e in api.get("/entregadores", params={"ativo": "false"}).json()]
    ativos = [e["id"] for e in api.get("/entregadores").json()]
    assert entregador["id"] in inativos and entregador["id"] not in ativos

    assert api.patch(rota, json={"ativo": True}).json()["ativo"] is True
    assert entregador["id"] in [e["id"] for e in api.get("/entregadores").json()]


def test_entregador_com_entrega_pendente_nao_pode_ser_desativado(api, db, apagar_no_fim):
    entregador = cadastrar(api, apagar_no_fim)
    entrega_pendente_para(db, apagar_no_fim, entregador["id"])

    resposta = api.patch(f"/entregadores/{entregador['id']}", json={"ativo": False})
    assert resposta.status_code == 409
    assert api.get(f"/entregadores/{entregador['id']}").json()["ativo"] is True


def test_entregador_desativado_nao_pode_receber_entrega(api, db, apagar_no_fim):
    entregador = cadastrar(api, apagar_no_fim)
    api.patch(f"/entregadores/{entregador['id']}", json={"ativo": False})
    outro = cadastrar(api, apagar_no_fim)
    entrega = entrega_pendente_para(db, apagar_no_fim, outro["id"])

    resposta = api.patch(f"/entregas/{entrega['id']}", json={"entregador_id": entregador["id"]})
    assert resposta.status_code == 422
