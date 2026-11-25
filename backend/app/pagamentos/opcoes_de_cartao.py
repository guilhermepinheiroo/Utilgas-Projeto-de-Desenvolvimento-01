from dataclasses import dataclass

from fastapi import HTTPException
from postgrest.exceptions import APIError
from supabase import Client

VIOLACAO_DE_UNICIDADE = "23505"


@dataclass(frozen=True)
class TipoDeOpcao:
    tabela: str
    nome: str

    @property
    def titulo(self) -> str:
        return self.nome.capitalize()


MAQUININHA = TipoDeOpcao(tabela="maquininhas", nome="maquininha")
BANDEIRA = TipoDeOpcao(tabela="bandeiras", nome="bandeira")


def listar(db: Client, tipo: TipoDeOpcao, ativo: bool) -> list[dict]:
    return db.table(tipo.tabela).select("*").eq("ativo", ativo).order("nome").execute().data


def buscar(db: Client, tipo: TipoDeOpcao, opcao_id: int) -> dict:
    rows = db.table(tipo.tabela).select("*").eq("id", opcao_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, f"{tipo.titulo} não encontrada")
    return rows[0]


def cadastrar(db: Client, tipo: TipoDeOpcao, nome: str) -> dict:
    nome = _nome_valido(nome)
    _recusar_nome_repetido(db, tipo, nome)
    return _gravar(tipo, nome, lambda: db.table(tipo.tabela).insert({"nome": nome}).execute())


def atualizar(db: Client, tipo: TipoDeOpcao, opcao_id: int, campos: dict) -> dict:
    if not campos:
        raise HTTPException(422, "Nenhum campo para atualizar")
    if "ativo" in campos and campos["ativo"] is None:
        raise HTTPException(422, "Informe ativo como true ou false")
    if "nome" in campos:
        campos["nome"] = _nome_valido(campos["nome"])

    atual = buscar(db, tipo, opcao_id)
    if "nome" in campos:
        _recusar_nome_repetido(db, tipo, campos["nome"], ignorar_id=opcao_id)

    return _gravar(
        tipo,
        campos.get("nome", atual["nome"]),
        lambda: db.table(tipo.tabela).update(campos).eq("id", opcao_id).execute(),
    )


def _nome_valido(nome: str | None) -> str:
    nome = " ".join((nome or "").split())
    if not nome:
        raise HTTPException(422, "Nome obrigatório")
    return nome


def _mesmo_nome(um: str, outro: str) -> bool:
    return " ".join(um.split()).casefold() == " ".join(outro.split()).casefold()


def _recusar_nome_repetido(
    db: Client, tipo: TipoDeOpcao, nome: str, ignorar_id: int | None = None
) -> None:
    cadastradas = db.table(tipo.tabela).select("id, nome, ativo").execute().data
    repetida = next(
        (
            opcao
            for opcao in cadastradas
            if opcao["id"] != ignorar_id and _mesmo_nome(opcao["nome"], nome)
        ),
        None,
    )
    if repetida is None:
        return
    situacao = "" if repetida["ativo"] else " (está inativa: reative em vez de cadastrar de novo)"
    raise HTTPException(409, f"Já existe uma {tipo.nome} chamada {repetida['nome']}{situacao}")


def _gravar(tipo: TipoDeOpcao, nome: str, operacao) -> dict:
    try:
        return operacao().data[0]
    except APIError as erro:
        if erro.code == VIOLACAO_DE_UNICIDADE:
            raise HTTPException(409, f"Já existe uma {tipo.nome} chamada {nome}") from erro
        raise
