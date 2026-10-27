import type { VendaRegistrada } from "../../types/Vendas";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { Dialogo } from "../Dialogo";

import iconeConfirmado from "../../assets/icon-confirmar-entrega.png";

interface ModalVendaRegistradaProps {
  venda: VendaRegistrada | null;
  aoNovoAtendimento: () => void;
  aoVerEntregas: () => void;
}

const dias = (valor: number | null) => (valor === null ? "—" : `${valor} dias`);

export function ModalVendaRegistrada({ venda, aoNovoAtendimento, aoVerEntregas }: ModalVendaRegistradaProps) {
  return (
    <Dialogo aberto={venda !== null} titulo="Venda registrada" aoFechar={aoNovoAtendimento}>
      {venda && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <img src={iconeConfirmado} alt="" className="size-16 object-contain" />
            <div>
              <p className="text-lg font-bold">Pedido #{venda.numero}</p>
              <p className="text-sm text-neutral-600">
                Total {formatarCentavos(venda.totalCentavos)}
                {venda.taxaEntregaCentavos > 0 &&
                  ` (inclui ${formatarCentavos(venda.taxaEntregaCentavos)} de entrega)`}
              </p>
            </div>
          </div>

          {venda.entrega && (
            <section className="rounded-md border border-neutral-200 p-3 text-sm">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-500">Entrega</h3>
              <p>
                Pendente
                {venda.entrega.regiao && ` · ${venda.entrega.regiao}`}
              </p>
            </section>
          )}

          {venda.frequencia && (
            <section className="rounded-md border border-neutral-200 p-3 text-sm">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-500">
                Recálculo de frequência
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-neutral-500">Antes</dt>
                  <dd className="font-semibold">{dias(venda.frequencia.anteriorDias)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Agora</dt>
                  <dd className="font-semibold">{dias(venda.frequencia.novaDias)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-neutral-500">Próxima compra prevista</dt>
                  <dd className="font-semibold">
                    {venda.frequencia.recompraPrevistaEmDias !== null
                      ? `em ${venda.frequencia.recompraPrevistaEmDias} dias`
                      : "—"}
                  </dd>
                </div>
              </dl>
              {venda.frequencia.dentroDaJanelaDeContato !== null && (
                <p className="mt-2 text-xs text-neutral-600">
                  {venda.frequencia.dentroDaJanelaDeContato
                    ? "Comprou dentro do prazo esperado."
                    : "Comprou fora do prazo esperado."}
                </p>
              )}
            </section>
          )}

          <div className="flex justify-end gap-2">
            {venda.entrega && (
              <button type="button" onClick={aoVerEntregas} className="rounded-md border px-4 py-2 text-sm">
                Ver entregas
              </button>
            )}
            <button
              type="button"
              onClick={aoNovoAtendimento}
              className="rounded-md bg-sidebar px-4 py-2 text-sm font-semibold text-white"
            >
              Novo atendimento
            </button>
          </div>
        </div>
      )}
    </Dialogo>
  );
}
