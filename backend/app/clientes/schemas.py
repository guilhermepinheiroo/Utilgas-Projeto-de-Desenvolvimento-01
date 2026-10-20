from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator

from app.core.normalizacao import (
    normalizar_cep,
    normalizar_cpf_cnpj,
    normalizar_email,
    normalizar_telefone,
    texto_ou_none,
)

StatusCliente = Literal["ativo", "inativo", "inadimplente"]

TelefoneNormalizado = Annotated[str, AfterValidator(normalizar_telefone)]
TelefoneDeEntrada = Annotated[
    TelefoneNormalizado,
    Field(
        description="Com DDD. Aceita máscara e +55; é gravado só com dígitos. "
        "É também o WhatsApp do cliente.",
        examples=["53988124477"],
    ),
]
CpfCnpjDeEntrada = Annotated[str | None, AfterValidator(normalizar_cpf_cnpj)]
CepDeEntrada = Annotated[str | None, AfterValidator(normalizar_cep)]
EmailDeEntrada = Annotated[str | None, AfterValidator(normalizar_email)]
TextoOpcional = Annotated[str | None, AfterValidator(texto_ou_none)]
TextoObrigatorio = Annotated[str, Field(min_length=1)]


class EnderecoBase(BaseModel):
    endereco: str = Field(description="Rua e número")
    complemento: str | None = None
    cep: str | None = None
    bairro: str | None = None
    regiao_id: int | None = Field(None, description="Define a taxa de entrega")
    principal: bool = False


class EnderecoCreate(EnderecoBase):
    """Corpo do POST e do PUT de endereço.

    O primeiro endereço do cliente vira principal automaticamente. Marcar
    principal=true desmarca o principal anterior.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    endereco: TextoObrigatorio = Field(description="Rua e número")
    complemento: TextoOpcional = None
    cep: CepDeEntrada = None
    bairro: TextoOpcional = None


class EnderecoOut(EnderecoBase):
    id: int
    cliente_id: int
    regiao_nome: str | None = None
    taxa_entrega: float | None = None


class ClienteBase(BaseModel):
    nome: str
    telefone: str = Field(description="Somente dígitos, com DDD, ex: 53988124477")
    cpf_cnpj: str | None = None
    email: str | None = None
    observacoes: str | None = None
    status: StatusCliente = "ativo"


class ClienteCreate(ClienteBase):
    model_config = ConfigDict(str_strip_whitespace=True)

    nome: TextoObrigatorio
    telefone: TelefoneDeEntrada
    cpf_cnpj: CpfCnpjDeEntrada = None
    email: EmailDeEntrada = None
    observacoes: TextoOpcional = None
    enderecos: list[EnderecoCreate] = []

    @model_validator(mode="after")
    def _no_maximo_um_endereco_principal(self):
        if sum(e.principal for e in self.enderecos) > 1:
            raise ValueError("Só um endereço pode ser o principal")
        return self


class ClienteUpdate(BaseModel):
    """PUT parcial: só os campos enviados são alterados.

    Enviar null em cpf_cnpj, email ou observacoes apaga o valor.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    nome: TextoObrigatorio | None = None
    telefone: TelefoneDeEntrada | None = None
    cpf_cnpj: CpfCnpjDeEntrada = None
    email: EmailDeEntrada = None
    observacoes: TextoOpcional = None
    status: StatusCliente | None = None

    @model_validator(mode="after")
    def _obrigatorios_nao_podem_ser_apagados(self):
        apagados = [
            campo
            for campo in ("nome", "telefone", "status")
            if campo in self.model_fields_set and getattr(self, campo) is None
        ]
        if apagados:
            raise ValueError(f"Campo obrigatório não pode ser nulo: {', '.join(apagados)}")
        return self


class IndicadoresCliente(BaseModel):
    """Calculados a partir do histórico de vendas (não ficam gravados).

    Vendas canceladas não contam. A frequência é a média de dias entre os
    últimos 6 dias de compra; duas compras no mesmo dia contam como uma.
    """

    total_pedidos: int = 0
    ultima_compra: date | None = None
    dias_desde_ultima_compra: int | None = None
    frequencia_media_dias: int | None = Field(
        None, description="Média de dias entre compras (precisa de 2 dias de compra)"
    )
    recompra_prevista_em_dias: int | None = Field(
        None, description="Dias até a próxima compra prevista; negativo = atrasado"
    )


class ClienteOut(ClienteBase):
    id: int
    criado_em: datetime
    enderecos: list[EnderecoOut] = []
    indicadores: IndicadoresCliente | None = None


class ClienteResumo(BaseModel):
    """Linha da tabela de listagem de clientes."""

    id: int
    nome: str
    telefone: str
    endereco_principal: str | None = None
    ultima_compra: date | None = None
    status: StatusCliente


class ClientesPagina(BaseModel):
    itens: list[ClienteResumo]
    total: int
    pagina: int
    tamanho: int
