import re
from datetime import date, datetime, timedelta

from fastapi import HTTPException

from app.core.tempo import inicio_do_dia

DIAS_DO_PERIODO = {"hoje": 1, "7d": 7, "30d": 30}


def intervalo_do_filtro(
    periodo: str | None, data_inicio: date | None, data_fim: date | None, hoje: date
) -> tuple[datetime | None, datetime | None]:
    if periodo and (data_inicio or data_fim):
        raise HTTPException(422, "Use o período OU as datas, não os dois")
    if periodo:
        data_inicio = hoje - timedelta(days=DIAS_DO_PERIODO[periodo] - 1)
        data_fim = hoje
    if data_inicio and data_fim and data_inicio > data_fim:
        raise HTTPException(422, "data_inicio é depois de data_fim")
    inicio = inicio_do_dia(data_inicio) if data_inicio else None
    fim_exclusivo = inicio_do_dia(data_fim + timedelta(days=1)) if data_fim else None
    return inicio, fim_exclusivo


def interpretar_busca(busca: str | None) -> tuple[int | None, str | None]:
    termo = (busca or "").strip()
    if not termo:
        return None, None
    numero_do_pedido = termo.removeprefix("#").strip()
    if re.fullmatch(r"[0-9]{1,18}", numero_do_pedido):
        return int(numero_do_pedido), None
    return None, termo
