"""Módulo Entregas, Entregadores e Regiões — responsável: Back-end 2."""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.core.auth import get_current_user, get_db
from app.core.db_errors import chamar_rpc
from app.core.tempo import inicio_do_dia, para_iso_utc
from app.entregas.schemas import (
    EntregadorCreate,
    EntregadorOut,
    EntregaItem,
    EntregaOut,
    EntregaUpdate,
    RegiaoOut,
    ResumoEntregas,
    StatusEntrega,
)

router = APIRouter(prefix="/entregas", tags=["Entregas"])
entregadores_router = APIRouter(prefix="/entregadores", tags=["Entregadores"])
regioes_router = APIRouter(prefix="/regioes", tags=["Regiões"])

# Uma consulta só traz entrega + entregador + endereço + venda + cliente + itens.
SELECT_ENTREGA = (
    "*, entregadores(nome), enderecos(endereco, complemento), "
    "vendas(total, clientes(nome, telefone), itens_venda(quantidade, produtos(nome)))"
)


def _entrega_out(row: dict) -> EntregaOut:
    venda = row.get("vendas") or {}
    cliente = venda.get("clientes") or {}
    entregador = row.get("entregadores") or {}
    end = row.get("enderecos") or {}
    endereco = end.get("endereco")
    if endereco and end.get("complemento"):
        endereco = f"{endereco} ({end['complemento']})"

    return EntregaOut(
        id=row["id"],
        venda_id=row["venda_id"],
        status=row["status"],
        cliente_nome=cliente.get("nome"),
        cliente_telefone=cliente.get("telefone"),
        entregador_id=row["entregador_id"],
        entregador_nome=entregador.get("nome"),
        endereco=endereco,
        itens=[
            EntregaItem(
                produto_nome=(i.get("produtos") or {}).get("nome", ""),
                quantidade=i["quantidade"],
            )
            for i in venda.get("itens_venda") or []
        ],
        valor=venda.get("total", 0),
        observacao=row.get("observacao"),
        criado_em=row["criado_em"],
        entregue_em=row.get("entregue_em"),
    )


