import { useEffect, useState } from "react";
import { buscarMovimentacoes, gerarMovimentacaoAleatoria } from "../services/estoque";
import type { Movimentacao } from "../types/Estoque";

const LIMITE_MOVIMENTACOES = 50;
const INTERVALO_SIMULACAO_MS = 10000;

export function useMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  useEffect(() => {
    let cancelado = false;

    buscarMovimentacoes().then((resultado) => {
      if (!cancelado) setMovimentacoes(resultado);
    });

    // Simula movimentações novas. Depois vira polling ou WebSocket.
    const intervalo = setInterval(() => {
      const nova = gerarMovimentacaoAleatoria();
      setMovimentacoes((atuais) => [nova, ...atuais].slice(0, LIMITE_MOVIMENTACOES));
    }, INTERVALO_SIMULACAO_MS);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  return movimentacoes;
}