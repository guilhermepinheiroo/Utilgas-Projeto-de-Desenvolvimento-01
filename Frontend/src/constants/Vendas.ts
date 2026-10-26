import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import type { CorSelo } from "../components/Selo";
import type {
  FiltroPagamento,
  FiltroStatusVenda,
  FormaPagamento,
  OrdenacaoVendas,
  OrigemVenda,
  PeriodoVendas,
  StatusVenda,
} from "../types/Vendas";

import iconeDinheiro from "../assets/telavendas/icon-dinheiro-vivo.png";
import iconePix from "../assets/telavendas/icon-pix.png";

export const TAMANHO_PAGINA_VENDAS = 8;

export const rotulosPagamento: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
};

// Débito e crédito ainda não têm ícone
export const iconePorPagamento: Partial<Record<FormaPagamento, string>> = {
  pix: iconePix,
  dinheiro: iconeDinheiro,
};

export const rotulosStatusVenda: Record<StatusVenda, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

export const corPorStatusVenda: Record<StatusVenda, CorSelo> = {
  pago: "verde",
  pendente: "vermelho",
  cancelado: "cinza",
};

export const rotulosOrigem: Record<OrigemVenda, string> = {
  portaria: "Portaria",
  entrega: "Entrega",
};

export const opcoesPeriodoVendas: OpcaoSeletor<PeriodoVendas>[] = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "ontem", rotulo: "Ontem" },
  { valor: "7dias", rotulo: "Últimos 7 dias" },
  { valor: "30dias", rotulo: "Últimos 30 dias" },
  { valor: "mes", rotulo: "Este mês" },
];

export const opcoesPagamento: OpcaoSeletor<FiltroPagamento>[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "pix", rotulo: "PIX" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Cartão de débito" },
  { valor: "credito", rotulo: "Cartão de crédito" },
];

export const opcoesStatusVenda: OpcaoSeletor<FiltroStatusVenda>[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "pago", rotulo: "Pago" },
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "cancelado", rotulo: "Cancelado" },
];

export const opcoesOrdenacao: OpcaoSeletor<OrdenacaoVendas>[] = [
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "antigas", rotulo: "Mais antigas" },
  { valor: "maior", rotulo: "Maior valor" },
  { valor: "menor", rotulo: "Menor valor" },
];