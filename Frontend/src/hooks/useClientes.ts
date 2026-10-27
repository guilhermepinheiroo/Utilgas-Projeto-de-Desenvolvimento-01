import { useState } from "react";
import { TAMANHO_PAGINA_CLIENTES } from "../constants/Clientes";
import { buscarClientes } from "../services/Clientes";
import type { FiltroStatus } from "../types/clientes";
import { useConsulta } from "./UseConsulta";
import { useDebounce } from "./UseDebounce";

export function useClientes() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [pagina, setPagina] = useState(1);

  const buscaAtrasada = useDebounce(busca);
  const consulta = useConsulta(
    () =>
      buscarClientes({ pagina, tamanhoPagina: TAMANHO_PAGINA_CLIENTES, busca: buscaAtrasada, status }),
    `${buscaAtrasada}|${status}|${pagina}`
  );

  // Mudar busca ou filtro sempre volta para a primeira página
  function alterarBusca(valor: string) {
    setBusca(valor);
    setPagina(1);
  }

  function alterarStatus(valor: FiltroStatus) {
    setStatus(valor);
    setPagina(1);
  }

  const total = consulta.dados?.total ?? 0;

  return {
    busca,
    alterarBusca,
    status,
    alterarStatus,
    pagina,
    setPagina,
    clientes: consulta.dados?.itens ?? [],
    total,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA_CLIENTES)),
    carregando: consulta.carregando,
    erro: consulta.erro,
    recarregar: consulta.recarregar,
  };
}
