import { useState } from "react";
import { TAMANHO_PAGINA_VENDAS } from "../constants/Vendas";
import { buscarVendas } from "../services/Vendas";
import type { FiltrosVendas, OrdenacaoVendas } from "../types/Vendas";
import { useConsulta } from "./UseConsulta";
import { useDebounce } from "./UseDebounce";

const filtrosIniciais: FiltrosVendas = {
  periodo: "30dias",
  clienteId: null,
  pagamento: "todos",
  status: "todos",
  busca: "",
};

export function useVendas() {
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoVendas>("recentes");
  const [pagina, setPagina] = useState(1);

  const buscaAtrasada = useDebounce(filtros.busca);
  const aplicados = { ...filtros, busca: buscaAtrasada };
  const consulta = useConsulta(
    () => buscarVendas({ ...aplicados, ordenacao, pagina, tamanhoPagina: TAMANHO_PAGINA_VENDAS }),
    `${JSON.stringify(aplicados)}|${ordenacao}|${pagina}`
  );

  function alterarFiltro<K extends keyof FiltrosVendas>(chave: K, valor: FiltrosVendas[K]) {
    setFiltros((atual) => ({ ...atual, [chave]: valor }));
    setPagina(1);
  }

  function alterarOrdenacao(valor: OrdenacaoVendas) {
    setOrdenacao(valor);
    setPagina(1);
  }

  const total = consulta.dados?.total ?? 0;

  return {
    filtros,
    alterarFiltro,
    ordenacao,
    alterarOrdenacao,
    pagina,
    setPagina,
    lista: consulta.dados?.itens ?? [],
    total,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA_VENDAS)),
    resumo: consulta.dados?.resumo ?? null,
    carregando: consulta.carregando,
    erro: consulta.erro,
    recarregar: consulta.recarregar,
  };
}
