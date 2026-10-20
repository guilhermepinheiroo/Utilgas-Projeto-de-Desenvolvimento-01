from fastapi import HTTPException, status


def nao_implementado() -> HTTPException:
    """Usado nas rotas ainda sem lógica. Troque por a implementação real."""
    return HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Endpoint ainda não implementado",
    )


def nao_encontrado(detalhe: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detalhe)
