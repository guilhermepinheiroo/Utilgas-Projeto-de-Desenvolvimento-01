import math
from collections.abc import Iterable
from datetime import date

from app.clientes.schemas import IndicadoresCliente
from app.vendas.schemas import FrequenciaRecalculada

INTERVALOS_CONSIDERADOS = 5
VENDAS_LIDAS_PARA_INDICADORES = 60
JANELA_DE_CONTATO_EM_DIAS = 3


def frequencia_media(datas_de_compra: Iterable[date]) -> int | None:
    dias_de_compra = sorted(set(datas_de_compra))
    dias_recentes = dias_de_compra[-(INTERVALOS_CONSIDERADOS + 1):]
    quantidade_de_intervalos = len(dias_recentes) - 1
    if quantidade_de_intervalos < 1:
        return None
    dias_entre_primeira_e_ultima = (dias_recentes[-1] - dias_recentes[0]).days
    return _arredondar_meio_para_cima(dias_entre_primeira_e_ultima / quantidade_de_intervalos)


def _arredondar_meio_para_cima(valor: float) -> int:
    return math.floor(valor + 0.5)


def calcular_indicadores(
    datas_de_compra: list[date], total_pedidos: int, hoje: date
) -> IndicadoresCliente:
    if not datas_de_compra:
        return IndicadoresCliente(total_pedidos=total_pedidos)

    ultima_compra = max(datas_de_compra)
    dias_desde_ultima_compra = (hoje - ultima_compra).days
    frequencia = frequencia_media(datas_de_compra)
    return IndicadoresCliente(
        total_pedidos=total_pedidos,
        ultima_compra=ultima_compra,
        dias_desde_ultima_compra=dias_desde_ultima_compra,
        frequencia_media_dias=frequencia,
        recompra_prevista_em_dias=(
            None if frequencia is None else frequencia - dias_desde_ultima_compra
        ),
    )


def recalcular_apos_venda(
    compras_anteriores: list[date], data_da_venda: date
) -> FrequenciaRecalculada:
    frequencia_anterior = frequencia_media(compras_anteriores)
    frequencia_nova = frequencia_media([*compras_anteriores, data_da_venda])
    return FrequenciaRecalculada(
        anterior_dias=frequencia_anterior,
        nova_dias=frequencia_nova,
        recompra_prevista_em_dias=frequencia_nova,
        dentro_da_janela_de_contato=_comprou_dentro_da_janela(
            compras_anteriores, data_da_venda, frequencia_anterior
        ),
    )


def _comprou_dentro_da_janela(
    compras_anteriores: list[date], data_da_venda: date, frequencia_anterior: int | None
) -> bool | None:
    if frequencia_anterior is None:
        return None
    dias_desde_a_compra_anterior = (data_da_venda - max(compras_anteriores)).days
    diferenca_para_o_dia_previsto = dias_desde_a_compra_anterior - frequencia_anterior
    return abs(diferenca_para_o_dia_previsto) <= JANELA_DE_CONTATO_EM_DIAS
