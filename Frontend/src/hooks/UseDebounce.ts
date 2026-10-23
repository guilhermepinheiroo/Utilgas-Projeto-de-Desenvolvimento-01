import { useEffect, useState } from "react";

export function useDebounce<T>(valor: T, atrasoMs = 400): T {
  const [valorAtrasado, setValorAtrasado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setValorAtrasado(valor), atrasoMs);
    return () => clearTimeout(temporizador);
  }, [valor, atrasoMs]);

  return valorAtrasado;
}