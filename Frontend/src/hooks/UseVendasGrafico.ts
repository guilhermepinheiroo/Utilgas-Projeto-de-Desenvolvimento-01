import { useState } from "react";
import { buscarVendasGrafico } from "../services/Dashboard";
import type { Periodo } from "../types/Dashboard";
import { useConsulta } from "./UseConsulta";

export function useVendasGrafico() {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const consulta = useConsulta(() => buscarVendasGrafico(periodo), periodo, 30000);

  return {
    periodo,
    setPeriodo,
    dados: consulta.dados ?? [],
    carregando: consulta.carregando,
  };
}
