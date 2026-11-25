import os
import uuid

import pytest

URL_DO_SUPABASE_LOCAL = os.environ.get("TEST_SUPABASE_URL")
CHAVE_SERVICE_ROLE_LOCAL = os.environ.get("TEST_SUPABASE_SERVICE_KEY")

requer_supabase_local = pytest.mark.skipif(
    not (URL_DO_SUPABASE_LOCAL and CHAVE_SERVICE_ROLE_LOCAL),
    reason="defina TEST_SUPABASE_URL e TEST_SUPABASE_SERVICE_KEY (Supabase LOCAL)",
)


def nome_unico(prefixo: str = "Teste") -> str:
    return f"{prefixo} {uuid.uuid4().hex[:10]}"
