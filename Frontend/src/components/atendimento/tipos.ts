import type { Produto } from "../../types/Produtos";

export interface ItemPedido {
  produto: Produto;
  quantidade: number;
  descontoCentavos: number;
}

export const subtotalDoItem = (item: ItemPedido) =>
  item.produto.precoCentavos * item.quantidade - item.descontoCentavos;

export const nomesEtapas = ["Cliente", "Endereço", "Itens", "Pagamento"] as const;
