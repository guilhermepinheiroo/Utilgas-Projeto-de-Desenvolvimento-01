"""Datas no fuso da revenda.

O Supabase guarda timestamps em UTC. "Hoje" e "este mês" precisam ser
calculados no horário de Brasília, senão uma venda das 22h cai no dia seguinte.
"""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")


def agora() -> datetime:
    return datetime.now(FUSO)


def hoje() -> date:
    return agora().date()


def inicio_do_dia(dias_atras: int = 0) -> datetime:
    base = agora().replace(hour=0, minute=0, second=0, microsecond=0)
    return base - timedelta(days=dias_atras)


def inicio_do_mes() -> datetime:
    return agora().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def meia_noite_de(dia: date) -> datetime:
    return datetime.combine(dia, time.min, FUSO)


def para_iso_utc(dt: datetime) -> str:
  
    return dt.astimezone(timezone.utc).isoformat()


def data_local(momento: str) -> date:
    instante = datetime.fromisoformat(momento)
    if instante.tzinfo is None:
        raise ValueError("timestamp sem fuso horário")
    return instante.astimezone(FUSO).date()
