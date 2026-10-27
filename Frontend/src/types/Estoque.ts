export type FiltroEstoque = "todos" | string; // "todos" ou o id do produto

export type CategoriaGrafico = "agua" | "gas";

export type TipoMovimentacao = "entrada" | "saida";

export interface ResumoEstoque {
  quantidade: number;
  variacaoMensal: number | null; // em %, pode ser negativa
}

export interface Movimentacao {
  id: string;
  produtoNome: string;
  categoria: string | null;
  quantidade: number;
  horario: string;
  tipo: TipoMovimentacao;
  tipoEstoque: "cheio" | "vazio";
}

export interface PontoGraficoEstoque {
  rotulo: string;
  [produto: string]: string | number;
}
