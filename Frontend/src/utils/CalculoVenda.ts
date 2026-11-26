import type { FormaPagamento } from "../types/Vendas";
import type { CategoriaProduto } from "../types/Produtos";

interface ItemComDesconto {
  produto: {
    categoria: CategoriaProduto;
    nome: string;
    precoCentavos: number;
  };
  quantidade: number;
  descontoCentavos: number;
}

export function ehBotijaoP13(produto: {
  categoria: CategoriaProduto;
  nome: string;
}): boolean {
  return (
    produto.categoria === "gas" &&
    /(^|[^a-z0-9])p13([^a-z0-9]|$)/i.test(produto.nome)
  );
}

export function descontoEfetivoDoItem(
  item: ItemComDesconto,
  pagamento: FormaPagamento
): number {
  if (pagamento === "gas_do_povo" && ehBotijaoP13(item.produto)) {
    return item.produto.precoCentavos * item.quantidade;
  }
  return item.descontoCentavos;
}

export function subtotalCobradoDoItem(
  item: ItemComDesconto,
  pagamento: FormaPagamento
): number {
  return (
    item.produto.precoCentavos * item.quantidade -
    descontoEfetivoDoItem(item, pagamento)
  );
}
