import type { CartaoSelecionado } from "../types/Cartao";
import type { FormaPagamento } from "../types/Vendas";

export const cartaoVazio: CartaoSelecionado = { maquininhaId: "", bandeiraId: "" };

export function pagaComCartao(forma: FormaPagamento): boolean {
  return forma === "credito" || forma === "debito";
}

export function cartaoIncompleto(forma: FormaPagamento, cartao: CartaoSelecionado): boolean {
  return pagaComCartao(forma) && (!cartao.maquininhaId || !cartao.bandeiraId);
}
