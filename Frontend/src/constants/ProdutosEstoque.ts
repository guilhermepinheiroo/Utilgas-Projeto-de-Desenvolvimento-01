import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import type { CategoriaGrafico } from "../types/Estoque";
import type { CategoriaProduto } from "../types/Produtos";

export const rotulosCategoria: Record<CategoriaProduto, string> = {
  gas: "Gás GLP",
  agua: "Água Mineral",
  acessorio: "Acessórios / Outros",
};

export const opcoesCategoriaGrafico: OpcaoSeletor<CategoriaGrafico>[] = [
  { valor: "agua", rotulo: "Água" },
  { valor: "gas", rotulo: "Gás" },
];

export const paletaGrafico = ["#1d5fa8", "#f5c518", "#2e9e1a", "#f28c38", "#8e44ad", "#c0392b"];
