import { buscarUltimasVendas } from "../services/Dashboard";
import { useConsulta } from "./UseConsulta";

const INTERVALO_ATUALIZACAO_MS = 15000;

export function useUltimasVendas() {
  return useConsulta(buscarUltimasVendas, "ultimas", INTERVALO_ATUALIZACAO_MS).dados ?? [];
}
