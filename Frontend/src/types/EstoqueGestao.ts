export type CategoriaProduto = "gas" | "agua" | "outros";
export type TipoMovimentacaoEstoque = "entrada" | "saida";
export type TipoTrocaVazio = "gas" | "agua";

export interface ProdutoEstoque {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  quantidade: number;
  precoCentavos: number;
  estoqueMinimo: number;
}

export interface ResumoEstoqueGestao {
  total: number;
  entradasMes: number;
  saidasMes: number;
  baixoEstoque: number;
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  produtoNome: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  dataHora: string;
}

export interface ProdutoInput {
  nome: string;
  categoria: CategoriaProduto;
  precoCentavos: number;
  estoqueInicial: number;
  estoqueMinimo: number;
}
