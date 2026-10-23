import iconeBotijao from "../assets/Icon-botijão.png";
import iconeGalao from "../assets/icon-galao.png";
import type { TipoProduto } from "../types/Dashboard";

export const iconePorProduto: Record<TipoProduto, string> = {
  botijao: iconeBotijao,
  agua: iconeGalao,
};