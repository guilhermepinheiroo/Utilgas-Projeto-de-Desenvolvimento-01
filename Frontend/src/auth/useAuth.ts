import { useContext } from "react";
import { ContextoAuth, type ValorAuth } from "./contexto";

export function useAuth(): ValorAuth {
  const valor = useContext(ContextoAuth);
  if (!valor) throw new Error("useAuth precisa estar dentro de <ProvedorAuth>");
  return valor;
}
