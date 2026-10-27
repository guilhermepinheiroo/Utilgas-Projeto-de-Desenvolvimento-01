"""Módulo Dashboard (somente leitura) — responsável: Back-end 2."""
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.core.auth import get_db
from app.core.tempo import FUSO, agora, inicio_do_mes, meia_noite, para_iso_utc
from app.dashboard.schemas import (
    DashboardEstoque,
    EstoqueMensal,
    EstoqueResumoProduto,
    Faturamento,
    PontoVendasCategoria,
    SerieEstoque,
    VendaDiaria,
)

MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]


def _local(valor: str) -> datetime:
    return datetime.fromisoformat(valor.replace("Z", "+00:00")).astimezone(FUSO)

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


@router.get("/vendas-por-categoria", response_model=list[PontoVendasCategoria])
def vendas_por_categoria(
    periodo: Literal["hoje", "7dias", "30dias"] = "hoje",
    db: Client = Depends(get_db),
):
    """Hoje: por hora. 7/30 dias: por dia."""
    hoje = agora().date()
    dias = {"hoje": 1, "7dias": 7, "30dias": 30}[periodo]
    inicio = hoje - timedelta(days=dias - 1)
    vendas = (
        db.table("vendas")
        .select("criado_em, itens_venda(quantidade, produtos(categoria))")
        .neq("status", "cancelada")
        .gte("criado_em", para_iso_utc(meia_noite(inicio)))
        .limit(10000)
        .execute()
        .data
    )

    if periodo == "hoje":
        rotulos = [f"{h:02d}h" for h in range(8, 22)]
    else:
        rotulos = [(inicio + timedelta(days=i)).strftime("%d/%m") for i in range(dias)]
    pontos = {r: {"rotulo": r, "botijao": 0, "agua": 0} for r in rotulos}

    for v in vendas:
        quando = _local(v["criado_em"])
        rotulo = f"{quando.hour:02d}h" if periodo == "hoje" else quando.strftime("%d/%m")
        if rotulo not in pontos:
            continue
        for item in v.get("itens_venda") or []:
            categoria = (item.get("produtos") or {}).get("categoria")
            chave = {"gas": "botijao", "agua": "agua"}.get(categoria)
            if chave:
                pontos[rotulo][chave] += item["quantidade"]
    return list(pontos.values())


def _net_cheios(movs: list[dict]) -> int:
    return sum(m["quantidade"] if m["tipo"] == "entrada" else -m["quantidade"] for m in movs)


@router.get("/estoque-resumo", response_model=EstoqueResumoProduto)
def estoque_resumo(produto_id: int | None = None, db: Client = Depends(get_db)):

    q = db.table("produtos").select("id, estoque_atual").eq("ativo", True)
    if produto_id is not None:
        q = q.eq("id", produto_id)
    produtos = q.execute().data
    if produto_id is not None and not produtos:
        raise HTTPException(404, "Produto não encontrado")
    atual = sum(p["estoque_atual"] for p in produtos)

    m = (
        db.table("movimentacoes_estoque")
        .select("tipo, quantidade")
        .eq("tipo_estoque", "cheio")
        .gte("criado_em", para_iso_utc(inicio_do_mes()))
    )
    if produto_id is not None:
        m = m.eq("produto_id", produto_id)
    else:
        m = m.in_("produto_id", [p["id"] for p in produtos] or [0])
    inicio_mes = atual - _net_cheios(m.limit(10000).execute().data)
    variacao = round((atual - inicio_mes) / inicio_mes * 100, 1) if inicio_mes > 0 else None
    return EstoqueResumoProduto(quantidade=atual, variacao_mensal_pct=variacao)


@router.get("/estoque-mensal", response_model=EstoqueMensal)
def estoque_mensal(
    categoria: Literal["gas", "agua", "acessorio"] = "gas",
    db: Client = Depends(get_db),
):
    """Saldo de cheios no fim de cada mês (últimos 12)."""
    produtos = (
        db.table("produtos")
        .select("id, nome, estoque_atual")
        .eq("ativo", True)
        .eq("categoria", categoria)
        .order("nome")
        .execute()
        .data
    )
    hoje = agora()
    meses: list[tuple[int, int]] = []
    ano, mes = hoje.year, hoje.month
    for _ in range(12):
        meses.append((ano, mes))
        ano, mes = (ano - 1, 12) if mes == 1 else (ano, mes - 1)
    meses.reverse()

    primeiro = meia_noite(date(meses[0][0], meses[0][1], 1))
    movs = []
    if produtos:
        movs = (
            db.table("movimentacoes_estoque")
            .select("produto_id, tipo, quantidade, criado_em")
            .eq("tipo_estoque", "cheio")
            .in_("produto_id", [p["id"] for p in produtos])
            .gte("criado_em", para_iso_utc(primeiro))
            .limit(50000)
            .execute()
            .data
        )

    pontos = []
    for ano, mes in meses:
        proximo = date(ano + 1, 1, 1) if mes == 12 else date(ano, mes + 1, 1)
        fim_mes = meia_noite(proximo)
        ponto: dict = {"rotulo": MESES[mes - 1]}
        for p in produtos:
            depois = [
                m for m in movs if m["produto_id"] == p["id"] and _local(m["criado_em"]) >= fim_mes
            ]
            ponto[f"p{p['id']}"] = max(0, p["estoque_atual"] - _net_cheios(depois))
        pontos.append(ponto)

    return EstoqueMensal(
        series=[SerieEstoque(chave=f"p{p['id']}", nome=p["nome"]) for p in produtos],
        pontos=pontos,
    )
