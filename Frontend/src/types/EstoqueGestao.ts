export type TipoMovimentacaoEstoque = "entrada" | "saida";
export type TipoEstoque = "cheio" | "vazio";
export type OrigemMovimentacao = "compra" | "ajuste" | "troca_vazio" | "venda" | "cancelamento";

export interface ResumoEstoqueGestao {
  total: number; // cheios
  vazios: number;
  entradasHoje: number;
  entradasMes: number;
  saidasMes: number;
  baixoEstoque: number;
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  produtoNome: string;
  produtoCategoria: string | null;
  tipo: TipoMovimentacaoEstoque;
  tipoEstoque: TipoEstoque;
  origem: OrigemMovimentacao;
  quantidade: number;
  observacao: string | null;
  dataHora: string; // ISO
}

export interface MovimentacaoInput {
  produtoId: string;
  quantidade: number;
  tipo: TipoMovimentacaoEstoque;
  estoque: TipoEstoque;
  origem: "compra" | "ajuste";
  observacao?: string;
}

export interface TrocaVazioInput {
  produtoId: string;
  quantidade: number;
  observacao?: string;
}
