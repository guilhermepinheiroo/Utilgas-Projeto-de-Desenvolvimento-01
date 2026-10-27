from pydantic import BaseModel


class LoginIn(BaseModel):
    email: str
    senha: str


class RefreshIn(BaseModel):
    refresh_token: str


class Usuario(BaseModel):
    id: str
    nome: str
    papel: str


class SessaoOut(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int | None = None
    usuario: Usuario
