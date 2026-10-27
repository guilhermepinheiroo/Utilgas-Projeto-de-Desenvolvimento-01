import type { Periodo, PontoGraficoVendas, TipoProduto, Venda } from "../types/Dashboard";
import type { RegistroVenda } from "../types/Vendas";
import { dataParaIso, formatarDataHora } from "../utils/FormataData";
import { api } from "./Api";
import { buscarVendasDeHoje } from "./Vendas";

function intervalo(periodo: Periodo): { inicio: string; fim: string } {
  const hoje = new Date();
  const inicio = new Date();
  if (periodo === "7dias") inicio.setDate(hoje.getDate() - 6);
  if (periodo === "30dias") inicio.setDate(hoje.getDate() - 29);
  return { inicio: dataParaIso(inicio), fim: dataParaIso(hoje) };
}

export async function buscarFaturamento(periodo: Periodo): Promise<number> {
  const r = await api.get<{ faturamento: number }>("/dashboard/faturamento", intervalo(periodo));
  return Number(r.faturamento);
}

function tipoDaCategoria(categoria: string | null): TipoProduto {
  if (categoria === "gas") return "botijao";
  if (categoria === "agua") return "agua";
  return "acessorio";
}

function statusDaVenda(venda: RegistroVenda): string {
  if (venda.status === "cancelado") return "Cancelada";
  if (!venda.entrega) return "Portaria";
  return { pendente: "Pendente", entregue: "Entregue", cancelada: "Cancelada" }[
    venda.entrega.status
  ];
}

export async function buscarUltimasVendas(): Promise<Venda[]> {
  const vendas = await buscarVendasDeHoje();
  return vendas.flatMap((venda) =>
    venda.itens.map((item, indice) => ({
      id: `${venda.id}-${indice}`,
      produto: `${item.quantidade > 1 ? `${item.quantidade}× ` : ""}${item.produtoNome}`,
      tipo: tipoDaCategoria(item.categoria),
      horario: formatarDataHora(venda.dataHora).hora,
      status: statusDaVenda(venda),
    }))
  );
}

export function buscarVendasGrafico(periodo: Periodo): Promise<PontoGraficoVendas[]> {
  return api.get<PontoGraficoVendas[]>("/dashboard/vendas-por-categoria", { periodo });
}
