"""Validação de CPF/CNPJ (somente dígitos)."""


def _digito(numeros: str, pesos: list[int]) -> int:
    resto = sum(int(n) * p for n, p in zip(numeros, pesos, strict=False)) % 11
    return 0 if resto < 2 else 11 - resto


def cpf_valido(d: str) -> bool:
    if len(d) != 11 or not d.isdigit() or d == d[0] * 11:
        return False
    d1 = _digito(d[:9], list(range(10, 1, -1)))
    d2 = _digito(d[:9] + str(d1), list(range(11, 1, -1)))
    return d[9:] == f"{d1}{d2}"


def cnpj_valido(d: str) -> bool:
    if len(d) != 14 or not d.isdigit() or d == d[0] * 14:
        return False
    d1 = _digito(d[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    d2 = _digito(d[:12] + str(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return d[12:] == f"{d1}{d2}"


def cpf_cnpj_valido(d: str) -> bool:
    return cpf_valido(d) if len(d) == 11 else cnpj_valido(d)
