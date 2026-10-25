from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError
from supabase import Client

from app.core.auth import get_current_user, get_db
from app.core.db_errors import chamar_rpc
from app.core.tempo import inicio_do_dia, inicio_do_mes, para_iso_utc
from app.produtos.schemas import (
    AlertaEstoque,
    Categoria,
    MovimentacaoCreate,
    MovimentacaoOut,
    ProdutoCreate,
    ProdutoOut,
    ProdutoUpdate,
    ResumoEstoque,
)
from app.produtos.service import nivel_estoque

router = APIRouter(prefix="/produtos", tags=["Produtos"])
estoque_router = APIRouter(prefix="/estoque", tags=["Estoque"])


def _produto_out(row: dict) -> ProdutoOut:
    return ProdutoOut(
        **row,
        status_estoque=nivel_estoque(row["estoque_atual"], row["estoque_minimo"]),
    )


def _buscar_produto(db: Client, produto_id: int) -> dict:
    rows = db.table("produtos").select("*").eq("id", produto_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Produto não encontrado")
    return rows[0]


def _movimentacao_out(row: dict) -> MovimentacaoOut:
    produto = row.pop("produtos", None) or {}
    return MovimentacaoOut(**row, produto_nome=produto.get("nome", ""))


# ---------------------------------------------------------------- produtos


@router.get("", response_model=list[ProdutoOut])
def listar_produtos(
    categoria: Categoria | None = None,
    ativo: bool | None = True,
    busca: str | None = None,
    db: Client = Depends(get_db),
):
    """Usado no Atendimento (etapa Itens), na Portaria e no Controle de Estoque."""
    q = db.table("produtos").select("*")
    if categoria:
        q = q.eq("categoria", categoria)
    if ativo is not None:
        q = q.eq("ativo", ativo)
    if busca and busca.strip():
        q = q.ilike("nome", f"%{busca.strip()}%")
    rows = q.order("nome").execute().data
    return [_produto_out(r) for r in rows]


@router.post("", response_model=ProdutoOut, status_code=201)
def criar_produto(
    dados: ProdutoCreate,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Insere o produto com estoque_atual=0 e, se estoque_inicial > 0, chama a função SQL
    `movimentar_estoque` (entrada, origem=ajuste) para gravar o saldo e a movimentação.
    controla_vazio omitido = True quando categoria == "gas".
    """
    controla_vazio = (
        dados.controla_vazio if dados.controla_vazio is not None else dados.categoria == "gas"
    )
    novo = {
        "nome": dados.nome.strip(),
        "categoria": dados.categoria,
        "preco": dados.preco,
        "estoque_minimo": dados.estoque_minimo,
        "controla_vazio": controla_vazio,
    }
    produto = db.table("produtos").insert(novo).execute().data[0]

    if dados.estoque_inicial > 0:
        try:
            chamar_rpc(
                db,
                "movimentar_estoque",
                {
                    "p_produto_id": produto["id"],
                    "p_estoque": "cheio",
                    "p_tipo": "entrada",
                    "p_quantidade": dados.estoque_inicial,
                    "p_origem": "ajuste",
                    "p_observacao": "Estoque inicial",
                    "p_usuario_id": user["id"],
                },
            )
        except Exception:
            # não deixa um produto "meio criado" (sem o saldo que o usuário pediu)
            db.table("produtos").delete().eq("id", produto["id"]).execute()
            raise
        produto = _buscar_produto(db, produto["id"])
    return _produto_out(produto)


@router.put("/{produto_id}", response_model=ProdutoOut)
def atualizar_produto(produto_id: int, dados: ProdutoUpdate, db: Client = Depends(get_db)):
    """Atualiza só os campos enviados. Estoque NÃO se altera aqui (use /estoque/movimentacoes)."""
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        raise HTTPException(422, "Nenhum campo para atualizar")
    if "nome" in campos and campos["nome"] is not None:
        campos["nome"] = campos["nome"].strip()
    # campo enviado como null não faz sentido para colunas not null
    campos = {k: v for k, v in campos.items() if v is not None}

    _buscar_produto(db, produto_id)
    try:
        rows = db.table("produtos").update(campos).eq("id", produto_id).execute().data
    except APIError as e:
        if e.code == "23514":  # check_violation
            raise HTTPException(
                409,
                "Não é possível deixar de controlar vazio com vasilhames vazios em estoque. "
                "Zere o estoque vazio antes (movimentação de saída).",
            ) from e
        raise
    return _produto_out(rows[0])


# ----------------------------------------------------------------- estoque


@estoque_router.get("/resumo", response_model=ResumoEstoque)
def resumo_estoque(db: Client = Depends(get_db)):
    """Cards do topo da tela Controle de Estoque."""
    produtos = (
        db.table("produtos")
        .select("estoque_atual, estoque_vazio, estoque_minimo")
        .eq("ativo", True)
        .execute()
        .data
    )

    entradas = (
        db.table("movimentacoes_estoque")
        .select("quantidade")
        .eq("tipo", "entrada")
        .eq("tipo_estoque", "cheio")
        .gte("criado_em", para_iso_utc(inicio_do_dia()))
        .execute()
        .data
    )
    saidas = (
        db.table("movimentacoes_estoque")
        .select("quantidade")
        .eq("tipo", "saida")
        .eq("tipo_estoque", "cheio")
        .gte("criado_em", para_iso_utc(inicio_do_mes()))
        .execute()
        .data
    )

    return ResumoEstoque(
        total_em_estoque=sum(p["estoque_atual"] for p in produtos),
        total_vazios=sum(p["estoque_vazio"] for p in produtos),
        entradas_hoje=sum(m["quantidade"] for m in entradas),
        saidas_mes=sum(m["quantidade"] for m in saidas),
        itens_com_baixo_estoque=sum(
            1 for p in produtos if p["estoque_atual"] <= p["estoque_minimo"]
        ),
    )


@estoque_router.get("/alertas", response_model=list[AlertaEstoque])
def alertas_estoque(db: Client = Depends(get_db)):
    """Produtos com estoque_atual <= estoque_minimo."""
    # O PostgREST não compara duas colunas num filtro, então filtramos aqui.
    produtos = db.table("produtos").select("*").eq("ativo", True).execute().data
    alertas = [
        AlertaEstoque(
            produto_id=p["id"],
            produto_nome=p["nome"],
            estoque_atual=p["estoque_atual"],
            estoque_minimo=p["estoque_minimo"],
            nivel=nivel_estoque(p["estoque_atual"], p["estoque_minimo"]),
        )
        for p in produtos
        if p["estoque_atual"] <= p["estoque_minimo"]
    ]
    # críticos primeiro, depois os de menor saldo
    alertas.sort(key=lambda a: (a.nivel != "critico", a.estoque_atual))
    return alertas


@estoque_router.get("/movimentacoes", response_model=list[MovimentacaoOut])
def listar_movimentacoes(
    produto_id: int | None = None,
    limite: int = Query(50, ge=1, le=500),
    db: Client = Depends(get_db),
):
    q = db.table("movimentacoes_estoque").select("*, produtos(nome)")
    if produto_id is not None:
        q = q.eq("produto_id", produto_id)
    rows = q.order("criado_em", desc=True).order("id", desc=True).limit(limite).execute().data
    return [_movimentacao_out(r) for r in rows]


@estoque_router.post("/movimentacoes", response_model=MovimentacaoOut, status_code=201)
def registrar_movimentacao(
    dados: MovimentacaoCreate,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Entrada/saída manual via função SQL `movimentar_estoque` (use chamar_rpc).

    `estoque` escolhe cheio ou vazio (vazio só em produto com controla_vazio).
    Saída que deixaria o saldo negativo -> 409. Produto inexistente -> 404.
    """
    chamar_rpc(
        db,
        "movimentar_estoque",
        {
            "p_produto_id": dados.produto_id,
            "p_estoque": dados.estoque,
            "p_tipo": dados.tipo,
            "p_quantidade": dados.quantidade,
            "p_origem": dados.origem,
            "p_observacao": dados.observacao,
            "p_usuario_id": user["id"],
        },
    )
    # A função devolve só os saldos; buscamos a movimentação que ela gravou.
    # (troca_vazio grava duas linhas; a mais recente é a entrada de cheios.)
    row = (
        db.table("movimentacoes_estoque")
        .select("*, produtos(nome)")
        .eq("produto_id", dados.produto_id)
        .eq("origem", dados.origem)
        .order("id", desc=True)
        .limit(1)
        .execute()
        .data[0]
    )
    return _movimentacao_out(row)