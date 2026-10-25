import { useEffect, useState } from "react";
import { TAMANHO_PAGINA_CLIENTES } from "../constants/Clientes";
import { buscarClientes } from "../services/Clientes";
import type { Cliente, FiltroStatus } from "../types/clientes";
import { useDebounce } from "./UseDebounce";

export function useClientes() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<{
    chave: string;
    itens: Cliente[];
    total: number;
  } | null>(null);

  const buscaAtrasada = useDebounce(busca);
  const chave = `${buscaAtrasada}|${status}|${pagina}`;

  useEffect(() => {
    let cancelado = false;

    buscarClientes({
      pagina,
      tamanhoPagina: TAMANHO_PAGINA_CLIENTES,
      busca: buscaAtrasada,
      status,
    }).then((resposta) => {
      if (!cancelado) setResultado({ chave, ...resposta });
    });

    return () => {
      cancelado = true;
    };
  }, [buscaAtrasada, status, pagina, chave]);

  // Mudar busca ou filtro sempre volta para a primeira página
  function alterarBusca(valor: string) {
    setBusca(valor);
    setPagina(1);
  }

  function alterarStatus(valor: FiltroStatus) {
    setStatus(valor);
    setPagina(1);
  }

  const total = resultado?.total ?? 0;

  return {
    busca,
    alterarBusca,
    status,
    alterarStatus,
    pagina,
    setPagina,
    clientes: resultado?.itens ?? [],
    total,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA_CLIENTES)),
    carregando: resultado?.chave !== chave,
  };
}