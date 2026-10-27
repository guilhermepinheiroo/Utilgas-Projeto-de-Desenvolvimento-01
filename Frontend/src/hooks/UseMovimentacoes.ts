import { buscarMovimentacoes } from "../services/estoque";
import { useConsulta } from "./UseConsulta";

const INTERVALO_ATUALIZACAO_MS = 15000;

export function useMovimentacoes() {
  return useConsulta(buscarMovimentacoes, "movimentacoes", INTERVALO_ATUALIZACAO_MS).dados ?? [];
}
