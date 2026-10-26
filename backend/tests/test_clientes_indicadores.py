from datetime import date, timedelta

from app.clientes.indicadores import (
    JANELA_DE_CONTATO_EM_DIAS,
    calcular_indicadores,
    frequencia_media,
    recalcular_apos_venda,
)

HOJE = date(2026, 10, 20)
HABITO_DE_30_DIAS = [date(2026, 8, 21), date(2026, 9, 20)]
DIA_PREVISTO_PELO_HABITO = HABITO_DE_30_DIAS[-1] + timedelta(days=30)


def dias_atras(*quantidades_de_dias):
    return [HOJE - timedelta(days=d) for d in quantidades_de_dias]


def test_sem_compras_nao_ha_indicadores():
    indicadores = calcular_indicadores([], total_pedidos=0, hoje=HOJE)
    assert indicadores.total_pedidos == 0
    assert indicadores.ultima_compra is None
    assert indicadores.frequencia_media_dias is None
    assert indicadores.recompra_prevista_em_dias is None


def test_uma_compra_ainda_nao_tem_frequencia():
    indicadores = calcular_indicadores(dias_atras(10), total_pedidos=1, hoje=HOJE)
    assert indicadores.ultima_compra == HOJE - timedelta(days=10)
    assert indicadores.dias_desde_ultima_compra == 10
    assert indicadores.frequencia_media_dias is None
    assert indicadores.recompra_prevista_em_dias is None


def test_compra_a_cada_28_dias_e_ultima_ha_10_dias_faltam_18():
    indicadores = calcular_indicadores(dias_atras(10, 38, 66), total_pedidos=3, hoje=HOJE)
    assert indicadores.frequencia_media_dias == 28
    assert indicadores.recompra_prevista_em_dias == 18


def test_cliente_atrasado_tem_recompra_negativa():
    indicadores = calcular_indicadores(dias_atras(40, 70, 100), total_pedidos=3, hoje=HOJE)
    assert indicadores.frequencia_media_dias == 30
    assert indicadores.recompra_prevista_em_dias == -10


def test_compras_no_mesmo_dia_contam_como_um_dia_so():
    assert frequencia_media(dias_atras(0, 0, 30, 60)) == 30


def test_habito_antigo_e_ignorado_alem_dos_ultimos_cinco_intervalos():
    habito_atual_de_20_dias = [0, 20, 40, 60, 80, 100]
    habito_antigo_de_60_dias = [300, 360, 420, 480]
    assert frequencia_media(dias_atras(*habito_atual_de_20_dias, *habito_antigo_de_60_dias)) == 20


def test_media_de_28_e_meio_arredonda_para_29():
    assert frequencia_media(dias_atras(0, 28, 57)) == 29


def test_ordem_das_datas_nao_importa():
    assert frequencia_media(dias_atras(66, 10, 38)) == frequencia_media(dias_atras(10, 38, 66))


def test_primeira_compra_nao_tem_recalculo():
    recalculo = recalcular_apos_venda([], HOJE)
    assert recalculo.anterior_dias is None
    assert recalculo.nova_dias is None
    assert recalculo.dentro_da_janela_de_contato is None


def test_segunda_compra_ja_tem_frequencia_mas_ainda_nao_tem_janela():
    recalculo = recalcular_apos_venda([date(2026, 9, 20)], HOJE)
    assert recalculo.anterior_dias is None
    assert recalculo.nova_dias == 30
    assert recalculo.recompra_prevista_em_dias == 30
    assert recalculo.dentro_da_janela_de_contato is None


def test_compra_no_limite_da_janela_esta_dentro():
    limite = DIA_PREVISTO_PELO_HABITO + timedelta(days=JANELA_DE_CONTATO_EM_DIAS)
    recalculo = recalcular_apos_venda(HABITO_DE_30_DIAS, limite)
    assert recalculo.anterior_dias == 30
    assert recalculo.dentro_da_janela_de_contato is True


def test_compra_um_dia_depois_do_limite_esta_fora():
    depois_do_limite = DIA_PREVISTO_PELO_HABITO + timedelta(days=JANELA_DE_CONTATO_EM_DIAS + 1)
    recalculo = recalcular_apos_venda(HABITO_DE_30_DIAS, depois_do_limite)
    assert recalculo.dentro_da_janela_de_contato is False


def test_compra_antecipada_fica_fora_da_janela_e_puxa_a_frequencia_para_baixo():
    recalculo = recalcular_apos_venda(HABITO_DE_30_DIAS, date(2026, 10, 5))
    assert recalculo.dentro_da_janela_de_contato is False
    assert recalculo.nova_dias == 23
