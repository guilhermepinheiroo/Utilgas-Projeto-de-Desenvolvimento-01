import { ItemLista } from "../ItemLista";
import { iconeDaCategoria } from "../../../constants/IconesEstoque";
import type { Movimentacao, TipoMovimentacao } from "../../../types/Estoque";

import iconeSetaVerde from "../../../assets/icon-seta-verde.png";
import iconeSetaVermelha from "../../../assets/icon-seta-vermelha.png";

const configPorTipo: Record<TipoMovimentacao, { texto: string; icone: string }> = {
  entrada: { texto: "Entrada", icone: iconeSetaVerde },
  saida: { texto: "Saída", icone: iconeSetaVermelha },
};

export function ItemMovimentacao({ movimentacao }: { movimentacao: Movimentacao }) {
  const config = configPorTipo[movimentacao.tipo];
  const vazio = movimentacao.tipoEstoque === "vazio" ? " (vazio)" : "";

  return (
    <ItemLista
      icone={iconeDaCategoria(movimentacao.categoria)}
      titulo={`${movimentacao.quantidade}× ${movimentacao.produtoNome}${vazio}`}
      subtitulo={`${movimentacao.horario} • ${config.texto}`}
      acao={<img src={config.icone} alt={config.texto} className="size-4 object-contain" />}
    />
  );
}
