import { useState, type ReactNode } from "react";
import { BadgeStatusEntrega } from "./BadgeStatusEntrega";
import { Dialogo } from "../Dialogo";
import { catalogoProdutos } from "../../constants/ProdutosEstoque";
import { useAcao } from "../../hooks/UsenAcao";
import { cancelarEntrega, finalizarEntrega, trocarEntregador } from "../../services/Entregas";
import type { Entrega, Entregador } from "../../types/Entregas";
import { formatarDataHora } from "../../utils/FormataData";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { formatarTelefone } from "../../utils/FormatacaoTelefone";

import iconeCancelada from "../../assets/icon-cancela-entrega.png";
import iconeEntregue from "../../assets/icon-confirmar-entrega.png";

type Etapa = "acoes" | "confirmarCancelamento" | "entregue" | "cancelada";

const titulosPorEtapa: Record<Etapa, string> = {
  acoes: "Ações da Entrega",
  confirmarCancelamento: "Cancelar entrega",
  entregue: "Entrega finalizada",
  cancelada: "Entrega cancelada",
};

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">{rotulo}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

// ---------- Etapa 1: ações ----------

interface EtapaAcoesProps {
  entrega: Entrega;
  entregadorAtual: Entregador;
  entregadores: Entregador[];
  erroEntregadores: boolean;
  executando: boolean;
  erro: string | null;
  aviso: string | null;
  aoFinalizar: () => void;
  aoSalvarEntregador: (entregadorId: string) => void;
  aoPedirCancelamento: () => void;
}

function EtapaAcoes({
  entrega,
  entregadorAtual,
  entregadores,
  erroEntregadores,
  executando,
  erro,
  aviso,
  aoFinalizar,
  aoSalvarEntregador,
  aoPedirCancelamento,
}: EtapaAcoesProps) {
  const [escolhido, setEscolhido] = useState(entregadorAtual.id);
  const { hora } = formatarDataHora(entrega.horarioPrevisto);

  // Garante que o entregador atual sempre aparece na lista
  const opcoes = entregadores.some((e) => e.id === entregadorAtual.id)
    ? entregadores
    : [entregadorAtual, ...entregadores];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <BadgeStatusEntrega status={entrega.status} />
          <span className="text-xs text-neutral-500">
            Horário previsto: <strong className="text-neutral-900">{hora}</strong>
          </span>
          <span className="text-xs text-neutral-500">Pedido #{entrega.numeroPedido}</span>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-neutral-500">Valor Total</p>
          <p className="text-lg font-bold">{formatarCentavos(entrega.totalCentavos)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo rotulo="Cliente">
          <p className="font-semibold">{entrega.cliente.nome}</p>
          <p className="text-[11px] text-neutral-500">{formatarTelefone(entrega.cliente.whatsapp)}</p>
        </Campo>

        <Campo rotulo="Endereço de entrega">
          <p className="font-semibold">{entrega.cliente.endereco}</p>
          {entrega.cliente.bairro && (
            <p className="text-[11px] text-neutral-500">Bairro {entrega.cliente.bairro}</p>
          )}
        </Campo>

        <Campo rotulo="Item / Produto">
          <ul>
            {entrega.itens.map((item) => (
              <li key={item.produtoId} className="font-semibold">
                {item.quantidade}x {catalogoProdutos[item.produtoId].nome}
              </li>
            ))}
          </ul>
        </Campo>

        <Campo rotulo="Entregador atual">
          <p className="font-semibold text-verde-painel">{entregadorAtual.nome}</p>
        </Campo>
      </dl>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wide">Opções disponíveis</h3>
        <span className="text-[10px] text-neutral-500">Selecione uma ação</span>
      </div>

      <button
        type="button"
        onClick={aoFinalizar}
        disabled={executando}
        className="w-full rounded-md bg-sidebar py-4 text-sm font-semibold text-white transition-colors hover:bg-sidebar-ativo disabled:cursor-not-allowed disabled:opacity-50"
      >
        Finalizar entrega
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <div className="leading-tight">
          <p className="text-xs font-semibold">Escolha o Entregador</p>
          <p className="text-[11px] text-neutral-500">Trocar responsável atual da entrega</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Entregador"
            value={escolhido}
            onChange={(e) => setEscolhido(e.target.value)}
            disabled={executando}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs"
          >
            {opcoes.map((entregador) => (
              <option key={entregador.id} value={entregador.id}>
                {entregador.nome}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => aoSalvarEntregador(escolhido)}
            disabled={executando || escolhido === entregadorAtual.id}
            className="rounded bg-sidebar px-4 py-1.5 text-[10px] font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>

      {erroEntregadores && (
        <p role="alert" className="text-xs text-red-600">
          Não foi possível carregar a lista de entregadores.
        </p>
      )}

      <button
        type="button"
        onClick={aoPedirCancelamento}
        disabled={executando}
        className="w-full rounded-md bg-red-500 py-4 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancelar entrega
      </button>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm text-green-700">
          {aviso}
        </p>
      )}
    </div>
  );
}

