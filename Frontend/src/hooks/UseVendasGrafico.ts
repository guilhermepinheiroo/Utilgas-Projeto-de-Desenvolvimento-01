import { useEffect, useState } from "react";
import { buscarVendasGrafico } from "../services/Dashboard";
import type { Periodo, PontoGraficoVendas } from "../types/Dashboard";

export function useVendasGrafico() {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [resultado, setResultado] = useState<{
    periodo: Periodo;
    dados: PontoGraficoVendas[];
  } | null>(null);

  useEffect(() => {
    let cancelado = false;

    buscarVendasGrafico(periodo).then((dados) => {
      if (!cancelado) setResultado({ periodo, dados });
    });

    return () => {
      cancelado = true;
    };
  }, [periodo]);

  return {
    periodo,
    setPeriodo,
    dados: resultado?.dados ?? [],
    carregando: resultado?.periodo !== periodo,
  };
}