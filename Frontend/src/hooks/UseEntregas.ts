import { useEffect, useMemo, useState } from "react";
import { INTERVALO_ATUALIZACAO_MS, TAMANHO_PAGINA_ENTREGAS } from "../constants/Entregas";
import { mensagemDeErro } from "../services/Api";
import { buscarEntregas, buscarResumoEntregas } from "../services/Entregas";
import type { Entrega, FiltrosEntregas, ResumoEntregas } from "../types/Entregas";
import { dataParaIso } from "../utils/FormataData";
import { useDebounce } from "./UseDebounce";

const criarFiltrosIniciais = (): FiltrosEntregas => ({
  data: dataParaIso(new Date()),
  busca: "",
  entregadorId: "todos",
  status: "todos",
});

export function useEntregas() {
  const [filtros, setFiltros] = useState<FiltrosEntregas>(criarFiltrosIniciais);
  const [pagina, setPagina] = useState(1);
  const [atualizacao, setAtualizacao] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const [listaResultado, setListaResultado] = useState<{
    chave: string;
    itens: Entrega[];
    total: number;
  } | null>(null);
  const [resumoResultado, setResumoResultado] = useState<ResumoEntregas | null>(null);

  const buscaAtrasada = useDebounce(filtros.busca);
  const filtrosAplicados = useMemo(
    () => ({ ...filtros, busca: buscaAtrasada }),
    [filtros, buscaAtrasada]
  );

  const dataAplicada = filtrosAplicados.data;
  const chaveLista = `${JSON.stringify(filtrosAplicados)}|${pagina}`;

  // Atualização automática
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (!document.hidden) setAtualizacao((n) => n + 1);
    }, INTERVALO_ATUALIZACAO_MS);

    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    let cancelado = false;

    buscarEntregas({ ...filtrosAplicados, pagina, tamanhoPagina: TAMANHO_PAGINA_ENTREGAS })
      .then((resposta) => {
        if (cancelado) return;
        setListaResultado({ chave: chaveLista, ...resposta });
        setErro(null);
      })
      .catch((e) => {
        if (!cancelado) setErro(mensagemDeErro(e));
      });

    return () => {
      cancelado = true;
    };
  }, [filtrosAplicados, pagina, chaveLista, atualizacao]);

  useEffect(() => {
    let cancelado = false;

    buscarResumoEntregas(dataAplicada)
      .then((resposta) => {
        if (!cancelado) setResumoResultado(resposta);
      })
      .catch((e) => {
        if (!cancelado) setErro(mensagemDeErro(e));
      });

    return () => {
      cancelado = true;
    };
  }, [dataAplicada, atualizacao]);

  // Mudar qualquer filtro volta para a primeira página
  function alterarFiltro<K extends keyof FiltrosEntregas>(campo: K, valor: FiltrosEntregas[K]) {
    setFiltros((atuais) => ({ ...atuais, [campo]: valor }));
    setPagina(1);
  }

  function limparFiltros() {
    setFiltros(criarFiltrosIniciais());
    setPagina(1);
  }

  const inicial = criarFiltrosIniciais();
  const filtrosAlterados =
    filtros.busca !== "" ||
    filtros.entregadorId !== "todos" ||
    filtros.status !== "todos" ||
    filtros.data !== inicial.data;

  const total = listaResultado?.total ?? 0;

  return {
    filtros,
    alterarFiltro,
    limparFiltros,
    filtrosAlterados,
    pagina,
    setPagina,
    entregas: listaResultado?.itens ?? [],
    total,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA_ENTREGAS)),
    carregando: !erro && listaResultado?.chave !== chaveLista,
    resumo: resumoResultado,
    erro,
    recarregar: () => setAtualizacao((n) => n + 1),
  };
}