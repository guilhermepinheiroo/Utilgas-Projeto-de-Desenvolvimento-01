from datetime import date, datetime, time
from zoneinfo import ZoneInfo

FUSO_DE_BRASILIA = ZoneInfo("America/Sao_Paulo")


def hoje() -> date:
    return datetime.now(FUSO_DE_BRASILIA).date()


def inicio_do_dia(dia: date) -> datetime:
    return datetime.combine(dia, time.min, FUSO_DE_BRASILIA)


def data_local(momento: str) -> date:
    instante = datetime.fromisoformat(momento)
    if instante.tzinfo is None:
        raise ValueError("timestamp sem fuso horário")
    return instante.astimezone(FUSO_DE_BRASILIA).date()
