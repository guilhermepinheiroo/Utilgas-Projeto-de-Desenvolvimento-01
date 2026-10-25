import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import type { FiltroStatus, StatusCliente } from "../types/clientes";

export const TAMANHO_PAGINA_CLIENTES = 7;

export const rotulosStatus: Record<StatusCliente, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  inadimplente: "Inadimplente",
};

export const opcoesFiltroStatus: OpcaoSeletor<FiltroStatus>[] = [
  { valor: "todos", rotulo: "Todos os status" },
  { valor: "ativo", rotulo: "Ativo" },
  { valor: "inativo", rotulo: "Inativo" },
  { valor: "inadimplente", rotulo: "Inadimplente" },
];