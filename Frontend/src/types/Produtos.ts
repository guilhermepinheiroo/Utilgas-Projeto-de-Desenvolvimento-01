export type CategoriaProduto = "gas" | "agua" | "acessorio";
export type NivelEstoque = "normal" | "baixo" | "critico";

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  precoCentavos: number;
  quantidade: number; // unidades CHEIAS (o que se pode vender)
  vazios: number; // vasilhames VAZIOS (só se controlaVazio)
  controlaVazio: boolean;
  estoqueMinimo: number;
  ativo: boolean;
  nivelEstoque: NivelEstoque;
}

export interface ProdutoInput {
  nome: string;
  categoria: CategoriaProduto;
  precoCentavos: number;
  estoqueMinimo: number;
  estoqueInicial?: number; // só na criação
}
