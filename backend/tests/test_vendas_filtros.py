from datetime import date, datetime

import pytest
from fastapi import HTTPException

from app.core.tempo import FUSO
from app.vendas.filtros import interpretar_busca, intervalo_do_filtro

HOJE = date(2026, 10, 20)
AMANHA = date(2026, 10, 21)


def meia_noite(dia: date) -> datetime:
    return datetime(dia.year, dia.month, dia.day, tzinfo=FUSO)


@pytest.mark.parametrize(
    "periodo, primeiro_dia",
    [
        pytest.param("hoje", date(2026, 10, 20), id="hoje"),
        pytest.param("7d", date(2026, 10, 14), id="hoje-e-os-6-dias-anteriores"),
        pytest.param("30d", date(2026, 9, 21), id="hoje-e-os-29-dias-anteriores"),
    ],
)
def test_periodo_vai_ate_o_fim_de_hoje(periodo, primeiro_dia):
    assert intervalo_do_filtro(periodo, None, None, HOJE) == (
        meia_noite(primeiro_dia),
        meia_noite(AMANHA),
    )


def test_periodo_em_horario_de_brasilia():
    inicio, fim = intervalo_do_filtro("hoje", None, None, HOJE)
    assert inicio.isoformat() == "2026-10-20T00:00:00-03:00"
    assert fim.isoformat() == "2026-10-21T00:00:00-03:00"


def test_data_fim_inclui_o_dia_inteiro():
    dia = date(2026, 10, 1)
    assert intervalo_do_filtro(None, dia, dia, HOJE) == (
        meia_noite(dia),
        meia_noite(date(2026, 10, 2)),
    )


def test_so_data_inicio_deixa_o_fim_aberto():
    assert intervalo_do_filtro(None, date(2026, 10, 1), None, HOJE) == (
        meia_noite(date(2026, 10, 1)),
        None,
    )


def test_sem_filtro_de_data_nao_limita_o_periodo():
    assert intervalo_do_filtro(None, None, None, HOJE) == (None, None)


@pytest.mark.parametrize(
    "periodo, data_inicio, data_fim",
    [
        pytest.param("7d", date(2026, 10, 1), None, id="periodo-e-datas-juntos"),
        pytest.param(None, date(2026, 10, 2), date(2026, 10, 1), id="inicio-depois-do-fim"),
    ],
)
def test_filtro_de_data_invalido_da_422(periodo, data_inicio, data_fim):
    with pytest.raises(HTTPException) as erro:
        intervalo_do_filtro(periodo, data_inicio, data_fim, HOJE)
    assert erro.value.status_code == 422


@pytest.mark.parametrize(
    "busca, esperado",
    [
        pytest.param("123", (123, None), id="numero-do-pedido"),
        pytest.param("#123", (123, None), id="numero-com-cerquilha"),
        pytest.param(" # 45 ", (45, None), id="numero-com-espacos"),
        pytest.param("Maria", (None, "Maria"), id="nome"),
        pytest.param("Maria 2", (None, "Maria 2"), id="nome-com-numero"),
        pytest.param("", (None, None), id="vazio"),
        pytest.param(None, (None, None), id="nulo"),
        pytest.param("1" * 19, (None, "1" * 19), id="numero-maior-que-bigint-vira-nome"),
        pytest.param("²", (None, "²"), id="digito-unicode-vira-nome"),
    ],
)
def test_interpretar_busca(busca, esperado):
    assert interpretar_busca(busca) == esperado
