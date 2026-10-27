import { useState, type ReactNode } from "react";
import { Dialogo } from "../Dialogo";
import { Selo } from "../Selo";
import {
  corPorStatusVenda,
  rotulosOrigem,
  rotulosPagamento,
  rotulosStatusVenda,
} from "../../constants/Vendas";
import { useAcao } from "../../hooks/UsenAcao";
import { cancelarVenda } from "../../services/Vendas";
import type { RegistroVenda } from "../../types/Vendas";
import { formatarCpf } from "../../utils/FormataCpf";
import { formatarDataHora } from "../../utils/FormataData";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{rotulo}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

const rotulosEntrega = { pendente: "Pendente", entregue: "Entregue", cancelada: "Cancelada" };

function ConteudoDetalhe({
  venda,
  aoCancelada,
}: {
  venda: RegistroVenda;
  aoCancelada: (venda: RegistroVenda) => void;
}) {
  const { data, hora } = formatarDataHora(venda.dataHora);
  const [confirmando, setConfirmando] = useState(false);
  const { executando, erro, executar } = useAcao();

  const podeCancelar = venda.status !== "cancelado" && venda.entrega?.status !== "entregue";

  async function cancelar() {
    let atualizada: RegistroVenda | null = null;
    const ok = await executar(async () => {
      atualizada = await cancelarVenda(venda.id);
    });
    if (ok && atualizada) aoCancelada(atualizada);
  }

  return (
    <>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Campo rotulo="Pedido">#{venda.numero}</Campo>
        <Campo rotulo="Cliente">{venda.cliente?.nome ?? "Cliente Indefinido"}</Campo>
        <Campo rotulo="CPF">
          {venda.cliente?.cpf ? formatarCpf(venda.cliente.cpf) : "Não informado"}
        </Campo>
        <Campo rotulo="Data e hora">
          {data} às {hora}
        </Campo>
        <Campo rotulo="Origem">
          <Selo cor="escuro">{rotulosOrigem[venda.origem]}</Selo>
        </Campo>
        <Campo rotulo="Pagamento">{rotulosPagamento[venda.pagamento]}</Campo>
        <Campo rotulo="Status">
          <Selo cor={corPorStatusVenda[venda.status]}>{rotulosStatusVenda[venda.status]}</Selo>
        </Campo>
        {venda.entrega && (
          <Campo rotulo="Entrega">
            {rotulosEntrega[venda.entrega.status]}
            {venda.entrega.regiao && ` · ${venda.entrega.regiao}`}
          </Campo>
        )}
      </dl>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-neutral-500">
            <tr>
              <th scope="col" className="pb-2 font-medium">Produto</th>
              <th scope="col" className="pb-2 text-center font-medium">Qtd.</th>
              <th scope="col" className="pb-2 text-right font-medium">Unitário</th>
              <th scope="col" className="pb-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-200">
            {venda.itens.map((item) => (
              <tr key={item.produtoId}>
                <td className="py-2 pr-2">
                  {item.produtoNome}
                  {item.descontoCentavos > 0 && (
                    <span className="block text-[11px] text-green-700">
                      desconto {formatarCentavos(item.descontoCentavos)}
                    </span>
                  )}
                </td>
                <td className="py-2 text-center">{item.quantidade}</td>
                <td className="py-2 text-right">{formatarCentavos(item.precoUnitarioCentavos)}</td>
                <td className="py-2 text-right">{formatarCentavos(item.subtotalCentavos)}</td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            {venda.taxaEntregaCentavos > 0 && (
              <tr>
                <th scope="row" colSpan={3} className="pt-3 text-right font-normal text-neutral-600">
                  Taxa de entrega
                </th>
                <td className="pt-3 text-right">{formatarCentavos(venda.taxaEntregaCentavos)}</td>
              </tr>
            )}
            <tr>
              <th scope="row" colSpan={3} className="pt-3 text-right font-medium">
                Total
              </th>
              <td className="pt-3 text-right text-base font-bold text-verde-painel">
                {formatarCentavos(venda.totalCentavos)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {erro}
        </p>
      )}

      {podeCancelar && (
        <div className="mt-5 flex justify-end gap-2 border-t border-neutral-200 pt-4">
          {confirmando ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={executando}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void cancelar()}
                disabled={executando}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {executando ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Cancelar venda
            </button>
          )}
        </div>
      )}
    </>
  );
}

interface ModalDetalheVendaProps {
  venda: RegistroVenda | null;
  aoFechar: () => void;
  aoAtualizar?: (venda: RegistroVenda) => void;
}

export function ModalDetalheVenda({ venda, aoFechar, aoAtualizar }: ModalDetalheVendaProps) {
  return (
    <Dialogo aberto={venda !== null} titulo="Detalhes da venda" aoFechar={aoFechar}>
      {venda && (
        <ConteudoDetalhe
          key={`${venda.id}-${venda.status}`}
          venda={venda}
          aoCancelada={(atualizada) => aoAtualizar?.(atualizada)}
        />
      )}
    </Dialogo>
  );
}
