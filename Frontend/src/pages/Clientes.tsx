
import { useEffect, useState } from "react";

import {
  AcoesRapidas,
  type AcaoRapida,
} from "../components/clientes/AcoesRapidas";
import { TabelaClientes } from "../components/clientes/TabelaClientes";
import { CampoBusca } from "../components/clientes/CampoBusca";
import { CardIndicador } from "../components/clientes/CardIndicador";
import { Filtro } from "../components/clientes/Filtro";
import { ModalEditarCliente } from "../components/clientes/ModalEditarCliente";
import { ModalExcluirCliente } from "../components/clientes/ModalExcluirCliente";
import { AlertaSucesso } from "../components/AlertaSucesso";

import { opcoesFiltroStatus } from "../constants/Clientes";
import { useClientes } from "../hooks/useClientes";
import { useResumoClientes } from "../hooks/UseResumoClientes";
import { formatarNumero, formatarVariacao } from "../utils/FormataNumero";

import type { Cliente } from "../types/clientes";

import iconeAlerta from "../assets/telaclientes/icon-alerta.png";
import iconeFiltro from "../assets/telaclientes/icon-filtro.png";
import iconeFiltroSeta from "../assets/telaclientes/icon-filtro-seta-baixo.png";
import iconeGraficoSubindo from "../assets/telaclientes/icon-grafico-subindo.png";
import iconeNovaVenda from "../assets/telaclientes/icon-novavenda.png";
import iconeRelatorio from "../assets/telaclientes/icon-relatorio.png";
import iconeRelogio from "../assets/telaclientes/icon-relogio-laranja.png";
import iconeSetaVermelha from "../assets/icon-seta-vermelha.png";
import iconeWhatsapp from "../assets/telaclientes/icon-mensagem-whatsapp.png";

const tendenciaDe = (variacao: number): "positiva" | "negativa" =>
  variacao >= 0 ? "positiva" : "negativa";

