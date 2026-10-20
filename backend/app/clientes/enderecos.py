from fastapi import HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from app.clientes.schemas import EnderecoCreate, EnderecoOut
from app.core.db_errors import VIOLACAO_DE_CHAVE_ESTRANGEIRA, traduzir_unicidade
from app.core.errors import nao_encontrado

SELECT_ENDERECO = "*, regioes(nome, taxa_entrega)"
OUTRO_PRINCIPAL_SALVO_AO_MESMO_TEMPO = {
    "uq_endereco_principal": "Outro endereço principal foi salvo agora; tente de novo",
}


def endereco_out(linha: dict) -> EnderecoOut:
    regiao = linha.get("regioes") or {}
    return EnderecoOut(
        **linha, regiao_nome=regiao.get("nome"), taxa_entrega=regiao.get("taxa_entrega")
    )


def validar_regioes(db: Client, regiao_ids: set[int | None]) -> None:
    informadas = {regiao_id for regiao_id in regiao_ids if regiao_id is not None}
    if not informadas:
        return
    linhas = db.table("regioes").select("id, ativo").in_("id", sorted(informadas)).execute().data
    ativas = {r["id"] for r in linhas if r["ativo"]}
    if invalidas := informadas - ativas:
        raise HTTPException(
            422,
            f"Região inexistente ou inativa: {', '.join(map(str, sorted(invalidas)))}",
        )


def adicionar_endereco(db: Client, cliente_id: int, dados: EnderecoCreate) -> EnderecoOut:
    enderecos_atuais = _enderecos_do_cliente(db, cliente_id)
    validar_regioes(db, {dados.regiao_id})

    novo = dados.model_dump() | {"cliente_id": cliente_id}
    if not enderecos_atuais:
        novo["principal"] = True
    elif novo["principal"]:
        _desmarcar_principal_atual(db, cliente_id)

    with traduzir_unicidade(OUTRO_PRINCIPAL_SALVO_AO_MESMO_TEMPO):
        criado = db.table("enderecos").insert(novo).select(SELECT_ENDERECO).execute().data[0]
    return endereco_out(criado)


def atualizar_endereco(
    db: Client, cliente_id: int, endereco_id: int, dados: EnderecoCreate
) -> EnderecoOut:
    atual = _endereco_atual(db, cliente_id, endereco_id)
    validar_regioes(db, {dados.regiao_id})

    campos = dados.model_dump()
    if "principal" not in dados.model_fields_set:
        campos["principal"] = atual["principal"]
    elif atual["principal"] and not dados.principal:
        raise HTTPException(
            422, "Para trocar o endereço principal, marque outro endereço como principal"
        )
    elif dados.principal and not atual["principal"]:
        _desmarcar_principal_atual(db, cliente_id)

    with traduzir_unicidade(OUTRO_PRINCIPAL_SALVO_AO_MESMO_TEMPO):
        atualizado = (
            db.table("enderecos")
            .update(campos)
            .eq("id", endereco_id)
            .eq("cliente_id", cliente_id)
            .select(SELECT_ENDERECO)
            .execute()
            .data[0]
        )
    return endereco_out(atualizado)


def remover_endereco(db: Client, cliente_id: int, endereco_id: int) -> None:
    try:
        removidos = (
            db.table("enderecos")
            .delete()
            .eq("id", endereco_id)
            .eq("cliente_id", cliente_id)
            .execute()
            .data
        )
    except APIError as e:
        if e.code == VIOLACAO_DE_CHAVE_ESTRANGEIRA:
            raise HTTPException(
                409, "Endereço já usado em entregas: não pode ser removido"
            ) from e
        raise

    if not removidos:
        raise nao_encontrado("Endereço não encontrado")
    if removidos[0]["principal"]:
        _promover_endereco_mais_recente(db, cliente_id)


def _enderecos_do_cliente(db: Client, cliente_id: int) -> list[dict]:
    clientes = (
        db.table("clientes").select("id, enderecos(id)").eq("id", cliente_id).limit(1).execute()
    ).data
    if not clientes:
        raise nao_encontrado("Cliente não encontrado")
    return clientes[0]["enderecos"]


def _endereco_atual(db: Client, cliente_id: int, endereco_id: int) -> dict:
    linhas = (
        db.table("enderecos")
        .select("principal")
        .eq("id", endereco_id)
        .eq("cliente_id", cliente_id)
        .limit(1)
        .execute()
        .data
    )
    if not linhas:
        raise nao_encontrado("Endereço não encontrado")
    return linhas[0]


def _desmarcar_principal_atual(db: Client, cliente_id: int) -> None:
    (
        db.table("enderecos")
        .update({"principal": False})
        .eq("cliente_id", cliente_id)
        .eq("principal", True)
        .execute()
    )


def _promover_endereco_mais_recente(db: Client, cliente_id: int) -> None:
    mais_recente = (
        db.table("enderecos")
        .select("id")
        .eq("cliente_id", cliente_id)
        .order("criado_em", desc=True)
        .order("id", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if mais_recente:
        db.table("enderecos").update({"principal": True}).eq("id", mais_recente[0]["id"]).execute()
