from datetime import datetime

from pydantic import BaseModel, Field


class OpcaoDeCartaoCreate(BaseModel):
    nome: str = Field(max_length=60, examples=["Stone"])


class OpcaoDeCartaoUpdate(BaseModel):
    """PATCH parcial: só os campos enviados mudam.

    ativo=false desativa (não apaga: as vendas antigas continuam ligadas a ela).
    """

    nome: str | None = Field(None, max_length=60)
    ativo: bool | None = None


class OpcaoDeCartaoOut(BaseModel):
    id: int
    nome: str
    ativo: bool
    criado_em: datetime
