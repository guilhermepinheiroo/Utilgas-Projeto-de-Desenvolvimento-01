from typing import Literal

Nivel = Literal["normal", "baixo", "critico"]


def nivel_estoque(atual: int, minimo: int) -> Nivel:
    """Classifica o saldo de cheios em relação ao mínimo.

    critico: zerado ou na metade do mínimo (ou menos)
    baixo:   no mínimo ou abaixo
    normal:  acima do mínimo
    """
    if atual <= 0 or (minimo > 0 and atual <= minimo // 2):
        return "critico"
    if atual <= minimo:
        return "baixo"
    return "normal"