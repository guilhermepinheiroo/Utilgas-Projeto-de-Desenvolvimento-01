from datetime import date

import pytest

from app.core.tempo import data_local, inicio_do_dia


@pytest.mark.parametrize(
    "momento_em_utc, dia_em_brasilia",
    [
        pytest.param("2026-10-15T23:30:00+00:00", date(2026, 10, 15), id="20h30"),
        pytest.param("2026-10-16T01:30:00+00:00", date(2026, 10, 15), id="22h30-ainda-e-dia-15"),
        pytest.param("2026-10-16T03:00:00.123456+00:00", date(2026, 10, 16), id="meia-noite"),
    ],
)
def test_data_local_usa_horario_de_brasilia(momento_em_utc, dia_em_brasilia):
    assert data_local(momento_em_utc) == dia_em_brasilia


def test_data_local_recusa_horario_sem_fuso():
    with pytest.raises(ValueError):
        data_local("2026-10-16T01:30:00")


def test_inicio_do_dia_e_meia_noite_em_brasilia():
    assert inicio_do_dia(date(2026, 10, 20)).isoformat() == "2026-10-20T00:00:00-03:00"
