import { useEffect, useState } from "react";
import { buscarResumoClientes } from "../services/Clientes";
import type { ResumoClientes } from "../types/clientes";

export function useResumoClientes() {
  const [resumo, setResumo] = useState<ResumoClientes | null>(null);

  useEffect(() => {
    let cancelado = false;

    buscarResumoClientes().then((resultado) => {
      if (!cancelado) setResumo(resultado);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  return resumo;
}