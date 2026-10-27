"""Módulo Vendas — responsável: Back-end 1."""
import re
import unicodedata
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.core.auth import get_current_user, get_db
from app.core.db_errors import chamar_rpc
from app.core.frequencia import JANELA_CONTATO_DIAS, datas_de_compra, frequencia_media
from app.core.tempo import agora, meia_noite, para_iso_utc
from app.vendas.schemas import (
    EntregaCriada,
    FormaPagamento,
    FrequenciaRecalculada,
    ItemVendaOut,
    Origem,
    StatusVenda,
    TotaisVendas,
    VendaCreate,
    VendaOut,
    VendasLista,
)

router = APIRouter(prefix="/vendas", tags=["Vendas"])

SELECT_VENDA = (
    "*, clientes(nome, cpf_cnpj, telefone), "
    "itens_venda(*, produtos(nome, categoria)), "
    "entregas(id, status, entregador_id, enderecos(regioes(nome)))"
)

LIMITE_CONSULTA = 5000
Periodo = Literal["hoje", "ontem", "7d", "30d", "mes"]
Ordem = Literal["mais_recentes", "mais_antigas", "maior_valor", "menor_valor"]


def _normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFD", texto)
    return "".join(c for c in sem_acento if unicodedata.category(c) != "Mn").lower()


def _um(valor):
    """PostgREST devolve objeto ou lista de um item, conforme a relação."""
    if isinstance(valor, list):
        return valor[0] if valor else None
    return valor


def _venda_out(row: dict) -> VendaOut:
    cliente = row.get("clientes") or {}
    entrega = _um(row.get("entregas"))
    itens = sorted(row.get("itens_venda") or [], key=lambda i: i["id"])
    return VendaOut(
        id=row["id"],
        criado_em=row["criado_em"],
        origem=row["origem"],
        cliente_id=row.get("cliente_id"),
        cliente_nome=cliente.get("nome"),
        cliente_cpf=cliente.get("cpf_cnpj"),
        cliente_telefone=cliente.get("telefone"),
        forma_pagamento=row["forma_pagamento"],
        subtotal=row["subtotal"],
        desconto=row["desconto"],
        taxa_entrega=row["taxa_entrega"],
        total=row["total"],
        status=row["status"],
        itens=[
            ItemVendaOut(
                produto_id=i["produto_id"],
                produto_nome=(i.get("produtos") or {}).get("nome", ""),
                categoria=(i.get("produtos") or {}).get("categoria"),
                quantidade=i["quantidade"],
                preco_unitario=i["preco_unitario"],
                desconto=i["desconto"],
                subtotal=i["subtotal"],
            )
            for i in itens
        ],
        entrega=(
            EntregaCriada(
                id=entrega["id"],
                status=entrega["status"],
                regiao=((entrega.get("enderecos") or {}).get("regioes") or {}).get("nome"),
                entregador_id=entrega.get("entregador_id"),
            )
            if entrega
            else None
        ),
    )


