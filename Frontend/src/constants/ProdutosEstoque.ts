import type { SerieGrafico } from "../components/dashboard/GraficoLinhas";
import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import type { TipoProduto } from "../types/Dashboard";
import type { CategoriaGrafico, FiltroEstoque, IdProdutoEstoque } from "../types/Estoque";

interface ProdutoCatalogo {
  nome: string;
  tipoIcone?: TipoProduto; // válvula e mangueira ainda não têm ícone
}

export const catalogoProdutos: Record<IdProdutoEstoque, ProdutoCatalogo> = {
  botijaoP5: { nome: "Botijão P5", tipoIcone: "botijao" },
  botijaoP13: { nome: "Botijão P13", tipoIcone: "botijao" },
  botijaoP20: { nome: "Botijão P20", tipoIcone: "botijao" },
  botijaoP45: { nome: "Botijão P45", tipoIcone: "botijao" },
  agua5l: { nome: "Água 5L", tipoIcone: "agua" },
  agua10l: { nome: "Água 10L", tipoIcone: "agua" },
  agua20l: { nome: "Água 20L", tipoIcone: "agua" },
  valvula: { nome: "Válvula de gás" },
  mangueira: { nome: "Mangueira" },
};

export const opcoesFiltroEstoque: OpcaoSeletor<FiltroEstoque>[] = [
  { valor: "todos", rotulo: "Todos os produtos" },
  ...(Object.keys(catalogoProdutos) as IdProdutoEstoque[]).map((id) => ({
    valor: id,
    rotulo: catalogoProdutos[id].nome,
  })),
];

export const opcoesCategoriaGrafico: OpcaoSeletor<CategoriaGrafico>[] = [
  { valor: "agua", rotulo: "Água" },
  { valor: "gas", rotulo: "Gás" },
];

export const seriesGrafico: Record<CategoriaGrafico, SerieGrafico[]> = {
  agua: [
    { chave: "agua5l", nome: "Galão de 5L", cor: "#1d5fa8" },
    { chave: "agua10l", nome: "Galão de 10L", cor: "#f5c518" },
    { chave: "agua20l", nome: "Galão de 20L", cor: "#2e9e1a" },
  ],
  gas: [
    { chave: "botijaoP5", nome: "Botijão P5", cor: "#f5c518" },
    { chave: "botijaoP13", nome: "Botijão P13", cor: "#1d5fa8" },
    { chave: "botijaoP20", nome: "Botijão P20", cor: "#2e9e1a" },
    { chave: "botijaoP45", nome: "Botijão P45", cor: "#f28c38" },
  ],
};