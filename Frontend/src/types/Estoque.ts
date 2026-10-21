export type IdProdutoEstoque =
  | "botijaoP5"
  | "botijaoP13"
  | "botijaoP20"
  | "botijaoP45"
  | "agua5l"
  | "agua10l"
  | "agua20l"
  | "valvula"
  | "mangueira";

export type FiltroEstoque = "todos" | IdProdutoEstoque;

export type CategoriaGrafico = "agua" | "gas";

export type TipoMovimentacao = "entrada" | "saida";

export interface ResumoEstoque {
  quantidade: number;
  variacaoMensal: number; // em %, pode ser negativa
}

export interface Movimentacao {
  id: string;
  produtoId: IdProdutoEstoque;
  quantidade: number;
  horario: string;
  tipo: TipoMovimentacao;
}

export interface PontoGraficoEstoque {
  rotulo: string;
  [produto: string]: string | number;
}