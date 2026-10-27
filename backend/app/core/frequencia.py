"""Frequência de compra do cliente, calculada a partir do histórico de vendas."""
from datetime import date, datetime

from supabase import Client

from app.core.tempo import FUSO, agora

JANELA_CONTATO_DIAS = 3


def dia_local(valor: str | datetime) -> date:
    """Timestamp do banco (UTC) -> data no fuso de Brasília."""
    if isinstance(valor, str):
        valor = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    return valor.astimezone(FUSO).date()


def datas_de_compra(db: Client, cliente_id: int) -> list[date]:
    """Dias (sem repetição, em ordem) em que o cliente comprou. Canceladas não contam."""
    rows = (
        db.table("vendas")
        .select("criado_em")
        .eq("cliente_id", cliente_id)
        .neq("status", "cancelada")
        .order("criado_em")
        .execute()
        .data
    )
    return sorted({dia_local(r["criado_em"]) for r in rows})


def frequencia_media(datas: list[date]) -> int | None:
    """Média de dias entre compras. Precisa de ao menos duas compras."""
    if len(datas) < 2:
        return None
    intervalos = [(b - a).days for a, b in zip(datas, datas[1:], strict=False)]
    return round(sum(intervalos) / len(intervalos))


def indicadores(datas: list[date], total_pedidos: int | None = None) -> dict:
    hoje = agora().date()
    ultima = datas[-1] if datas else None
    freq = frequencia_media(datas)
    dias_desde = (hoje - ultima).days if ultima else None
    recompra = freq - dias_desde if freq is not None and dias_desde is not None else None
    return {
        "total_pedidos": total_pedidos if total_pedidos is not None else len(datas),
        "ultima_compra": ultima,
        "dias_desde_ultima_compra": dias_desde,
        "frequencia_media_dias": freq,
        "recompra_prevista_em_dias": recompra,
    }