def _buscar_entrega(db: Client, entrega_id: int) -> dict:
    rows = db.table("entregas").select(SELECT_ENTREGA).eq("id", entrega_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Entrega não encontrada")
    return rows[0]


def _contar(db: Client, **filtros) -> int:
    q = db.table("entregas").select("id", count="exact")
    for campo, valor in filtros.items():
        if campo.endswith("__gte"):
            q = q.gte(campo[:-5], valor)
        elif campo.endswith("__lt"):
            q = q.lt(campo[:-4], valor)
        else:
            q = q.eq(campo, valor)
    return q.execute().count or 0


# ---------------------------------------------------------------- entregas


@router.get("", response_model=list[EntregaOut])
def listar_entregas(
    status: StatusEntrega | None = None,
    entregador_id: int | None = None,
    busca: str | None = None,
    db: Client = Depends(get_db),
):
    """Filtros da tela: busca (cliente, endereço, pedido), entregador e status."""
    q = db.table("entregas").select(SELECT_ENTREGA)
    if status:
        q = q.eq("status", status)
    if entregador_id is not None:
        q = q.eq("entregador_id", entregador_id)
    rows = q.order("criado_em", desc=True).limit(500).execute().data
    entregas = [_entrega_out(r) for r in rows]

    if busca and busca.strip():
        termo = busca.strip().lower()
        entregas = [
            e
            for e in entregas
            if termo in (e.cliente_nome or "").lower()
            or termo in (e.endereco or "").lower()
            or termo.lstrip("#") == str(e.venda_id)
        ]
    return entregas


@router.get("/resumo", response_model=ResumoEntregas)
def resumo_entregas(db: Client = Depends(get_db)):
    hoje = para_iso_utc(inicio_do_dia())
    ontem = para_iso_utc(inicio_do_dia(1))

    total_hoje = _contar(db, criado_em__gte=hoje)
    total_ontem = _contar(db, criado_em__gte=ontem, criado_em__lt=hoje)

    return ResumoEntregas(
        total_hoje=total_hoje,
        pendentes=_contar(db, status="pendente"),
        concluidas=_contar(db, status="entregue", entregue_em__gte=hoje),
        variacao_vs_ontem_pct=(
            round((total_hoje - total_ontem) / total_ontem * 100, 1) if total_ontem else None
        ),
    )


@router.patch("/{entrega_id}", response_model=EntregaOut)
def atualizar_entrega(
    entrega_id: int,
    dados: EntregaUpdate,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Atribuir entregador, marcar como entregue ou cancelar.

    Máquina de estados: pendente -> entregue | cancelada. Entrega já finalizada
    (entregue/cancelada) não aceita mais alterações (409).
    """
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        raise HTTPException(422, "Nenhum campo para atualizar")

    entrega = _buscar_entrega(db, entrega_id)
    if entrega["status"] != "pendente":
        raise HTTPException(409, f"Entrega já está {entrega['status']}")

    novo_status = campos.get("status")
    entregador_id = campos.get("entregador_id")

    # 1) valida o entregador, se veio um
    if entregador_id is not None:
        achado = (
            db.table("entregadores")
            .select("id, ativo")
            .eq("id", entregador_id)
            .limit(1)
            .execute()
            .data
        )
        if not achado:
            raise HTTPException(404, "Entregador não encontrado")
        if not achado[0]["ativo"]:
            raise HTTPException(422, "Entregador inativo")

    # 2) cancelar: tudo (venda, entrega, estoque) é desfeito pelo banco, numa transação
    if novo_status == "cancelada":
        chamar_rpc(
            db,
            "cancelar_venda",
            {"p_venda_id": entrega["venda_id"], "p_usuario_id": user["id"]},
        )
        if campos.get("observacao") is not None:
            db.table("entregas").update({"observacao": campos["observacao"]}).eq(
                "id", entrega_id
            ).execute()
        return _entrega_out(_buscar_entrega(db, entrega_id))

    # 3) atribuir / entregar
    update: dict = {}
    if entregador_id is not None:
        update["entregador_id"] = entregador_id
    if campos.get("observacao") is not None:
        update["observacao"] = campos["observacao"]

    if novo_status == "entregue":
        if not (entregador_id or entrega["entregador_id"]):
            raise HTTPException(422, "Atribua um entregador antes de marcar como entregue")
        update["status"] = "entregue"
        update["entregue_em"] = datetime.now(timezone.utc).isoformat()

    if update:
        # .eq("status", "pendente") evita corrida: se alguém finalizou no meio, não grava
        gravou = (
            db.table("entregas")
            .update(update)
            .eq("id", entrega_id)
            .eq("status", "pendente")
            .execute()
            .data
        )
        if not gravou:
            raise HTTPException(409, "A entrega foi alterada por outra pessoa. Recarregue.")

    return _entrega_out(_buscar_entrega(db, entrega_id))


# ------------------------------------------------------------- entregadores


@entregadores_router.get("", response_model=list[EntregadorOut])
def listar_entregadores(ativo: bool | None = True, db: Client = Depends(get_db)):
    q = db.table("entregadores").select("*")
    if ativo is not None:
        q = q.eq("ativo", ativo)
    return q.order("nome").execute().data


@entregadores_router.post("", response_model=EntregadorOut, status_code=201)
def criar_entregador(dados: EntregadorCreate, db: Client = Depends(get_db)):
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(422, "Nome obrigatório")
    telefone = re.sub(r"\D", "", dados.telefone) if dados.telefone else None
    novo = {"nome": nome, "telefone": telefone or None}
    return db.table("entregadores").insert(novo).execute().data[0]


# ------------------------------------------------------------------ regiões


@regioes_router.get("", response_model=list[RegiaoOut])
def listar_regioes(db: Client = Depends(get_db)):
    """Região define a taxa de entrega cobrada na venda."""
    q = db.table("regioes").select("id, nome, taxa_entrega").eq("ativo", True)
    return q.order("nome").execute().data