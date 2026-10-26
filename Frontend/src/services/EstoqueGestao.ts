import { api } from "./Api";
import type {
  MovimentacaoEstoque,
  ProdutoEstoque,
  ProdutoInput,
  ResumoEstoqueGestao,
  TipoTrocaVazio,
} from "../types/EstoqueGestao";

export function buscarProdutosEstoque(params?: { busca?: string; categoria?: string }) {
  return api.get<ProdutoEstoque[]>("/estoque/produtos", params);
}

export function buscarResumoEstoqueGestao() {
  return api.get<ResumoEstoqueGestao>("/estoque/resumo");
}

export function buscarMovimentacoesEstoque() {
  return api.get<MovimentacaoEstoque[]>("/estoque/movimentacoes");
}

export function criarProdutoEstoque(input: ProdutoInput) {
  return api.post<ProdutoEstoque>("/estoque/produtos", input);
}

export function editarProdutoEstoque(id: string, input: Partial<ProdutoInput>) {
  return api.patch<ProdutoEstoque>(`/estoque/produtos/${encodeURIComponent(id)}`, input);
}

export function excluirProdutoEstoque(id: string) {
  return api.delete(`/estoque/produtos/${encodeURIComponent(id)}`);
}

export function registrarMovimentacao(input: {
  produtoId: string;
  quantidade: number;
  tipo: "entrada" | "saida";
}) {
  return api.post("/estoque/movimentacoes", input);
}

export function registrarTrocaVazio(input: {
  tipo: TipoTrocaVazio;
  quantidade: number;
}) {
  return api.post("/estoque/trocas-vazio", input);
}
