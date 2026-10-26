interface ProdutoCatalogo {
  nome: string;
  descricao: string;
  precoCentavos: number;
  tipoIcone?: TipoProduto; // válvula e mangueira ainda não têm ícone
}

export const catalogoProdutos: Record<IdProdutoEstoque, ProdutoCatalogo> = {
  botijaoP5: { nome: "Botijão P5", descricao: "P5 - Botijão de gás 5kg", precoCentavos: 7500, tipoIcone: "botijao" },
  botijaoP13: { nome: "Botijão P13", descricao: "P13 - Botijão de gás 13kg", precoCentavos: 13000, tipoIcone: "botijao" },
  botijaoP20: { nome: "Botijão P20", descricao: "P20 - Botijão de gás 20kg", precoCentavos: 19000, tipoIcone: "botijao" },
  botijaoP45: { nome: "Botijão P45", descricao: "P45 - Botijão de gás 45kg", precoCentavos: 42000, tipoIcone: "botijao" },
  agua5l: { nome: "Água 5L", descricao: "Galão de Água 5 litros", precoCentavos: 700, tipoIcone: "agua" },
  agua10l: { nome: "Água 10L", descricao: "Galão de Água 10 litros", precoCentavos: 1000, tipoIcone: "agua" },
  agua20l: { nome: "Água 20L", descricao: "Galão de Água 20 litros", precoCentavos: 1800, tipoIcone: "agua" },
  valvula: { nome: "Válvula de gás", descricao: "Válvula de gás", precoCentavos: 3500 },
  mangueira: { nome: "Mangueira", descricao: "Mangueira de gás", precoCentavos: 2500 },
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
import type { SerieGrafico } from "../components/dashboard/GraficoLinhas";
import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import type { CategoriaGrafico, FiltroEstoque, IdProdutoEstoque } from "../types/Estoque";
import type { TipoProduto } from "../types/Dashboard";
