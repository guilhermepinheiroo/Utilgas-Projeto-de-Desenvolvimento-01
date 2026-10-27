import { useState } from "react";
import { buscarEstoqueGrafico } from "../services/estoque";
import type { CategoriaGrafico } from "../types/Estoque";
import { useConsulta } from "./UseConsulta";

export function useEstoqueGrafico() {
  const [categoria, setCategoria] = useState<CategoriaGrafico>("gas");
  const consulta = useConsulta(() => buscarEstoqueGrafico(categoria), categoria);

  return {
    categoria,
    setCategoria,
    series: consulta.dados?.series ?? [],
    dados: consulta.dados?.dados ?? [],
    carregando: consulta.carregando,
  };
}
