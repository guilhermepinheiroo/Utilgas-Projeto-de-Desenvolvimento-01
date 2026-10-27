import { createContext } from "react";
import type { UsuarioLogado } from "./sessao";

export interface ValorAuth {
  usuario: UsuarioLogado | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
}

export const ContextoAuth = createContext<ValorAuth | null>(null);
