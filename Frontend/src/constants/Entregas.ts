import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import type { FiltroStatusEntrega, StatusEntrega } from "../types/Entregas";

export const TAMANHO_PAGINA_ENTREGAS = 10;
export const INTERVALO_ATUALIZACAO_MS = 10000;

export const rotulosStatusEntrega: Record<StatusEntrega, string> = {
  pendente: "Pendente",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

export const opcoesStatusEntrega: OpcaoSeletor<FiltroStatusEntrega>[] = [
  { valor: "todos", rotulo: "Todos os status" },
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "entregue", rotulo: "Entregue" },
  { valor: "cancelada", rotulo: "Cancelada" },
];