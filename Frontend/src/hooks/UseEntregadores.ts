import { useCallback, useEffect, useState } from "react";
import { buscarEntregadores } from "../services/Entregas";
import type { Entregador } from "../types/Entregas";

export function useEntregadores() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [erro, setErro] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let cancelado = false;

    buscarEntregadores()
      .then((resposta) => {
        if (!cancelado) {
          setEntregadores(resposta);
          setErro(false);
        }
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      });

    return () => {
      cancelado = true;
    };
  }, [versao]);

  const recarregar = useCallback(() => setVersao((atual) => atual + 1), []);

  return { entregadores, erro, recarregar };
}