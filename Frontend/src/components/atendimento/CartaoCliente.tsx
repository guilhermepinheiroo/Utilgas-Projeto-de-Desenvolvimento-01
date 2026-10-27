import type { ClienteDetalhado } from "../../types/clientes";
import { formatarDataCurta } from "../../utils/FormataData";
import { formatarTelefone } from "../../utils/FormatacaoTelefone";
import { BadgeStatusCliente } from "../clientes/BadgeStatusCliente";

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md bg-neutral-50 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{rotulo}</dt>
      <dd className="text-sm font-semibold text-neutral-900">{valor}</dd>
    </div>
  );
}

export function CartaoCliente({
  cliente,
  aoTrocar,
}: {
  cliente: ClienteDetalhado;
  aoTrocar: () => void;
}) {
  const ind = cliente.indicadores;
  const recompra = ind?.recompraPrevistaEmDias;
  const textoRecompra =
    recompra === null || recompra === undefined
      ? "—"
      : recompra > 0
        ? `em ${recompra} dias`
        : recompra === 0
          ? "hoje"
          : `atrasada ${-recompra} dias`;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            {cliente.nome} <BadgeStatusCliente status={cliente.status} />
          </p>
          <p className="text-sm text-neutral-500">{formatarTelefone(cliente.whatsapp)}</p>
          {cliente.observacoes && (
            <p className="mt-1 text-xs text-orange-700">Obs.: {cliente.observacoes}</p>
          )}
        </div>
        <button
          type="button"
          onClick={aoTrocar}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
        >
          Trocar cliente
        </button>
      </div>

      {cliente.status === "inadimplente" && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          Cliente inadimplente.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Indicador rotulo="Pedidos" valor={String(ind?.totalPedidos ?? 0)} />
        <Indicador
          rotulo="Última compra"
          valor={ind?.ultimaCompra ? formatarDataCurta(ind.ultimaCompra) : "—"}
        />
        <Indicador
          rotulo="Frequência"
          valor={ind?.frequenciaMediaDias ? `a cada ${ind.frequenciaMediaDias} dias` : "—"}
        />
        <Indicador rotulo="Recompra prevista" valor={textoRecompra} />
      </dl>
    </section>
  );
}
