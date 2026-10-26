import { useState } from "react";
import { CampoBusca } from "../components/CampoBusca";
import { CardResumo } from "../components/CardResumos";
import { Filtro } from "../components/clientes/Filtro";
import { FiltroCard } from "../components/FiltroCard";
import { ModalSelecionarCliente } from "../components/ModalSelecionarCliente";
import { Paginacao } from "../components/clientes/Paginacao";
import { CartaoVenda } from "../components/vendas/CartaoVenda";
import { FiltroClienteCard } from "../components/vendas/FiltroClienteCard";
import { ModalDetalheVenda } from "../components/vendas/ModalDetalheVenda";
import { opcoesOrdenacao, opcoesPagamento, opcoesPeriodoVendas, opcoesStatusVenda } from "../constants/Vendas";
import { useVendas } from "../hooks/UseVendas";
import type { Cliente } from "../types/clientes";
import type { RegistroVenda } from "../types/Vendas";
import { formatarCentavos } from "../utils/FormatacaoMoeda";
import { formatarNumero } from "../utils/FormataNumero";

import iconeCalendario from "../assets/telavendas/icon-calendario.png";
import iconeDinheiro from "../assets/telavendas/icon-dinheiro-vivo.png";
import iconePerfil from "../assets/telavendas/icon-perfil.png";
import iconeSetaBaixo from "../assets/telaclientes/icon-filtro-seta-baixo.png";

export function Vendas() {
  const historico = useVendas();
  const [selecionandoCliente, setSelecionandoCliente] = useState(false);
  const [clienteFiltrado, setClienteFiltrado] = useState<Cliente | null>(null);
  const [vendaAberta, setVendaAberta] = useState<RegistroVenda | null>(null);

  const { resumo } = historico;

  function filtrarPorCliente(cliente: Cliente) {
    setClienteFiltrado(cliente);
    historico.alterarFiltro("clienteId", cliente.id);
    setSelecionandoCliente(false);
  }

  function limparCliente() {
    setClienteFiltrado(null);
    historico.alterarFiltro("clienteId", null);
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-neutral-900">Histórico de Vendas</h1>

      <section
        aria-label="Filtros"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <FiltroCard
          rotulo="Período"
          icone={iconeCalendario}
          opcoes={opcoesPeriodoVendas}
          valor={historico.filtros.periodo}
          aoAlterar={(valor) => historico.alterarFiltro("periodo", valor)}
        />

        <FiltroClienteCard
          icone={iconePerfil}
          nomeSelecionado={clienteFiltrado?.nome ?? null}
          aoAbrir={() => setSelecionandoCliente(true)}
          aoLimpar={limparCliente}
        />

        <FiltroCard
          rotulo="Forma de pagamento"
          icone={iconeDinheiro}
          opcoes={opcoesPagamento}
          valor={historico.filtros.pagamento}
          aoAlterar={(valor) => historico.alterarFiltro("pagamento", valor)}
        />

        {/* Quando tiver o ícone de status, passe: icone={iconeStatus} */}
        <FiltroCard
          rotulo="Status"
          opcoes={opcoesStatusVenda}
          valor={historico.filtros.status}
          aoAlterar={(valor) => historico.alterarFiltro("status", valor)}
        />
      </section>

      <CampoBusca
        larguraTotal
        valor={historico.filtros.busca}
        aoAlterar={(valor) => historico.alterarFiltro("busca", valor)}
        placeholder="Buscar por cliente, produto..."
        rotuloAcessivel="Buscar vendas"
      />

      <section
        aria-label="Resumo das vendas"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <CardResumo
          titulo="Total em Vendas"
          valor={resumo ? formatarCentavos(resumo.totalCentavos) : "—"}
        />
        <CardResumo
          titulo="Qtd. de Vendas"
          valor={resumo ? formatarNumero(resumo.quantidade) : "—"}
        />
        <CardResumo
          titulo="Clientes Atendidos"
          valor={resumo ? formatarNumero(resumo.clientesAtendidos) : "—"}
        />
        <CardResumo
          titulo="Ticket Médio"
          valor={resumo ? formatarCentavos(resumo.ticketMedioCentavos) : "—"}
        />
      </section>

      <div className="flex items-center justify-end gap-2 text-sm text-neutral-800">
        <span aria-hidden>Ordenar por:</span>
        <Filtro
          opcoes={opcoesOrdenacao}
          valor={historico.ordenacao}
          aoAlterar={historico.alterarOrdenacao}
          rotuloAcessivel="Ordenar vendas"
          iconeSeta={iconeSetaBaixo}
        />
      </div>

      <section aria-label="Lista de vendas" className="flex flex-col gap-4">
        <ul
          className={`flex flex-col gap-3 transition-opacity ${
            historico.carregando ? "opacity-50" : ""
          }`}
        >
          {historico.lista.map((venda) => (
            <CartaoVenda key={venda.id} venda={venda} aoVerDetalhes={setVendaAberta} />
          ))}
        </ul>

        {!historico.carregando && historico.lista.length === 0 && (
          <p className="py-10 text-center text-sm text-neutral-500">
            Nenhuma venda encontrada para esses filtros.
          </p>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            Mostrando <strong className="text-neutral-900">{historico.lista.length}</strong> de{" "}
            <strong className="text-neutral-900">{formatarNumero(historico.total)}</strong> vendas
          </p>

          <Paginacao
            paginaAtual={historico.pagina}
            totalPaginas={historico.totalPaginas}
            aoMudar={historico.setPagina}
          />
        </footer>
      </section>

      <ModalSelecionarCliente
        aberto={selecionandoCliente}
        titulo="Filtrar vendas: selecione o cliente"
        aoSelecionar={filtrarPorCliente}
        aoFechar={() => setSelecionandoCliente(false)}
      />

      <ModalDetalheVenda venda={vendaAberta} aoFechar={() => setVendaAberta(null)} />
    </div>
  );
}