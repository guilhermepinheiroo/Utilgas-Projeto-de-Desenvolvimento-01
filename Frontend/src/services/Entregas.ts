import type {
  Entregador,
  PaginaEntregas,
  ParametrosBuscaEntregas,
  ResumoEntregas,
} from "../types/Entregas";
import { api } from "./Api";

export function buscarEntregas({
  entregadorId,
  status,
  ...restante
}: ParametrosBuscaEntregas): Promise<PaginaEntregas> {
  return api.get<PaginaEntregas>("/entregas", {
    ...restante,
    entregadorId: entregadorId === "todos" ? undefined : entregadorId,
    status: status === "todos" ? undefined : status,
  });
}

export function buscarResumoEntregas(data: string): Promise<ResumoEntregas> {
  return api.get<ResumoEntregas>("/entregas/resumo", { data });
}

export function buscarEntregadores(): Promise<Entregador[]> {
  return api.get<Entregador[]>("/entregadores");
}

export function trocarEntregador(id: string, entregadorId: string): Promise<void> {
  return api.patch(`/entregas/${encodeURIComponent(id)}/entregador`, { entregadorId });
}

export function finalizarEntrega(id: string): Promise<void> {
  return api.post(`/entregas/${encodeURIComponent(id)}/finalizar`);
}

export function cancelarEntrega(id: string, motivo?: string): Promise<void> {
  return api.post(
    `/entregas/${encodeURIComponent(id)}/cancelar`,
    motivo ? { motivo } : undefined
  );
}