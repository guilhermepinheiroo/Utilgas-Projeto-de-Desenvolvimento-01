import { useEffect, useState } from "react";
import { buscarUltimasVendas, gerarVendaAleatoria } from "../services/Dashboard";
import type { Venda } from "../types/Dashboard";

const LIMITE_VENDAS = 50;
const INTERVALO_SIMULACAO_MS = 8000;

export function useUltimasVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);

  useEffect(() => {
    let cancelado = false;

    buscarUltimasVendas().then((resultado) => {
      if (!cancelado) setVendas(resultado);
    });

    // Simula vendas novas chegando. Depois vira polling ou WebSocket.
    const intervalo = setInterval(() => {
      setVendas((atuais) => [gerarVendaAleatoria(), ...atuais].slice(0, LIMITE_VENDAS));
    }, INTERVALO_SIMULACAO_MS);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  return vendas;
}