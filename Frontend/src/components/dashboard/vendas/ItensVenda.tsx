import { ItemLista } from "../ItemLista";
import type { Venda } from "../../../types/Dashboard";

import { iconePorProduto } from "../../../constants/IconesEstoque";
import iconeCifrao from "../../../assets/icon-cifrao.png";

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