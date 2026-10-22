import re

DDDS_DO_BRASIL = frozenset(
    {11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28}
    | {31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49}
    | {51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69}
    | {71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89}
    | {91, 92, 93, 94, 95, 96, 97, 98, 99}
)
CODIGO_DO_BRASIL = "55"
PREFIXO_INTERURBANO = "0"
INICIOS_DE_TELEFONE_FIXO = "2345"
INICIOS_DE_CELULAR_SEM_O_NOVE = "6789"
ERRO_TELEFONE = "Telefone inválido: informe DDD + número (ex.: 53 98812-4477)"

PESOS_DO_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def so_digitos(valor: str | None) -> str:
    return re.sub(r"\D", "", valor or "")


def normalizar_telefone(valor: str) -> str:
    digitos = _com_nono_digito(_sem_prefixos_de_discagem(so_digitos(valor)))
    if not _telefone_valido(digitos):
        raise ValueError(ERRO_TELEFONE)
    return digitos


def _sem_prefixos_de_discagem(digitos: str) -> str:
    if len(digitos) in (12, 13) and digitos.startswith(CODIGO_DO_BRASIL):
        return digitos[len(CODIGO_DO_BRASIL):]
    if len(digitos) in (11, 12) and digitos.startswith(PREFIXO_INTERURBANO):
        return digitos[len(PREFIXO_INTERURBANO):]
    return digitos


def _com_nono_digito(digitos: str) -> str:
    if len(digitos) == 10 and digitos[2] in INICIOS_DE_CELULAR_SEM_O_NOVE:
        return digitos[:2] + "9" + digitos[2:]
    return digitos


def _telefone_valido(digitos: str) -> bool:
    if len(digitos) not in (10, 11) or int(digitos[:2]) not in DDDS_DO_BRASIL:
        return False
    if len(digitos) == 10:
        return digitos[2] in INICIOS_DE_TELEFONE_FIXO
    return digitos[2] == "9"


def normalizar_cpf_cnpj(valor: str | None) -> str | None:
    documento = re.sub(r"[^0-9A-Z]", "", (valor or "").upper())
    if not documento:
        return None
    if _cpf_valido(documento) or _cnpj_valido(documento):
        return documento
    raise ValueError("CPF/CNPJ inválido")


def _cpf_valido(cpf: str) -> bool:
    if len(cpf) != 11 or not cpf.isdigit() or _todos_iguais(cpf):
        return False
    numeros = [int(c) for c in cpf]
    primeiro = digito_verificador(numeros[:9], pesos=range(10, 1, -1))
    segundo = digito_verificador(numeros[:10], pesos=range(11, 1, -1))
    return numeros[9:] == [primeiro, segundo]


def _cnpj_valido(cnpj: str) -> bool:
    if len(cnpj) != 14 or not cnpj[12:].isdigit() or _todos_iguais(cnpj):
        return False
    valores = [_valor_no_calculo_do_cnpj(c) for c in cnpj]
    primeiro = digito_verificador(valores[:12], pesos=PESOS_DO_CNPJ[1:])
    segundo = digito_verificador(valores[:13], pesos=PESOS_DO_CNPJ)
    return valores[12:] == [primeiro, segundo]


def _valor_no_calculo_do_cnpj(caractere: str) -> int:
    return ord(caractere) - ord("0")


def digito_verificador(valores: list[int], pesos) -> int:
    resto = sum(v * p for v, p in zip(valores, pesos, strict=True)) % 11
    return 0 if resto < 2 else 11 - resto


def _todos_iguais(texto: str) -> bool:
    return len(set(texto)) == 1


def normalizar_cep(valor: str | None) -> str | None:
    digitos = so_digitos(valor)
    if not digitos:
        return None
    if len(digitos) != 8:
        raise ValueError("CEP inválido: são 8 dígitos")
    return f"{digitos[:5]}-{digitos[5:]}"


def normalizar_email(valor: str | None) -> str | None:
    if not valor:
        return None
    email = valor.lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("E-mail inválido")
    return email


def texto_ou_none(valor: str | None) -> str | None:
    return valor or None
