import type { IdProdutoEstoque } from "./Estoque";

export type StatusEntrega = "pendente" | "entregue" | "cancelada";
export type FiltroStatusEntrega = "todos" | StatusEntrega;

export interface Entregador {
  id: string;
  nome: string;
}

// O endereço vem do cadastro do cliente
export interface ClienteDaEntrega {
  id: string;
  nome: string;
  whatsapp: string; // só dígitos
  endereco: string;
  bairro: string | null;
}

export interface ItemDaEntrega {
  produtoId: IdProdutoEstoque;
  quantidade: number;
}

export interface Entrega {
  id: string;
  numeroPedido: number;
  status: StatusEntrega;
  cliente: ClienteDaEntrega;
  entregador: Entregador;
  itens: ItemDaEntrega[];
  horarioPrevisto: string; // ISO: "2026-10-26T16:30:00"
  totalCentavos: number;
}

export interface FiltrosEntregas {
  data: string; // "2026-10-26"
  busca: string;
  entregadorId: string; // "todos" ou o id do entregador
  status: FiltroStatusEntrega;
}

export interface ParametrosBuscaEntregas extends FiltrosEntregas {
  pagina: number;
  tamanhoPagina: number;
}

export interface PaginaEntregas {
  itens: Entrega[];
  total: number;
}

export interface ResumoEntregas {
  total: number; // sem as canceladas
  variacaoPercentual: number | null; // em relação ao dia anterior
  pendentes: number;
  concluidas: number;
}