import { useState } from "react";
import { mensagemDeErro } from "../services/Api";

export function useAcao() {
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Retorna true se deu certo
  async function executar(acao: () => Promise<void>): Promise<boolean> {
    setExecutando(true);
    setErro(null);

    try {
      await acao();
      return true;
    } catch (e) {
      setErro(mensagemDeErro(e));
      return false;
    } finally {
      setExecutando(false);
    }
  }

  return { executando, erro, executar, limparErro: () => setErro(null) };
}