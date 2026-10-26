import { useEffect, useState } from "react";
import { TAMANHO_PAGINA_VENDAS } from "../constants/Vendas";
import { buscarResumoVendas, buscarVendas } from "../services/Vendas";
import type {
  FiltrosVendas,
  OrdenacaoVendas,
  RegistroVenda,
} from "../types/Vendas";

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
  const [lista, setLista] = useState<RegistroVenda[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<Awaited<ReturnType<typeof buscarResumoVendas>> | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      buscarVendas({ ...filtros, ordenacao, pagina, tamanhoPagina: TAMANHO_PAGINA_VENDAS }),
      buscarResumoVendas(filtros),
    ]).then(([paginaVendas, resumoVendas]) => {
      if (cancelado) return;
      setLista(paginaVendas.itens);
      setTotal(paginaVendas.total);
      setResumo(resumoVendas);
      setCarregando(false);
    });

    return () => {
      cancelado = true;
    };
  }, [filtros, ordenacao, pagina]);

  function alterarFiltro<K extends keyof FiltrosVendas>(chave: K, valor: FiltrosVendas[K]) {
    setCarregando(true);
    setFiltros((atual) => ({ ...atual, [chave]: valor }));
    setPagina(1);
  }

  function alterarOrdenacao(valor: OrdenacaoVendas) {
    setCarregando(true);
    setOrdenacao(valor);
    setPagina(1);
  }

  function mudarPagina(valor: number) {
    setCarregando(true);
    setPagina(valor);
  }

  return {
    filtros,
    alterarFiltro,
    ordenacao,
    alterarOrdenacao,
    pagina,
    setPagina: mudarPagina,
    lista,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA_VENDAS)),
    resumo,
    carregando,
  };
}
