import type { ReactNode } from "react";
import { Dialogo } from "../Dialogo";
import { Selo } from "../Selo";
import {
  corPorStatusVenda,
  rotulosOrigem,
  rotulosPagamento,
  rotulosStatusVenda,
} from "../../constants/Vendas";
import { catalogoProdutos } from "../../constants/ProdutosEstoque";
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

function ConteudoDetalhe({ venda }: { venda: RegistroVenda }) {
  const { data, hora } = formatarDataHora(venda.dataHora);

  return (
    <>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
                <td className="py-2 pr-2">{catalogoProdutos[item.produtoId].descricao}</td>
                <td className="py-2 text-center">{item.quantidade}</td>
                <td className="py-2 text-right">{formatarCentavos(item.precoUnitarioCentavos)}</td>
                <td className="py-2 text-right">
                  {formatarCentavos(item.precoUnitarioCentavos * item.quantidade)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
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
    </>
  );
}

interface ModalDetalheVendaProps {
  venda: RegistroVenda | null;
  aoFechar: () => void;
}

export function ModalDetalheVenda({ venda, aoFechar }: ModalDetalheVendaProps) {
  return (
    <Dialogo aberto={venda !== null} titulo="Detalhes da venda" aoFechar={aoFechar}>
      {venda && <ConteudoDetalhe venda={venda} />}
    </Dialogo>
  );
}