import { ItemLista } from "../ItemLista";
import type { TipoProduto, Venda } from "../../../types/Dashboard";

import iconeBotijao from "../../../assents/Icon-botijão.png";
import iconeGalao from "../../../assents/galao.png";
import iconeCifrao from "../../../assents/icon-cifrao.png";

const iconePorProduto: Record<TipoProduto, string> = {
  botijao: iconeBotijao,
  agua: iconeGalao,
};

export function ItemVenda({ venda }: { venda: Venda }) {
  return (
    <ItemLista
      icone={iconePorProduto[venda.tipo]}
      titulo={venda.produto}
      subtitulo={`${venda.horario} • ${venda.status}`}
      acao={<img src={iconeCifrao} alt="Venda realizada" className="size-5 object-contain" />}
    />
  );
}