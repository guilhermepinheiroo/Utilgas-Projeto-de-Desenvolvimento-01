"""Teste do trigger que cria perfis para novos usuários (Supabase LOCAL)."""
import os
import uuid

import pytest

try:
    import psycopg
    from psycopg.types.json import Jsonb
except ImportError:
    pytest.skip('instale: pip install "psycopg[binary]"', allow_module_level=True)

DB_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="defina TEST_DATABASE_URL (banco LOCAL)")


@pytest.mark.parametrize(
    ("metadata", "email", "nome"),
    [
        ({"nome": "Operador de teste"}, "teste-nome@example.com", "Operador de teste"),
        ({"full_name": "Nome do provedor"}, "teste-full-name@example.com", "Nome do provedor"),
        ({}, "fallback-nome@example.com", "fallback-nome"),
    ],
)
def test_novo_usuario_recebe_perfil_ativo(metadata, email, nome):
    user_id = uuid.uuid4()
    email = f"{user_id.hex}-{email}"

    with psycopg.connect(DB_URL) as con:
        con.execute(
            """
            insert into auth.users (
              id, aud, role, email, encrypted_password, email_confirmed_at,
              raw_app_meta_data, raw_user_meta_data
            )
            values (%s, 'authenticated', 'authenticated', %s, '', now(), %s, %s)
            """,
            (
                user_id,
                email,
                Jsonb({"provider": "email", "providers": ["email"]}),
                Jsonb(metadata),
            ),
        )

        perfil = con.execute(
            "select nome, papel, ativo from public.perfis where id = %s",
            (user_id,),
        ).fetchone()
        assert perfil == (nome, "operador", True)

        con.execute("delete from auth.users where id = %s", (user_id,))
