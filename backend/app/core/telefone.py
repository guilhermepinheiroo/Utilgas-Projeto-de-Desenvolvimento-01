import re

CODIGO_DO_BRASIL = "55"


def telefone_nacional(valor: str | None) -> str:
    digitos = re.sub(r"\D", "", valor or "")
    if len(digitos) in (12, 13) and digitos.startswith(CODIGO_DO_BRASIL):
        return digitos[len(CODIGO_DO_BRASIL) :]
    return digitos
