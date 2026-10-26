import type { IdProdutoEstoque } from "./Estoque";

export type FormaPagamento = "pix" | "dinheiro" | "debito" | "credito";
export type StatusVenda = "pago" | "pendente" | "cancelado";
export type OrigemVenda = "portaria" | "entrega";
export type PeriodoVendas = "hoje" | "ontem" | "7dias" | "30dias" | "mes";
export type OrdenacaoVendas = "recentes" | "antigas" | "maior" | "menor";

export type FiltroPagamento = "todos" | FormaPagamento;
export type FiltroStatusVenda = "todos" | StatusVenda;

export interface ProdutoVendido {
  produtoId: IdProdutoEstoque;
  quantidade: number;
  precoUnitarioCentavos: number; // preço no momento da venda
}

export interface ClienteDaVenda {
  id: string;
  nome: string;
  cpf: string | null; // só dígitos
}

export interface RegistroVenda {
  id: string;
  cliente: ClienteDaVenda | null; // null = "Cliente Indefinido"
  origem: OrigemVenda;
  itens: ProdutoVendido[];
  dataHora: string; // "2026-09-19T11:45:00"
  pagamento: FormaPagamento;
  status: StatusVenda;
  totalCentavos: number;
}

export interface FiltrosVendas {
  periodo: PeriodoVendas;
  clienteId: string | null;
  pagamento: FiltroPagamento;
  status: FiltroStatusVenda;
  busca: string;
}

export interface ParametrosBuscaVendas extends FiltrosVendas {
  ordenacao: OrdenacaoVendas;
  pagina: number;
  tamanhoPagina: number;
}

export interface PaginaVendas {
  itens: RegistroVenda[];
  total: number;
}

export interface ResumoVendas {
  totalCentavos: number;
  quantidade: number;
  clientesAtendidos: number;
  ticketMedioCentavos: number;
}