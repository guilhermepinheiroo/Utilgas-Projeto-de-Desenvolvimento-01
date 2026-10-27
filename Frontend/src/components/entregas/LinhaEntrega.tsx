import { BadgeStatusEntrega } from "./BadgeStatusEntrega";
import { iconeDaCategoria } from "../../constants/IconesEstoque";
import type { Entrega } from "../../types/Entregas";
import { formatarDataHora } from "../../utils/FormataData";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { formatarTelefone } from "../../utils/FormatacaoTelefone";

import iconeEditar from "../../assets/icon-editar-entregas.png";

interface LinhaEntregaProps {
  entrega: Entrega;
  aoAbrirAcoes: (entrega: Entrega) => void;
}

export function LinhaEntrega({ entrega, aoAbrirAcoes }: LinhaEntregaProps) {
  const { hora } = formatarDataHora(entrega.criadoEm);
  const podeAgir = entrega.status === "pendente";

  return (
    <tr className="hover:bg-neutral-50">
      <td className="px-4 py-3">
        <BadgeStatusEntrega status={entrega.status} />
      </td>

      <td className="px-4 py-3">
        <p className="font-medium leading-tight text-neutral-900">{entrega.cliente.nome}</p>
        <p className="text-[11px] text-neutral-400">{formatarTelefone(entrega.cliente.whatsapp)}</p>
      </td>

      <td className="px-4 py-3 text-neutral-800">
        {entrega.entregador?.nome ?? <span className="text-orange-600">Não atribuído</span>}
      </td>

      <td className="max-w-44 px-4 py-3 text-neutral-800">
        {entrega.cliente.endereco}
        {entrega.cliente.bairro && (
          <span className="block text-[11px] text-neutral-400">{entrega.cliente.bairro}</span>
        )}
      </td>

      <td className="px-4 py-3">
        <ul className="flex flex-col gap-1.5">
          {entrega.itens.map((item, indice) => (
            <li key={`${item.produtoNome}-${indice}`} className="flex items-center gap-2">
              <img
                src={iconeDaCategoria(item.categoria)}
                alt=""
                className="size-5 shrink-0 object-contain"
              />
              <span className="text-[11px] leading-tight text-neutral-800">
                <span className="block">{item.quantidade}x</span>
                <span className="block">{item.produtoNome}</span>
              </span>
            </li>
          ))}
        </ul>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-neutral-800">{hora}</td>

      <td className="whitespace-nowrap px-4 py-3 text-neutral-800">
        {formatarCentavos(entrega.totalCentavos)}
      </td>

      <td className="px-4 py-3 text-center">
        <button
          type="button"
          disabled={!podeAgir}
          onClick={() => aoAbrirAcoes(entrega)}
          aria-label={`Ações da entrega do pedido ${entrega.numeroPedido}`}
          title={podeAgir ? undefined : "Entregas finalizadas ou canceladas não podem ser alteradas"}
          className="rounded-md bg-slate-100 p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-100"
        >
          <img src={iconeEditar} alt="" className="size-4 object-contain" />
        </button>
      </td>
    </tr>
  );
}