// ---------- Etapa 2: confirmar cancelamento ----------

interface EtapaConfirmarProps {
  numeroPedido: number;
  executando: boolean;
  erro: string | null;
  aoVoltar: () => void;
  aoConfirmar: (motivo: string) => void;
}

function EtapaConfirmarCancelamento({
  numeroPedido,
  executando,
  erro,
  aoVoltar,
  aoConfirmar,
}: EtapaConfirmarProps) {
  const [motivo, setMotivo] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Tem certeza que deseja cancelar a entrega do pedido <strong>#{numeroPedido}</strong>? Essa
        ação não pode ser desfeita.
      </p>

      <label className="flex flex-col gap-1 text-xs text-neutral-600">
        Motivo (opcional)
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={200}
          rows={3}
          className="resize-none rounded-md border border-neutral-300 p-2 text-sm text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-verde-painel"
        />
      </label>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={aoVoltar}
          disabled={executando}
          className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => aoConfirmar(motivo)}
          disabled={executando}
          className="rounded-md bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          Confirmar cancelamento
        </button>
      </div>
    </div>
  );
}

// ---------- Etapa 3: resultado ----------

function EtapaResultado({
  tipo,
  numeroPedido,
}: {
  tipo: "entregue" | "cancelada";
  numeroPedido: number;
}) {
  const entregue = tipo === "entregue";

  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-6 pb-6">
      <img
        src={entregue ? iconeEntregue : iconeCancelada}
        alt=""
        className="size-40 object-contain"
      />
      <p role="status" className="text-lg">
        {entregue ? "Pedido" : "Entrega"} <strong>#{numeroPedido}</strong>{" "}
        {entregue ? "entregue" : "cancelada"}
      </p>
    </div>
  );
}

// ---------- Janela ----------

interface ModalAcoesEntregaProps {
  entrega: Entrega | null;
  entregadores: Entregador[];
  erroEntregadores: boolean;
  aoFechar: () => void;
  aoAtualizar: () => void;
}

// Renderize com key={entrega?.id}: assim a etapa recomeça em "acoes" a cada entrega aberta
export function ModalAcoesEntrega({
  entrega,
  entregadores,
  erroEntregadores,
  aoFechar,
  aoAtualizar,
}: ModalAcoesEntregaProps) {
  const [etapa, setEtapa] = useState<Etapa>("acoes");
  const [entregadorAtual, setEntregadorAtual] = useState<Entregador | null>(
    entrega?.entregador ?? null
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const { executando, erro, executar, limparErro } = useAcao();

  function irPara(proxima: Etapa) {
    limparErro();
    setAviso(null);
    setEtapa(proxima);
  }

  async function finalizar() {
    if (!entrega) return;
    setAviso(null);

    const ok = await executar(() => finalizarEntrega(entrega.id));

    if (ok) {
      aoAtualizar();
      setEtapa("entregue");
    }
  }

  async function salvarEntregador(entregadorId: string) {
    if (!entrega) return;
    setAviso(null);

    const ok = await executar(() => trocarEntregador(entrega.id, entregadorId));

    if (ok) {
      const novo = entregadores.find((e) => e.id === entregadorId);
      if (novo) setEntregadorAtual(novo);

      setAviso("Entregador atualizado.");
      aoAtualizar();
    }
  }

  async function confirmarCancelamento(motivo: string) {
    if (!entrega) return;

    const ok = await executar(() => cancelarEntrega(entrega.id, motivo.trim() || undefined));

    if (ok) {
      aoAtualizar();
      setEtapa("cancelada");
    }
  }

  const tituloVisivel = etapa === "acoes" || etapa === "confirmarCancelamento";

  return (
    <Dialogo
      aberto={entrega !== null}
      titulo={titulosPorEtapa[etapa]}
      tituloVisivel={tituloVisivel}
      aoFechar={aoFechar}
    >
      {entrega && entregadorAtual && etapa === "acoes" && (
        <EtapaAcoes
          entrega={entrega}
          entregadorAtual={entregadorAtual}
          entregadores={entregadores}
          erroEntregadores={erroEntregadores}
          executando={executando}
          erro={erro}
          aviso={aviso}
          aoFinalizar={finalizar}
          aoSalvarEntregador={salvarEntregador}
          aoPedirCancelamento={() => irPara("confirmarCancelamento")}
        />
      )}

      {entrega && etapa === "confirmarCancelamento" && (
        <EtapaConfirmarCancelamento
          numeroPedido={entrega.numeroPedido}
          executando={executando}
          erro={erro}
          aoVoltar={() => irPara("acoes")}
          aoConfirmar={confirmarCancelamento}
        />
      )}

      {entrega && (etapa === "entregue" || etapa === "cancelada") && (
        <EtapaResultado tipo={etapa} numeroPedido={entrega.numeroPedido} />
      )}
    </Dialogo>
  );
}