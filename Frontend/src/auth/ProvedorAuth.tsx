import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { api, sessaoDaResposta } from "../services/Api";
import { ContextoAuth, type ValorAuth } from "./contexto";
import { assinarSessao, lerSessao, limparSessao, salvarSessao } from "./sessao";

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const sessao = useSyncExternalStore(assinarSessao, lerSessao);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await api.post<Parameters<typeof sessaoDaResposta>[0]>("/auth/login", {
      email,
      senha,
    });
    salvarSessao(sessaoDaResposta(resposta));
  }, []);

  const valor = useMemo<ValorAuth>(
    () => ({ usuario: sessao?.usuario ?? null, entrar, sair: limparSessao }),
    [sessao, entrar]
  );

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}
