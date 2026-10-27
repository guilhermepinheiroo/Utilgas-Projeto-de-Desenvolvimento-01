import type { SerieGrafico } from "../components/dashboard/GraficoLinhas";
import { paletaGrafico } from "../constants/ProdutosEstoque";
import type {
  CategoriaGrafico,
  FiltroEstoque,
  Movimentacao,
  PontoGraficoEstoque,
  ResumoEstoque,
} from "../types/Estoque";
import { formatarDataHora } from "../utils/FormataData";
import { api } from "./Api";
import { buscarMovimentacoesEstoque } from "./EstoqueGestao";

export async function buscarResumoEstoque(filtro: FiltroEstoque): Promise<ResumoEstoque> {
  const r = await api.get<{ quantidade: number; variacao_mensal_pct: number | null }>(
    "/dashboard/estoque-resumo",
    { produto_id: filtro === "todos" ? undefined : filtro }
  );
  return { quantidade: r.quantidade, variacaoMensal: r.variacao_mensal_pct };
}

export async function buscarMovimentacoes(): Promise<Movimentacao[]> {
  const lista = await buscarMovimentacoesEstoque(50);
  return lista.map((m) => ({
    id: m.id,
    produtoNome: m.produtoNome,
    categoria: m.produtoCategoria,
    quantidade: m.quantidade,
    horario: formatarDataHora(m.dataHora).hora,
    tipo: m.tipo,
    tipoEstoque: m.tipoEstoque,
  }));
}

export async function buscarEstoqueGrafico(
  categoria: CategoriaGrafico
): Promise<{ series: SerieGrafico[]; dados: PontoGraficoEstoque[] }> {
  const r = await api.get<{
    series: { chave: string; nome: string }[];
    pontos: PontoGraficoEstoque[];
  }>("/dashboard/estoque-mensal", { categoria });

  return {
    series: r.series.map((serie, i) => ({ ...serie, cor: paletaGrafico[i % paletaGrafico.length] })),
    dados: r.pontos,
  };
}
