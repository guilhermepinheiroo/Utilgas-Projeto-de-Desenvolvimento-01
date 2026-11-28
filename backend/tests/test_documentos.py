from app.core.documentos import cnpj_valido, cpf_cnpj_valido, cpf_valido


def test_cpf():
    assert cpf_valido("52998224725")
    assert not cpf_valido("52998224724")
    assert not cpf_valido("11111111111")
    assert not cpf_valido("123")


def test_cnpj():
    assert cnpj_valido("11222333000181")
    assert not cnpj_valido("11222333000182")
    assert not cnpj_valido("00000000000000")


def test_cpf_cnpj_escolhe_pelo_tamanho():
    assert cpf_cnpj_valido("52998224725")
    assert cpf_cnpj_valido("11222333000181")
