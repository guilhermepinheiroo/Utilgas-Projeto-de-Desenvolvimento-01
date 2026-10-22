import pytest
from pydantic import ValidationError

from app.clientes.schemas import ClienteCreate, ClienteOut, ClienteUpdate, EnderecoCreate


def test_cadastro_normaliza_campos():
    cliente = ClienteCreate(
        nome="  Maria Souza ",
        telefone="(53) 98812-4477",
        cpf_cnpj="529.982.247-25",
        email=" Maria@Gmail.com ",
        observacoes="   ",
        enderecos=[{"endereco": " R. Santos Dumont, 412 ", "cep": "96077520", "bairro": ""}],
    )
    assert cliente.nome == "Maria Souza"
    assert cliente.telefone == "53988124477"
    assert cliente.cpf_cnpj == "52998224725"
    assert cliente.email == "maria@gmail.com"
    assert cliente.observacoes is None
    assert cliente.enderecos[0].endereco == "R. Santos Dumont, 412"
    assert cliente.enderecos[0].cep == "96077-520"
    assert cliente.enderecos[0].bairro is None


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("nome", "   "),
        ("telefone", "98812-4477"),
        ("cpf_cnpj", "123"),
        ("email", "maria.gmail.com"),
    ],
)
def test_cadastro_recusa_valor_invalido(campo, valor):
    dados = {"nome": "Maria", "telefone": "53988124477"} | {campo: valor}
    with pytest.raises(ValidationError):
        ClienteCreate(**dados)


def test_cadastro_recusa_dois_enderecos_principais():
    with pytest.raises(ValidationError):
        ClienteCreate(
            nome="Maria",
            telefone="53988124477",
            enderecos=[
                {"endereco": "Rua A, 1", "principal": True},
                {"endereco": "Rua B, 2", "principal": True},
            ],
        )


def test_endereco_exige_rua():
    with pytest.raises(ValidationError):
        EnderecoCreate(endereco="  ")


def test_atualizacao_so_leva_o_que_foi_enviado():
    atualizacao = ClienteUpdate(telefone="53 8812-4477")
    assert atualizacao.model_dump(exclude_unset=True) == {"telefone": "53988124477"}


def test_atualizacao_pode_apagar_opcionais():
    atualizacao = ClienteUpdate(email=None, cpf_cnpj="")
    assert atualizacao.model_dump(exclude_unset=True) == {"email": None, "cpf_cnpj": None}


@pytest.mark.parametrize("campo", ["nome", "telefone", "status"])
def test_atualizacao_nao_anula_obrigatorios(campo):
    with pytest.raises(ValidationError):
        ClienteUpdate(**{campo: None})


@pytest.mark.parametrize("campo, valor", [("nome", "  "), ("telefone", "123")])
def test_atualizacao_valida_como_o_cadastro(campo, valor):
    with pytest.raises(ValidationError):
        ClienteUpdate(**{campo: valor})


def test_saida_nao_revalida_telefone_antigo_gravado_no_banco():
    saida = ClienteOut(
        id=1, nome="X", telefone="5398812447", criado_em="2026-10-15T12:00:00+00:00"
    )
    assert saida.telefone == "5398812447"
