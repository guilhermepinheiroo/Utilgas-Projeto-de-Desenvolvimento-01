import { useState } from "react";
import { buscarFaturamento } from "../services/Dashboard";
import type { Periodo } from "../types/Dashboard";
import { useConsulta } from "./UseConsulta";

export function useFaturamento() {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const consulta = useConsulta(() => buscarFaturamento(periodo), periodo, 30000);

  return {
    periodo,
    setPeriodo,
    valor: consulta.dados ?? null,
    carregando: consulta.carregando,
    erro: consulta.erro,
  };
}
