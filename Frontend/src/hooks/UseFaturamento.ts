import { useEffect, useState } from "react";
import { buscarFaturamento } from "../services/Dashboard";
import type { Periodo } from "../types/Dashboard";

export function useFaturamento() {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [resultado, setResultado] = useState<{ periodo: Periodo; valor: number } | null>(null);

  useEffect(() => {
    let cancelado = false;

    buscarFaturamento(periodo).then((valor) => {
      if (!cancelado) setResultado({ periodo, valor });
    });

    return () => {
      cancelado = true;
    };
  }, [periodo]);

  return {
    periodo,
    setPeriodo,
    valor: resultado?.valor ?? null,
    carregando: resultado?.periodo !== periodo,
  };
}   