export function Clientes() {
  const resumo = useResumoClientes();
  const lista = useClientes();

  // Controle do alerta de sucesso
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Controle do modal de edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] =
    useState<Cliente | null>(null);

  // Controle do modal de exclusão
  const [clienteParaExcluir, setClienteParaExcluir] =
    useState<Cliente | null>(null);

  // Fecha o alerta automaticamente após 4 segundos
  useEffect(() => {
    if (!mensagemSucesso) return;

    const temporizador = window.setTimeout(() => {
      setMensagemSucesso("");
    }, 4000);

    return () => window.clearTimeout(temporizador);
  }, [mensagemSucesso]);

  function abrirEdicao(cliente: Cliente) {
    setClienteParaEditar(cliente);
    setModalEdicaoAberto(true);
  }

  function fecharEdicao() {
    setModalEdicaoAberto(false);
    setClienteParaEditar(null);
  }

  function salvarEdicao(cliente: Cliente) {
    // TODO: integrar com o serviço de atualização do backend.
    console.log("Salvar alterações do cliente:", cliente);

    fecharEdicao();

    // Demonstração do alerta.
    // Mova esta linha para depois da confirmação da API
    // quando a integração com o backend estiver pronta.
    setMensagemSucesso("Cliente atualizado com sucesso!");
  }

  function confirmarExclusao(cliente: Cliente) {
    // TODO: integrar com o serviço de exclusão do backend.
    console.log("Excluir cliente:", cliente.id);

    setClienteParaExcluir(null);

    // Demonstração do alerta.
    // Mova esta linha para depois da confirmação da API
    // quando a integração com o backend estiver pronta.
    setMensagemSucesso("Cliente excluído com sucesso!");
  }

  const acoes: AcaoRapida[] = [
    {
      id: "nova-venda",
      titulo: "Nova Venda",
      descricao: "Registrar pedido de gás",
      icone: iconeNovaVenda,
      corFundoIcone: "bg-green-100",
      aoClicar: () =>
        console.log("Selecionar cliente e iniciar venda"),
    },
    {
      id: "historico",
      titulo: "Histórico",
      descricao: "Últimas compras e entregas",
      icone: iconeRelogio,
      corFundoIcone: "bg-orange-100",
      aoClicar: () =>
        console.log("Selecionar cliente e abrir histórico"),
    },
    {
      id: "mensagem",
      titulo: "Enviar Mensagem",
      descricao: "Notificar via WhatsApp",
      icone: iconeWhatsapp,
      corFundoIcone: "bg-green-100",
      aoClicar: () =>
        console.log("Selecionar cliente e abrir WhatsApp"),
    },
    {
      id: "relatorio",
      titulo: "Relatório",
      descricao: "Exportar lista de clientes",
      icone: iconeRelatorio,
      corFundoIcone: "bg-blue-100",
      aoClicar: () =>
        console.log("Exportar relatório de todos os clientes"),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Alerta fixo no canto superior esquerdo */}
      {mensagemSucesso && (
        <div className="fixed left-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-md">
          <AlertaSucesso
            mensagem={mensagemSucesso}
            onFechar={() => setMensagemSucesso("")}
          />
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-neutral-900">
          Gestão de Clientes
        </h1>

        <p className="text-sm text-neutral-500">
          Visualize, adicione e controle as informações dos seus clientes
          cadastrados.
        </p>
      </header>

      <section
        aria-label="Indicadores de clientes"
        className="grid min-h-28 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {resumo && (
          <>
            <CardIndicador
              titulo="Total de Clientes"
              valor={formatarNumero(resumo.total.valor)}
              variacao={formatarVariacao(resumo.total.variacao)}
              descricao="clientes cadastrados"
              tendencia={tendenciaDe(resumo.total.variacao)}
              iconeTendencia={iconeGraficoSubindo}
            />

            <CardIndicador
              titulo="Novos Clientes (Mês)"
              valor={`+${formatarNumero(resumo.novosNoMes.valor)}`}
              variacao={formatarVariacao(resumo.novosNoMes.variacao)}
              descricao="novos este mês"
              tendencia={tendenciaDe(resumo.novosNoMes.variacao)}
              iconeTendencia={iconeGraficoSubindo}
            />

            <CardIndicador
              titulo="Clientes Ativos"
              valor={formatarNumero(resumo.ativos.valor)}
              variacao={formatarVariacao(resumo.ativos.variacao)}
              descricao="ativos na plataforma"
              tendencia={tendenciaDe(resumo.ativos.variacao)}
              iconeTendencia={iconeGraficoSubindo}
            />

            <CardIndicador
              titulo="Clientes Inadimplentes"
              valor={formatarNumero(resumo.inadimplentes.valor)}
              variacao={formatarVariacao(resumo.inadimplentes.variacao)}
              descricao="com pendências"
              tendencia={tendenciaDe(resumo.inadimplentes.variacao)}
              iconeTendencia={iconeSetaVermelha}
              iconeDestaque={iconeAlerta}
            />
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CampoBusca
            valor={lista.busca}
            aoAlterar={lista.alterarBusca}
            placeholder="Buscar por nome, WhatsApp ou endereço..."
            rotuloAcessivel="Buscar clientes"
          />

          <Filtro
            opcoes={opcoesFiltroStatus}
            valor={lista.status}
            aoAlterar={lista.alterarStatus}
            rotuloAcessivel="Filtrar clientes por status"
            icone={iconeFiltro}
            iconeSeta={iconeFiltroSeta}
          />
        </div>

        <button
          type="button"
          onClick={() => console.log("Abrir modal de novo cliente")}
          className="cursor-pointer rounded-md bg-sidebar px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sidebar-ativo"
        >
          + Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <TabelaClientes
          clientes={lista.clientes}
          total={lista.total}
          pagina={lista.pagina}
          totalPaginas={lista.totalPaginas}
          carregando={lista.carregando}
          aoMudarPagina={lista.setPagina}
          aoEditar={abrirEdicao}
          aoExcluir={setClienteParaExcluir}
        />

        <AcoesRapidas acoes={acoes} />
      </div>

      {/* Modal para pesquisar e editar clientes */}
      <ModalEditarCliente
        key={`${modalEdicaoAberto}-${clienteParaEditar?.id ?? "nenhum"}`}
        aberto={modalEdicaoAberto}
        clientes={lista.clientes}
        clienteInicial={clienteParaEditar}
        aoFechar={fecharEdicao}
        aoSalvar={salvarEdicao}
      />

      {/* Modal para confirmar a exclusão */}
      <ModalExcluirCliente
        cliente={clienteParaExcluir}
        aoFechar={() => setClienteParaExcluir(null)}
        aoConfirmar={confirmarExclusao}
      />
    </div>
  );
}
