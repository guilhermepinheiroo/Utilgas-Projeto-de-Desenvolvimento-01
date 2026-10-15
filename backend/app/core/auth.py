from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.core.config import settings

bearer = HTTPBearer()


@lru_cache
def get_db() -> Client:
    """Cliente Supabase com a service role key (acesso total, só no servidor)."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Client = Depends(get_db),
) -> dict:
    """Valida o token do Supabase Auth e devolve o perfil do usuário."""
    try:
        user = db.auth.get_user(cred.credentials).user
    except Exception:
        user = None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido ou expirado")

    rows = db.table("perfis").select("*").eq("id", user.id).limit(1).execute().data
    if not rows or not rows[0]["ativo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Usuário sem perfil ativo")
    return rows[0]


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["papel"] != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas administradores")
    return user
