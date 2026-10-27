import { useEffect, useEffectEvent, useState } from "react";
import { mensagemDeErro } from "../services/Api";

interface Estado<T> {
  chave: string;
  dados: T | undefined;
  erro: string | null;
}

export function useConsulta<T>(buscar: () => Promise<T>, chave: string, intervaloMs?: number) {
  const [estado, setEstado] = useState<Estado<T> | null>(null);
  const [versao, setVersao] = useState(0);

  const executar = useEffectEvent(() => buscar());

  useEffect(() => {
    let cancelado = false;

    executar()
      .then((dados) => {
        if (!cancelado) setEstado({ chave, dados, erro: null });
      })
      .catch((e) => {
        if (!cancelado) {
          setEstado((anterior) => ({ chave, dados: anterior?.dados, erro: mensagemDeErro(e) }));
        }
      });

    return () => {
      cancelado = true;
    };
  }, [chave, versao]);

  useEffect(() => {
    if (!intervaloMs) return;
    const intervalo = setInterval(() => {
      if (!document.hidden) setVersao((n) => n + 1);
    }, intervaloMs);
    return () => clearInterval(intervalo);
  }, [intervaloMs]);

  const atual = estado?.chave === chave ? estado : null;

  return {
    dados: estado?.dados,
    erro: atual?.erro ?? null,
    carregando: atual === null,
    recarregar: () => setVersao((n) => n + 1),
  };
}
