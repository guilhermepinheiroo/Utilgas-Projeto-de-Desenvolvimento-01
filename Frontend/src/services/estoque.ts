import { seriesGrafico } from "../constants/ProdutosEstoque";
import type {
  CategoriaGrafico,
  FiltroEstoque,
  IdProdutoEstoque,
  Movimentacao,
  PontoGraficoEstoque,
  ResumoEstoque,
} from "../types/Estoque";
import { esperar, valorSimulado } from "../utils/Simulacao";

// Estoque simulado. Com o backend, quem mantém isso é o servidor.
const quantidades: Record<IdProdutoEstoque, number> = {
  botijaoP5: 18,
  botijaoP13: 62,
  botijaoP20: 24,
  botijaoP45: 10,
  agua5l: 20,
  agua10l: 18,
  agua20l: 40,
  valvula: 5,
  mangueira: 3,
};

const variacoesMensais: Record<IdProdutoEstoque, number> = {
  botijaoP5: 4,
  botijaoP13: 12,
  botijaoP20: -3,
  botijaoP45: 0,
  agua5l: 8,
  agua10l: -5,
  agua20l: 15,
  valvula: 2,
  mangueira: -10,
};

const idsProdutos = Object.keys(quantidades) as IdProdutoEstoque[];

const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const movimentacoesIniciais: Movimentacao[] = [
  { id: "1", produtoId: "botijaoP13", quantidade: 1, horario: "08:34", tipo: "saida" },
  { id: "2", produtoId: "agua20l", quantidade: 20, horario: "20:45", tipo: "entrada" },
  { id: "3", produtoId: "agua10l", quantidade: 15, horario: "09:44", tipo: "entrada" },
  { id: "4", produtoId: "agua5l", quantidade: 1, horario: "17:21", tipo: "saida" },
  { id: "5", produtoId: "botijaoP13", quantidade: 10, horario: "09:08", tipo: "entrada" },
  { id: "6", produtoId: "botijaoP45", quantidade: 1, horario: "15:10", tipo: "saida" },
  { id: "7", produtoId: "agua20l", quantidade: 1, horario: "14:50", tipo: "saida" },
  { id: "8", produtoId: "botijaoP20", quantidade: 8, horario: "08:15", tipo: "entrada" },
];

export async function buscarResumoEstoque(filtro: FiltroEstoque): Promise<ResumoEstoque> {
  await esperar();

  if (filtro === "todos") {
    const quantidade = idsProdutos.reduce((soma, id) => soma + quantidades[id], 0);
    return { quantidade, variacaoMensal: 10 };
  }

  return { quantidade: quantidades[filtro], variacaoMensal: variacoesMensais[filtro] };
}

export async function buscarMovimentacoes(): Promise<Movimentacao[]> {
  await esperar();
  return movimentacoesIniciais;
}

export async function buscarEstoqueGrafico(categoria: CategoriaGrafico): Promise<PontoGraficoEstoque[]> {
  await esperar();
  const series = seriesGrafico[categoria];

  return meses.map((rotulo, mes) => {
    const ponto: PontoGraficoEstoque = { rotulo };

    series.forEach((serie, i) => {
      ponto[serie.chave] = valorSimulado(12, mes, i * 1.7);
    });

    return ponto;
  });
}

// SÓ PARA O MOCK: simula uma chegada ou uma venda e já atualiza o estoque simulado.
// Com o backend isso some: o servidor registra a movimentação e o front só lê.
export function gerarMovimentacaoAleatoria(): Movimentacao {
  const produtoId = idsProdutos[Math.floor(Math.random() * idsProdutos.length)];
  const tipo = Math.random() > 0.5 && quantidades[produtoId] > 0 ? "saida" : "entrada";
  const quantidade = tipo === "saida" ? 1 : Math.ceil(Math.random() * 10);

  quantidades[produtoId] += tipo === "entrada" ? quantidade : -quantidade;

  return {
    id: crypto.randomUUID(),
    produtoId,
    quantidade,
    horario: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    tipo,
  };
}