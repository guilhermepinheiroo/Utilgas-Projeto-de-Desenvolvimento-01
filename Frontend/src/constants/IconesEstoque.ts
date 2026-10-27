import iconeBotijao from "../assets/Icon-botijão.png";
import iconeGalao from "../assets/icon-galao.png";
import iconeValvula from "../assets/icon-valvula.png";
import type { TipoProduto } from "../types/Dashboard";

export const iconePorProduto: Record<TipoProduto, string> = {
  botijao: iconeBotijao,
  agua: iconeGalao,
  acessorio: iconeValvula,
};

export function iconeDaCategoria(categoria: string | null | undefined): string {
  if (categoria === "gas") return iconeBotijao;
  if (categoria === "agua") return iconeGalao;
  return iconeValvula;
}
