import { api } from "./Api";
import type {
  MovimentacaoEstoque,
  MovimentacaoInput,
  OrigemMovimentacao,
  ResumoEstoqueGestao,
  TipoEstoque,
  TipoMovimentacaoEstoque,
  TrocaVazioInput,
} from "../types/EstoqueGestao";

export { buscarProdutos as buscarProdutosEstoque } from "./Produtos";

interface MovimentacaoApi {
  id: number;
  produto_id: number;
  produto_nome: string;
  produto_categoria: string | null;
  tipo: TipoMovimentacaoEstoque;
  tipo_estoque: TipoEstoque;
  quantidade: number;
  origem: OrigemMovimentacao;
  observacao: string | null;
  criado_em: string;
}

function movimentacaoDeApi(m: MovimentacaoApi): MovimentacaoEstoque {
  return {
    id: String(m.id),
    produtoId: String(m.produto_id),
    produtoNome: m.produto_nome,
    produtoCategoria: m.produto_categoria,
    tipo: m.tipo,
    tipoEstoque: m.tipo_estoque,
    origem: m.origem,
    quantidade: m.quantidade,
    observacao: m.observacao,
    dataHora: m.criado_em,
  };
}

export async function buscarResumoEstoqueGestao(): Promise<ResumoEstoqueGestao> {
  const r = await api.get<{
    total_em_estoque: number;
    total_vazios: number;
    entradas_hoje: number;
    entradas_mes: number;
    saidas_mes: number;
    itens_com_baixo_estoque: number;
  }>("/estoque/resumo");
  return {
    total: r.total_em_estoque,
    vazios: r.total_vazios,
    entradasHoje: r.entradas_hoje,
    entradasMes: r.entradas_mes,
    saidasMes: r.saidas_mes,
    baixoEstoque: r.itens_com_baixo_estoque,
  };
}

export async function buscarMovimentacoesEstoque(limite = 50): Promise<MovimentacaoEstoque[]> {
  const lista = await api.get<MovimentacaoApi[]>("/estoque/movimentacoes", { limite });
  return lista.map(movimentacaoDeApi);
}

export async function registrarMovimentacao(input: MovimentacaoInput): Promise<void> {
  await api.post("/estoque/movimentacoes", {
    produto_id: Number(input.produtoId),
    tipo: input.tipo,
    quantidade: input.quantidade,
    estoque: input.estoque,
    origem: input.origem,
    observacao: input.observacao?.trim() || null,
  });
}

export async function registrarTrocaVazio(input: TrocaVazioInput): Promise<void> {
  await api.post("/estoque/movimentacoes", {
    produto_id: Number(input.produtoId),
    tipo: "entrada",
    quantidade: input.quantidade,
    estoque: "cheio",
    origem: "troca_vazio",
    observacao: input.observacao?.trim() || null,
  });
}
