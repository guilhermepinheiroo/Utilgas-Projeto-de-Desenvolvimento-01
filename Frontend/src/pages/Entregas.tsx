import { useMemo, useState } from "react";
import { ModalAcoesEntrega } from "../components/entregas/ModalAcoesEntregas";
import { TabelaEntregas } from "../components/entregas/TabelaEntregas";
import type { OpcaoSeletor } from "../components/dashboard/SeletorSegmentado";
import { CampoBusca } from "../components/CampoBusca";
import { CampoData } from "../components/CampoData";
import { CardResumo } from "../components/CardResumos";
import { Filtro } from "../components/clientes/Filtro";
import { opcoesStatusEntrega } from "../constants/Entregas";
import { useEntregadores } from "../hooks/UseEntregadores";
import { useEntregas } from "../hooks/UseEntregas";
import type { Entrega } from "../types/Entregas";
import { dataParaIso, formatarDataHora } from "../utils/FormataData";
import { formatarNumero, formatarVariacao } from "../utils/FormataNumero";

import iconeFiltroSeta from "../assets/telaclientes/icon-filtro-seta-baixo.png";
import iconeSetaVerde from "../assets/icon-seta-verde.png";
import iconeSetaVermelha from "../assets/icon-seta-vermelha.png";

export function Entregas() {
  const painel = useEntregas();
  const { entregadores, erro: erroEntregadores } = useEntregadores();
  const [entregaAberta, setEntregaAberta] = useState<Entrega | null>(null);

  const opcoesEntregador = useMemo<OpcaoSeletor<string>[]>(
    () => [
      { valor: "todos", rotulo: "Todos os entregadores" },
      ...entregadores.map((entregador) => ({ valor: entregador.id, rotulo: entregador.nome })),
    ],
    [entregadores]
  );

  const { resumo, filtros } = painel;
  const ehHoje = filtros.data === dataParaIso(new Date());
  const tituloTotal = ehHoje
    ? "Total de entregas hoje"
    : `Total de entregas em ${formatarDataHora(`${filtros.data}T00:00:00`).data}`;

  const variacao = resumo?.variacaoPercentual ?? null;
  const rodapeTotal =
    variacao !== null ? (
      <p
        className={`flex items-center gap-1 text-[11px] font-medium ${
          variacao >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        <img
          src={variacao >= 0 ? iconeSetaVerde : iconeSetaVermelha}
          alt=""
          className="size-3 object-contain"
        />
        {formatarVariacao(variacao)} em relação {ehHoje ? "a ontem" : "ao dia anterior"}
      </p>
    ) : undefined;

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-neutral-900">Gerenciamento de Entregas</h1>

      <section aria-label="Resumo das entregas" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CardResumo
          titulo={tituloTotal}
          valor={resumo ? formatarNumero(resumo.total) : "—"}
          corValor="escuro"
          estiloTitulo="discreto"
          rodape={rodapeTotal}
        />
        <CardResumo
          titulo="Pendente"
          valor={resumo ? formatarNumero(resumo.pendentes) : "—"}
          corValor="laranja"
          estiloTitulo="discreto"
        />
        <CardResumo
          titulo="Concluídas"
          valor={resumo ? formatarNumero(resumo.concluidas) : "—"}
          corValor="verde"
          estiloTitulo="discreto"
        />
      </section>

      <section
        aria-label="Filtros"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <CampoBusca
          valor={filtros.busca}
          aoAlterar={(valor) => painel.alterarFiltro("busca", valor)}
          placeholder="Buscar por cliente, endereço ou pedido..."
          rotuloAcessivel="Buscar entregas"
        />

        <CampoData
          valor={filtros.data}
          aoAlterar={(valor) => painel.alterarFiltro("data", valor)}
          rotuloAcessivel="Data das entregas"
        />

        <Filtro
          opcoes={opcoesEntregador}
          valor={filtros.entregadorId}
          aoAlterar={(valor) => painel.alterarFiltro("entregadorId", valor)}
          rotuloAcessivel="Filtrar por entregador"
          iconeSeta={iconeFiltroSeta}
        />

        <Filtro
          opcoes={opcoesStatusEntrega}
          valor={filtros.status}
          aoAlterar={(valor) => painel.alterarFiltro("status", valor)}
          rotuloAcessivel="Filtrar por status"
          iconeSeta={iconeFiltroSeta}
        />

        <button
          type="button"
          onClick={painel.limparFiltros}
          disabled={!painel.filtrosAlterados}
          className="text-xs text-neutral-500 underline transition-colors hover:text-neutral-800 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
        >
          Limpar Filtros
        </button>
      </section>

      {painel.erro && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{painel.erro}</span>
          <button
            type="button"
            onClick={painel.recarregar}
            className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100"
          >
            Tentar de novo
          </button>
        </div>
      )}

      <TabelaEntregas
        entregas={painel.entregas}
        total={painel.total}
        pagina={painel.pagina}
        totalPaginas={painel.totalPaginas}
        carregando={painel.carregando}
        aoMudarPagina={painel.setPagina}
        aoAbrirAcoes={setEntregaAberta}
      />

      <ModalAcoesEntrega
        key={entregaAberta?.id ?? "fechado"}
        entrega={entregaAberta}
        entregadores={entregadores}
        erroEntregadores={erroEntregadores}
        aoFechar={() => setEntregaAberta(null)}
        aoAtualizar={painel.recarregar}
      />
    </div>
  );
}