from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.clientes.router import router as clientes_router
from app.core.auth import get_current_user
from app.core.config import settings
from app.entregas.router import entregadores_router, regioes_router
from app.entregas.router import router as entregas_router
from app.produtos.router import estoque_router
from app.produtos.router import router as produtos_router
from app.vendas.router import router as vendas_router

app = FastAPI(
    title="UtilGás API",
    version="0.1.0",
    description="API do sistema de gerenciamento da revenda de gás. "
    "Rotas com 501 ainda estão sem implementação (contrato).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}


@app.get("/me", tags=["Auth"])
def me(user: dict = Depends(get_current_user)):
    """Perfil do usuário logado (nome, papel)."""
    return {"id": user["id"], "nome": user["nome"], "papel": user["papel"]}


# Todas as rotas abaixo exigem usuário autenticado.
protegido = [Depends(get_current_user)]
for r in (
    clientes_router,
    vendas_router,
    produtos_router,
    estoque_router,
    entregas_router,
    entregadores_router,
    regioes_router,
):
    app.include_router(r, dependencies=protegido)
