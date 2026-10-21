import iconeBotijao from "../assents/Icon-botijão.png";
import iconeGalao from "../assents/galao.png";
import type { TipoProduto } from "../types/Dashboard";

export const iconePorProduto: Record<TipoProduto, string> = {
  botijao: iconeBotijao,
  agua: iconeGalao,
};