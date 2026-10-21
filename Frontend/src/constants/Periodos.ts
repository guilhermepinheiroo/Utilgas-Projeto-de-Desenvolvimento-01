import type { OpcaoSeletor, Periodo } from "../types/Dashboard";

export const opcoesPeriodo: OpcaoSeletor<Periodo>[] = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "7dias", rotulo: "7 dias" },
  { valor: "30dias", rotulo: "30 dias" },
];