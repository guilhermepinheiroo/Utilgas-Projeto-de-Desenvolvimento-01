import { ItemLista } from "../ItemLista";
import { iconePorProduto } from "../../../constants/IconesEstoque";
import { catalogoProdutos } from "../../../constants/ProdutosEstoque";
import type { Movimentacao, TipoMovimentacao } from "../../../types/Estoque";

import iconeSetaVerde from "../../../assents/icon-seta-verde.png";
import iconeSetaVermelha from "../../../assents/icon-seta-vermelha.png";

const configPorTipo: Record<TipoMovimentacao, { texto: string; icone: string }> = {
  entrada: { texto: "Entrada", icone: iconeSetaVerde },
  saida: { texto: "Saída", icone: iconeSetaVermelha },
};

export function ItemMovimentacao({ movimentacao }: { movimentacao: Movimentacao }) {
  const produto = catalogoProdutos[movimentacao.produtoId];
  const config = configPorTipo[movimentacao.tipo];

  return (
    <ItemLista
      icone={produto.tipoIcone ? iconePorProduto[produto.tipoIcone] : undefined}
      titulo={produto.nome}
      subtitulo={`${movimentacao.horario} • ${config.texto}`}
      acao={<img src={config.icone} alt={config.texto} className="size-4 object-contain" />}
    />
  );
}