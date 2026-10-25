"""Módulo Dashboard (somente leitura) — responsável: Back-end 2."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.core.auth import get_db
from app.core.tempo import agora
from app.dashboard.schemas import DashboardEstoque, Faturamento, VendaDiaria

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

MAX_DIAS = 366


def _periodo(inicio: date | None, fim: date | None) -> tuple[date, date]:
    """Padrão: o mês corrente até hoje."""
    hoje = agora().date()
    fim = fim or hoje
    inicio = inicio or fim.replace(day=1)
    if inicio > fim:
        raise HTTPException(422, "inicio não pode ser depois de fim")
    if (fim - inicio).days > MAX_DIAS:
        raise HTTPException(422, f"Período máximo de {MAX_DIAS} dias")
    return inicio, fim


@router.get("/faturamento", response_model=Faturamento)
def faturamento(
    inicio: date | None = Query(None, description="Padrão: dia 1 do mês"),
    fim: date | None = Query(None, description="Padrão: hoje"),
    db: Client = Depends(get_db),
):
    inicio, fim = _periodo(inicio, fim)
    linha = db.rpc(
        "dashboard_faturamento", {"p_inicio": inicio.isoformat(), "p_fim": fim.isoformat()}
    ).execute().data[0]
    return Faturamento(inicio=inicio, fim=fim, **linha)


@router.get("/vendas-diarias", response_model=list[VendaDiaria])
def vendas_diarias(
    inicio: date | None = Query(None, description="Padrão: dia 1 do mês"),
    fim: date | None = Query(None, description="Padrão: hoje"),
    db: Client = Depends(get_db),
):
    inicio, fim = _periodo(inicio, fim)
    return db.rpc(
        "dashboard_vendas_diarias", {"p_inicio": inicio.isoformat(), "p_fim": fim.isoformat()}
    ).execute().data


@router.get("/estoque", response_model=DashboardEstoque)
def estoque(db: Client = Depends(get_db)):
    produtos = (
        db.table("produtos")
        .select("preco, estoque_atual, estoque_vazio, estoque_minimo")
        .eq("ativo", True)
        .execute()
        .data
    )
    return DashboardEstoque(
        total_produtos=len(produtos),
        produtos_em_alerta=sum(1 for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]),
        total_em_estoque=sum(p["estoque_atual"] for p in produtos),
        total_vazios=sum(p["estoque_vazio"] for p in produtos),
        valor_em_estoque=round(sum(float(p["preco"]) * p["estoque_atual"] for p in produtos), 2),
    )