def _buscar_venda(db: Client, venda_id: int) -> dict:
    rows = db.table("vendas").select(SELECT_VENDA).eq("id", venda_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Venda não encontrada")
    return rows[0]


def _intervalo(
    periodo: Periodo | None, data_inicio: date | None, data_fim: date | None
) -> tuple[date, date]:
    hoje = agora().date()
    if data_inicio or data_fim:
        fim = data_fim or hoje
        inicio = data_inicio or fim
    elif periodo == "hoje":
        inicio = fim = hoje
    elif periodo == "ontem":
        inicio = fim = hoje - timedelta(days=1)
    elif periodo == "7d":
        inicio, fim = hoje - timedelta(days=6), hoje
    elif periodo == "mes":
        inicio, fim = hoje.replace(day=1), hoje
    else:  # 30d (padrão)
        inicio, fim = hoje - timedelta(days=29), hoje
    if inicio > fim:
        raise HTTPException(422, "data_inicio não pode ser depois de data_fim")
    return inicio, fim


def _limite_utc(dia: date) -> str:
    """Meia-noite do dia em Brasília, em UTC (formato aceito pelo PostgREST)."""
    return para_iso_utc(meia_noite(dia))


# ---------------------------------------------------------------- registrar


@router.post("", response_model=VendaOut, status_code=201)
def registrar_venda(
    dados: VendaCreate,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Tudo acontece em UMA transação dentro da função SQL `registrar_venda`:
    valida estoque, copia o preço do produto, calcula subtotal/taxa/total,
    grava venda + itens, baixa 1 CHEIO e sobe 1 VAZIO por unidade (produtos com
    controla_vazio), grava as movimentações e cria a entrega pendente (atendimento).

    Erros: 404 (cliente/produto/endereço), 409 (estoque insuficiente), 422 (dados inválidos).
    """
    datas_antes: list[date] = []
    if dados.cliente_id is not None:
        datas_antes = datas_de_compra(db, dados.cliente_id)

    p_dados = dados.model_dump()
    if p_dados.get("observacao_entregador"):
        p_dados["observacao_entregador"] = p_dados["observacao_entregador"].strip()

    resultado = chamar_rpc(
        db, "registrar_venda", {"p_dados": p_dados, "p_usuario_id": user["id"]}
    )
    venda_id = resultado["venda"]["id"]
    venda = _venda_out(_buscar_venda(db, venda_id))

    if dados.cliente_id is not None:
        try:
            anterior = frequencia_media(datas_antes)
            datas_depois = datas_de_compra(db, dados.cliente_id)
            nova = frequencia_media(datas_depois)
            dentro = None
            if anterior is not None and datas_antes:
                dias_desde = (datas_depois[-1] - datas_antes[-1]).days
                dentro = abs(dias_desde - anterior) <= JANELA_CONTATO_DIAS
            venda.frequencia = FrequenciaRecalculada(
                anterior_dias=anterior,
                nova_dias=nova,
                recompra_prevista_em_dias=nova,
                dentro_da_janela_de_contato=dentro,
            )
        except Exception:
            venda.frequencia = None

    entrega = resultado.get("entrega")
    if entrega and venda.entrega:
        venda.entrega.regiao = entrega.get("regiao") or venda.entrega.regiao
    return venda


# ---------------------------------------------------------------- consultar


@router.get("", response_model=VendasLista)
def listar_vendas(
    periodo: Periodo | None = Query(None, description="Ignorado se data_inicio/data_fim vierem"),
    data_inicio: date | None = None,
    data_fim: date | None = None,
    cliente_id: int | None = None,
    forma_pagamento: FormaPagamento | None = None,
    status: StatusVenda | None = None,
    origem: Origem | None = None,
    busca: str | None = Query(None, description="Cliente, produto, CPF ou nº do pedido"),
    ordem: Ordem = "mais_recentes",
    pagina: int = Query(1, ge=1),
    tamanho: int = Query(20, ge=1, le=100),
    db: Client = Depends(get_db),
):
    """Histórico de Vendas: filtros + totais do período (padrão: últimos 30 dias)."""
    inicio, fim = _intervalo(periodo, data_inicio, data_fim)
    q = (
        db.table("vendas")
        .select(SELECT_VENDA)
        .gte("criado_em", _limite_utc(inicio))
        .lt("criado_em", _limite_utc(fim + timedelta(days=1)))
    )
    if cliente_id is not None:
        q = q.eq("cliente_id", cliente_id)
    if forma_pagamento:
        q = q.eq("forma_pagamento", forma_pagamento)
    if status:
        q = q.eq("status", status)
    if origem:
        q = q.eq("origem", origem)
    rows = q.order("criado_em", desc=True).limit(LIMITE_CONSULTA).execute().data
    vendas = [_venda_out(r) for r in rows]

    if busca and busca.strip():
        termo = _normalizar(busca.strip())
        numero = busca.strip().lstrip("#")
        digitos = re.sub(r"\D", "", busca)

        def combina(v: VendaOut) -> bool:
            textos = [v.cliente_nome or "cliente indefinido"] + [i.produto_nome for i in v.itens]
            if any(termo in _normalizar(t) for t in textos):
                return True
            if numero.isdigit() and int(numero) == v.id:
                return True
            return bool(digitos) and len(digitos) >= 3 and digitos in (v.cliente_cpf or "")

        vendas = [v for v in vendas if combina(v)]

    validas = [v for v in vendas if v.status != "cancelada"]
    soma = round(sum(v.total for v in validas), 2)
    totais = TotaisVendas(
        total_vendas=soma,
        quantidade_vendas=len(validas),
        clientes_atendidos=len({v.cliente_id for v in validas if v.cliente_id is not None}),
        ticket_medio=round(soma / len(validas), 2) if validas else 0,
    )

    chaves = {
        "mais_recentes": (lambda v: v.criado_em, True),
        "mais_antigas": (lambda v: v.criado_em, False),
        "maior_valor": (lambda v: v.total, True),
        "menor_valor": (lambda v: v.total, False),
    }
    chave, reverso = chaves[ordem]
    vendas.sort(key=chave, reverse=reverso)

    inicio_pag = (pagina - 1) * tamanho
    return VendasLista(
        totais=totais,
        itens=vendas[inicio_pag : inicio_pag + tamanho],
        total=len(vendas),
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/{venda_id}", response_model=VendaOut)
def obter_venda(venda_id: int, db: Client = Depends(get_db)):
    return _venda_out(_buscar_venda(db, venda_id))


@router.post("/{venda_id}/cancelar", response_model=VendaOut)
def cancelar_venda(
    venda_id: int,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Cancela a venda (e a entrega pendente) e devolve os itens ao estoque.
    409 se já estiver cancelada ou se a entrega já foi realizada."""
    chamar_rpc(db, "cancelar_venda", {"p_venda_id": venda_id, "p_usuario_id": user["id"]})
    return _venda_out(_buscar_venda(db, venda_id))
