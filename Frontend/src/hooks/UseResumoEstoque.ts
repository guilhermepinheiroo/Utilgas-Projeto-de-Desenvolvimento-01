import { useEffect, useState } from "react";
import { buscarResumoEstoque } from "../services/estoque";
import type { FiltroEstoque, ResumoEstoque } from "../types/Estoque";

export function useResumoEstoque(gatilhoAtualizacao?: string) {
  const [filtro, setFiltro] = useState<FiltroEstoque>("todos");
  const [resultado, setResultado] = useState<{
    filtro: FiltroEstoque;
    resumo: ResumoEstoque;
  } | null>(null);

  useEffect(() => {
    let cancelado = false;

    buscarResumoEstoque(filtro).then((resumo) => {
      if (!cancelado) setResultado({ filtro, resumo });
    });

    return () => {
      cancelado = true;
    };
  }, [filtro, gatilhoAtualizacao]);

  return {
    filtro,
    setFiltro,
    resumo: resultado?.resumo ?? null,
    carregando: resultado?.filtro !== filtro,
  };
}