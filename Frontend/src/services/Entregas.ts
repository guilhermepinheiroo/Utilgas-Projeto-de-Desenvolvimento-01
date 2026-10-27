import type {
  Entrega,
  Entregador,
  PaginaEntregas,
  ParametrosBuscaEntregas,
  ResumoEntregas,
  StatusEntrega,
} from "../types/Entregas";
import { api, paraCentavos } from "./Api";

interface EntregaApi {
  id: number;
  venda_id: number;
  status: StatusEntrega;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  entregador_id: number | null;
  entregador_nome: string | null;
  endereco: string | null;
  bairro: string | null;
  itens: { produto_nome: string; categoria: string | null; quantidade: number }[];
  valor: number;
  observacao: string | null;
  criado_em: string;
  entregue_em: string | null;
}

function entregaDeApi(e: EntregaApi): Entrega {
  return {
    id: String(e.id),
    numeroPedido: e.venda_id,
    status: e.status,
    cliente: {
      nome: e.cliente_nome ?? "Cliente não identificado",
      whatsapp: e.cliente_telefone ?? "",
      endereco: e.endereco ?? "—",
      bairro: e.bairro,
    },
    entregador:
      e.entregador_id !== null
        ? { id: String(e.entregador_id), nome: e.entregador_nome ?? "Entregador" }
        : null,
    itens: e.itens.map((i) => ({
      produtoNome: i.produto_nome,
      categoria: i.categoria,
      quantidade: i.quantidade,
    })),
    criadoEm: e.criado_em,
    entregueEm: e.entregue_em,
    observacao: e.observacao,
    totalCentavos: paraCentavos(e.valor),
  };
}

export async function buscarEntregas({
  data,
  busca,
  entregadorId,
  status,
  pagina,
  tamanhoPagina,
}: ParametrosBuscaEntregas): Promise<PaginaEntregas> {
  const lista = await api.get<EntregaApi[]>("/entregas", {
    data,
    busca: busca.trim(),
    entregador_id: entregadorId === "todos" ? undefined : entregadorId,
    status: status === "todos" ? undefined : status,
  });
  const inicio = (pagina - 1) * tamanhoPagina;
  return {
    itens: lista.slice(inicio, inicio + tamanhoPagina).map(entregaDeApi),
    total: lista.length,
  };
}

export async function buscarResumoEntregas(data: string): Promise<ResumoEntregas> {
  const r = await api.get<{
    total_hoje: number;
    pendentes: number;
    concluidas: number;
    variacao_vs_ontem_pct: number | null;
  }>("/entregas/resumo", { data });
  return {
    total: r.total_hoje,
    pendentes: r.pendentes,
    concluidas: r.concluidas,
    variacaoPercentual: r.variacao_vs_ontem_pct,
  };
}

export async function buscarEntregadores(): Promise<Entregador[]> {
  const lista = await api.get<{ id: number; nome: string }[]>("/entregadores");
  return lista.map((e) => ({ id: String(e.id), nome: e.nome }));
}

export async function trocarEntregador(id: string, entregadorId: string): Promise<void> {
  await api.patch(`/entregas/${encodeURIComponent(id)}`, { entregador_id: Number(entregadorId) });
}

export async function finalizarEntrega(id: string): Promise<void> {
  await api.patch(`/entregas/${encodeURIComponent(id)}`, { status: "entregue" });
}

export async function cancelarEntrega(id: string, motivo?: string): Promise<void> {
  await api.patch(`/entregas/${encodeURIComponent(id)}`, {
    status: "cancelada",
    ...(motivo ? { observacao: `Cancelada: ${motivo}` } : {}),
  });
}
