import { useState } from "react";
import { buscarResumoEstoque } from "../services/estoque";
import type { FiltroEstoque } from "../types/Estoque";
import { useConsulta } from "./UseConsulta";

export function useResumoEstoque(gatilhoAtualizacao?: string) {
  const [filtro, setFiltro] = useState<FiltroEstoque>("todos");
  const consulta = useConsulta(
    () => buscarResumoEstoque(filtro),
    `${filtro}|${gatilhoAtualizacao ?? ""}`
  );

  return {
    filtro,
    setFiltro,
    resumo: consulta.dados ?? null,
    carregando: consulta.carregando,
  };
}
