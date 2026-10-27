"""Login via Supabase Auth."""
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.auth.schemas import LoginIn, RefreshIn, SessaoOut
from app.core.auth import get_db
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


def _gotrue(grant_type: str, corpo: dict) -> dict:
    """Chama o endpoint /auth/v1/token do Supabase Auth."""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(500, "SUPABASE_URL e SUPABASE_SERVICE_KEY não configurados no .env")
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/token"
    try:
        resp = httpx.post(
            url,
            params={"grant_type": grant_type},
            json=corpo,
            headers={"apikey": settings.supabase_service_key},
            timeout=15,
        )
    except httpx.HTTPError as e:
        raise HTTPException(503, "Não foi possível falar com o Supabase Auth") from e
    if resp.status_code >= 400:
        if grant_type == "password":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha inválidos")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada. Entre novamente.")
    return resp.json()


def _sessao(dados: dict, db: Client) -> SessaoOut:
    user_id = (dados.get("user") or {}).get("id")
    rows = db.table("perfis").select("*").eq("id", user_id).limit(1).execute().data
    if not rows or not rows[0]["ativo"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Usuário sem perfil ativo. Peça a um administrador para liberar seu acesso.",
        )
    perfil = rows[0]
    return SessaoOut(
        access_token=dados["access_token"],
        refresh_token=dados["refresh_token"],
        expires_at=dados.get("expires_at"),
        usuario={"id": perfil["id"], "nome": perfil["nome"], "papel": perfil["papel"]},
    )


@router.post("/login", response_model=SessaoOut)
def login(dados: LoginIn, db: Client = Depends(get_db)):
    resposta = _gotrue("password", {"email": dados.email.strip(), "password": dados.senha})
    return _sessao(resposta, db)


@router.post("/refresh", response_model=SessaoOut)
def renovar(dados: RefreshIn, db: Client = Depends(get_db)):
    resposta = _gotrue("refresh_token", {"refresh_token": dados.refresh_token})
    return _sessao(resposta, db)
