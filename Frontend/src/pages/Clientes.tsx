import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AlertaSucesso } from "../components/AlertaSucesso";
import { CampoBusca } from "../components/CampoBusca";
import { ModalSelecionarCliente } from "../components/ModalSelecionarCliente";
import { AcoesRapidas, type AcaoRapida } from "../components/clientes/AcoesRapidas";
import { CardIndicador } from "../components/clientes/CardIndicador";
import { Filtro } from "../components/clientes/Filtro";
import { ModalCliente } from "../components/clientes/ModalCliente";
import { ModalExcluirCliente } from "../components/clientes/ModalExcluirCliente";
import { TabelaClientes } from "../components/clientes/TabelaClientes";

import { opcoesFiltroStatus, rotulosStatus } from "../constants/Clientes";
import { useClientes } from "../hooks/useClientes";
import { useResumoClientes } from "../hooks/UseResumoClientes";
import { useAcao } from "../hooks/UsenAcao";
import { buscarClientes, excluirCliente } from "../services/Clientes";
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

const tendenciaDe = (variacao: number | null): "positiva" | "negativa" =>
  (variacao ?? 0) >= 0 ? "positiva" : "negativa";

const variacaoTexto = (variacao: number | null) =>
  variacao === null ? undefined : formatarVariacao(variacao);

type ModalEdicao = { clienteId: string | null } | null;

