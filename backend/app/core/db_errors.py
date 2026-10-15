"""Tradução dos erros das funções SQL (RPC) para respostas HTTP.

As funções do banco (registrar_venda, cancelar_venda, movimentar_estoque)
levantam erros com códigos próprios:

    UG404 -> 404 (cliente, produto, venda não encontrado)
    UG409 -> 409 (estoque insuficiente, venda já cancelada, entrega já entregue)
    UG422 -> 422 (dados inválidos)

Uso:
    from app.core.db_errors import chamar_rpc
    resultado = chamar_rpc(db, "registrar_venda", {"p_dados": dados, "p_usuario_id": uid})
"""
from fastapi import HTTPException
from postgrest.exceptions import APIError

STATUS = {"UG404": 404, "UG409": 409, "UG422": 422}


def chamar_rpc(db, funcao: str, params: dict):
    """Chama uma função SQL via supabase-py e converte erros UGxxx em HTTPException."""
    try:
        return db.rpc(funcao, params).execute().data
    except APIError as e:
        if e.code in STATUS:
            raise HTTPException(STATUS[e.code], e.message) from e
        raise
