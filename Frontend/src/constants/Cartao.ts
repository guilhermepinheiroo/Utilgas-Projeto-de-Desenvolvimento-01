import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import type { TipoOpcaoCartao } from "../types/Cartao";

export const nomesOpcaoCartao: Record<TipoOpcaoCartao, { singular: string; titulo: string }> = {
  maquininhas: { singular: "maquininha", titulo: "Maquininha" },
  bandeiras: { singular: "bandeira", titulo: "Bandeira" },
};

export const opcoesTipoCartao: OpcaoSeletor<TipoOpcaoCartao>[] = [
  { valor: "maquininhas", rotulo: "Maquininhas" },
  { valor: "bandeiras", rotulo: "Bandeiras" },
];