async function exportarClientes(busca: string, status: Parameters<typeof buscarClientes>[0]["status"]) {
  const todos: Cliente[] = [];
  for (let pagina = 1; ; pagina++) {
    const resposta = await buscarClientes({ pagina, tamanhoPagina: 100, busca, status });
    todos.push(...resposta.itens);
    if (todos.length >= resposta.total || resposta.itens.length === 0) break;
  }

  const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
  const linhas = [
    ["Nome", "WhatsApp", "CPF/CNPJ", "Endereço", "Bairro", "Última compra", "Status"],
    ...todos.map((c) => [
      c.nome,
      c.whatsapp,
      c.cpf ?? "",
      c.endereco,
      c.bairro ?? "",
      c.ultimaCompra ?? "",
      rotulosStatus[c.status],
    ]),
  ];
  const csv = "﻿" + linhas.map((l) => l.map(escapar).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Clientes() {
  const navegar = useNavigate();
  const { resumo, recarregar: recarregarResumo } = useResumoClientes();
  const lista = useClientes();
  const exclusao = useAcao();

  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<ModalEdicao>(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [selecionandoWhatsapp, setSelecionandoWhatsapp] = useState(false);

  // Fecha o alerta automaticamente após 4 segundos
  useEffect(() => {
    if (!mensagemSucesso) return;
    const temporizador = window.setTimeout(() => setMensagemSucesso(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [mensagemSucesso]);

  function atualizarTudo() {
    lista.recarregar();
    recarregarResumo();
  }

  async function confirmarExclusao(cliente: Cliente) {
    const ok = await exclusao.executar(() => excluirCliente(cliente.id));
    if (ok) {
      setClienteParaExcluir(null);
      setMensagemSucesso("Cliente excluído com sucesso!");
      atualizarTudo();
    }
  }

  const acoes: AcaoRapida[] = [
    {
      id: "nova-venda",
      titulo: "Nova Venda",
      descricao: "Registrar pedido de gás",
      icone: iconeNovaVenda,
      corFundoIcone: "bg-green-100",
      aoClicar: () => navegar("/atendimento"),
    },
    {
      id: "historico",
      titulo: "Histórico",
      descricao: "Últimas compras e entregas",
      icone: iconeRelogio,
      corFundoIcone: "bg-orange-100",
      aoClicar: () => navegar("/vendas"),
    },
    {
      id: "mensagem",
      titulo: "Enviar Mensagem",
      descricao: "Notificar via WhatsApp",
      icone: iconeWhatsapp,
      corFundoIcone: "bg-green-100",
      aoClicar: () => setSelecionandoWhatsapp(true),
    },
    {
      id: "relatorio",
      titulo: "Relatório",
      descricao: "Exportar lista de clientes (CSV)",
      icone: iconeRelatorio,
      corFundoIcone: "bg-blue-100",
      aoClicar: () => {
        setErroGeral(null);
        exportarClientes(lista.busca, lista.status).catch(() =>
          setErroGeral("Não foi possível gerar o relatório. Tente de novo.")
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-8">
      {mensagemSucesso && (
        <div className="fixed left-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-md">
          <AlertaSucesso mensagem={mensagemSucesso} onFechar={() => setMensagemSucesso("")} />
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Gestão de Clientes</h1>
        <p className="text-sm text-neutral-500">
          Visualize, adicione e controle as informações dos seus clientes cadastrados.
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
              variacao={variacaoTexto(resumo.total.variacao)}
              descricao="clientes cadastrados"
              tendencia={tendenciaDe(resumo.total.variacao)}
              iconeTendencia={iconeGraficoSubindo}
            />
            <CardIndicador
              titulo="Novos Clientes (Mês)"
              valor={`+${formatarNumero(resumo.novosNoMes.valor)}`}
              variacao={variacaoTexto(resumo.novosNoMes.variacao)}
              descricao="novos este mês"
              tendencia={tendenciaDe(resumo.novosNoMes.variacao)}
              iconeTendencia={iconeGraficoSubindo}
            />
            <CardIndicador
              titulo="Clientes Ativos"
              valor={formatarNumero(resumo.ativos.valor)}
              descricao="ativos na plataforma"
              tendencia="positiva"
              iconeTendencia={iconeGraficoSubindo}
            />
            <CardIndicador
              titulo="Clientes Inadimplentes"
              valor={formatarNumero(resumo.inadimplentes.valor)}
              descricao="com pendências"
              tendencia="negativa"
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
            placeholder="Buscar por nome, WhatsApp ou CPF..."
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
          onClick={() => setEdicao({ clienteId: null })}
          className="cursor-pointer rounded-md bg-sidebar px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sidebar-ativo"
        >
          + Novo Cliente
        </button>
      </div>

      {(lista.erro || erroGeral) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{lista.erro ?? erroGeral}</span>
          {lista.erro && (
            <button
              type="button"
              onClick={atualizarTudo}
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100"
            >
              Tentar de novo
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <TabelaClientes
          clientes={lista.clientes}
          total={lista.total}
          pagina={lista.pagina}
          totalPaginas={lista.totalPaginas}
          carregando={lista.carregando}
          aoMudarPagina={lista.setPagina}
          aoEditar={(cliente) => setEdicao({ clienteId: cliente.id })}
          aoExcluir={(cliente) => {
            exclusao.limparErro();
            setClienteParaExcluir(cliente);
          }}
        />

        <AcoesRapidas acoes={acoes} />
      </div>

      <ModalCliente
        aberto={edicao !== null}
        clienteId={edicao?.clienteId ?? null}
        aoFechar={() => setEdicao(null)}
        aoSalvar={() => {
          setMensagemSucesso(
            edicao?.clienteId ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!"
          );
          setEdicao(null);
          atualizarTudo();
        }}
      />

      <ModalExcluirCliente
        cliente={clienteParaExcluir}
        executando={exclusao.executando}
        erro={exclusao.erro}
        aoFechar={() => setClienteParaExcluir(null)}
        aoConfirmar={confirmarExclusao}
      />

      <ModalSelecionarCliente
        aberto={selecionandoWhatsapp}
        titulo="Enviar mensagem: selecione o cliente"
        aoSelecionar={(cliente) => {
          setSelecionandoWhatsapp(false);
          window.open(`https://wa.me/55${cliente.whatsapp}`, "_blank", "noopener");
        }}
        aoFechar={() => setSelecionandoWhatsapp(false)}
      />
    </div>
  );
}
