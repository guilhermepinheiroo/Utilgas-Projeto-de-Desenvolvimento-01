import { useEffect, useState } from "react";
import { buscarEstoqueGrafico } from "../services/estoque";
import type { CategoriaGrafico, PontoGraficoEstoque } from "../types/Estoque";

export function useEstoqueGrafico() {
  const [categoria, setCategoria] = useState<CategoriaGrafico>("agua");
  const [resultado, setResultado] = useState<{
    categoria: CategoriaGrafico;
    dados: PontoGraficoEstoque[];
  } | null>(null);

  useEffect(() => {
    let cancelado = false;

    buscarEstoqueGrafico(categoria).then((dados) => {
      if (!cancelado) setResultado({ categoria, dados });
    });

    return () => {
      cancelado = true;
    };
  }, [categoria]);

  return {
    categoria,
    setCategoria,
    dados: resultado?.dados ?? [],
    carregando: resultado?.categoria !== categoria,
  };
}