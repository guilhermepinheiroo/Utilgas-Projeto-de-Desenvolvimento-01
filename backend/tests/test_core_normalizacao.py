import pytest

from app.core.normalizacao import (
    normalizar_cep,
    normalizar_cpf_cnpj,
    normalizar_email,
    normalizar_telefone,
)


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        pytest.param("53988124477", "53988124477", id="ja-normalizado"),
        pytest.param("(53) 98812-4477", "53988124477", id="com-mascara"),
        pytest.param("+55 53 98812-4477", "53988124477", id="com-codigo-do-brasil"),
        pytest.param("0 53 98812-4477", "53988124477", id="com-zero-interurbano"),
        pytest.param("53 8812-4477", "53988124477", id="celular-antigo-ganha-o-9"),
        pytest.param("53 3222-1234", "5332221234", id="fixo"),
        pytest.param("+55 53 3222-1234", "5332221234", id="fixo-com-codigo-do-brasil"),
        pytest.param("55 99123-4567", "55991234567", id="ddd-55-nao-e-codigo-do-brasil"),
        pytest.param("+55 55 99123-4567", "55991234567", id="ddd-55-com-codigo-do-brasil"),
    ],
)
def test_telefone_normalizado(entrada, esperado):
    assert normalizar_telefone(entrada) == esperado


@pytest.mark.parametrize(
    "entrada",
    [
        pytest.param("", id="vazio"),
        pytest.param("98812-4477", id="sem-ddd"),
        pytest.param("10 98812-4477", id="ddd-inexistente"),
        pytest.param("53 1222-1234", id="fixo-comecando-com-1"),
        pytest.param("53 88812-4477", id="onze-digitos-sem-o-9"),
        pytest.param("53 98812-44770", id="digito-a-mais"),
    ],
)
def test_telefone_invalido(entrada):
    with pytest.raises(ValueError):
        normalizar_telefone(entrada)


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        pytest.param("529.982.247-25", "52998224725", id="cpf-com-mascara"),
        pytest.param("11144477735", "11144477735", id="cpf-sem-mascara"),
        pytest.param("11.222.333/0001-81", "11222333000181", id="cnpj-numerico"),
        pytest.param("12.ABC.345/01DE-35", "12ABC34501DE35", id="cnpj-alfanumerico-da-receita"),
        pytest.param("12.abc.345/01de-35", "12ABC34501DE35", id="cnpj-alfanumerico-minusculo"),
        pytest.param("", None, id="vazio"),
        pytest.param("  ", None, id="so-espacos"),
        pytest.param(None, None, id="nulo"),
    ],
)
def test_cpf_cnpj_normalizado(entrada, esperado):
    assert normalizar_cpf_cnpj(entrada) == esperado


@pytest.mark.parametrize(
    "entrada",
    [
        pytest.param("529.982.247-24", id="cpf-digito-errado"),
        pytest.param("111.111.111-11", id="cpf-todos-iguais"),
        pytest.param("11.222.333/0001-82", id="cnpj-digito-errado"),
        pytest.param("12.ABC.345/01DE-34", id="cnpj-alfanumerico-digito-errado"),
        pytest.param("12.ABC.345/01DE-3A", id="cnpj-digito-verificador-com-letra"),
        pytest.param("1234567890", id="tamanho-errado"),
    ],
)
def test_cpf_cnpj_invalido(entrada):
    with pytest.raises(ValueError):
        normalizar_cpf_cnpj(entrada)


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        pytest.param("96077520", "96077-520", id="so-digitos"),
        pytest.param("96077-520", "96077-520", id="com-traco"),
        pytest.param("", None, id="vazio"),
    ],
)
def test_cep_normalizado(entrada, esperado):
    assert normalizar_cep(entrada) == esperado


def test_cep_com_tamanho_errado_e_invalido():
    with pytest.raises(ValueError):
        normalizar_cep("9607-520")


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        pytest.param("Maria@Gmail.com", "maria@gmail.com", id="minusculo"),
        pytest.param("", None, id="vazio"),
    ],
)
def test_email_normalizado(entrada, esperado):
    assert normalizar_email(entrada) == esperado


def test_email_sem_arroba_e_invalido():
    with pytest.raises(ValueError):
        normalizar_email("maria.gmail.com")
