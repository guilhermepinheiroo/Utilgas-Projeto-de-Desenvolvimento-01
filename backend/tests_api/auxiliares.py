import os
import random
import uuid
from datetime import datetime

import pytest

from app.core.normalizacao import digito_verificador

URL_DO_SUPABASE_LOCAL = os.environ.get("TEST_SUPABASE_URL")
CHAVE_SERVICE_ROLE_LOCAL = os.environ.get("TEST_SUPABASE_SERVICE_KEY")

requer_supabase_local = pytest.mark.skipif(
    not (URL_DO_SUPABASE_LOCAL and CHAVE_SERVICE_ROLE_LOCAL),
    reason="defina TEST_SUPABASE_URL e TEST_SUPABASE_SERVICE_KEY (Supabase LOCAL)",
)


def nome_unico(prefixo: str = "Teste") -> str:
    return f"{prefixo} {uuid.uuid4().hex[:10]}"


def celular_aleatorio_de_pelotas() -> str:
    return "5399" + "".join(random.choices("0123456789", k=7))


def cpf_aleatorio_valido() -> str:
    numeros = [random.randint(0, 9) for _ in range(9)]
    numeros.append(digito_verificador(numeros, pesos=range(10, 1, -1)))
    numeros.append(digito_verificador(numeros, pesos=range(11, 1, -1)))
    return "".join(map(str, numeros))


def cadastrar_cliente(api, apagar_no_fim, **campos) -> dict:
    corpo = {"nome": nome_unico("Cliente"), "telefone": celular_aleatorio_de_pelotas()}
    resposta = api.post("/clientes", json=corpo | campos)
    assert resposta.status_code == 201, resposta.text
    apagar_no_fim.clientes.append(resposta.json()["id"])
    return resposta.json()


def inserir_venda_direto_no_banco(
    db, cliente: dict, criado_em: datetime | None = None, total: float = 100, **campos
) -> dict:
    venda = {
        "cliente_id": cliente["id"],
        "origem": "portaria",
        "forma_pagamento": "dinheiro",
        "subtotal": total,
        "total": total,
        "status": "concluida",
    } | campos
    if criado_em is not None:
        venda["criado_em"] = criado_em.isoformat()
    return db.table("vendas").insert(venda).execute().data[0]
