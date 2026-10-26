import { useEffect, useState } from "react";
import { buscarEntregadores } from "../services/Entregas";
import type { Entregador } from "../types/Entregas";

export function useEntregadores() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;

    buscarEntregadores()
      .then((resposta) => {
        if (!cancelado) setEntregadores(resposta);
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return { entregadores, erro };
}