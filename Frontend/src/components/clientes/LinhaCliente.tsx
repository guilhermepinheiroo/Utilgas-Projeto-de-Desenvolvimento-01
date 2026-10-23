import { Avatar } from "./Avatar";
import { BadgeStatusCliente } from "./BadgeStatusCliente";
import type { Cliente } from "../../types/clientes";
import { formatarDataCurta } from "../../utils/FormataData";
import { formatarTelefone } from "../../utils/FormatacaoTelefone";

import iconeEditar from "../../assets/telaclientes/icon-editar-cliente.png";
import iconeLixeira from "../../assets/telaclientes/icon-lixeira.png";

interface LinhaClienteProps {
  cliente: Cliente;
  aoEditar: (cliente: Cliente) => void;
  aoExcluir: (cliente: Cliente) => void;
}

export function LinhaCliente({ cliente, aoEditar, aoExcluir }: LinhaClienteProps) {
  return (
    <tr className="hover:bg-neutral-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar nome={cliente.nome} />
          <span
            title={cliente.nome}
            className="max-w-36 truncate text-[13px] font-semibold text-neutral-900"
          >
            {cliente.nome}
          </span>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
        {formatarTelefone(cliente.whatsapp)}
      </td>

      <td title={cliente.endereco} className="max-w-36 truncate px-4 py-3 text-neutral-500">
        {cliente.endereco}
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
        {cliente.ultimaCompra ? formatarDataCurta(cliente.ultimaCompra) : "—"}
      </td>

      <td className="px-4 py-3">
        <BadgeStatusCliente status={cliente.status} />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={`Editar ${cliente.nome}`}
            onClick={() => aoEditar(cliente)}
            className="cursor-pointer rounded-md bg-blue-100 p-1.5 transition-colors hover:bg-blue-200"
          >
            <img src={iconeEditar} alt="" className="size-3.5 object-contain" />
          </button>

          <button
            type="button"
            aria-label={`Excluir ${cliente.nome}`}
            onClick={() => aoExcluir(cliente)}
            className="cursor-pointer rounded-md bg-red-100 p-1.5 transition-colors hover:bg-red-200"
          >
            <img src={iconeLixeira} alt="" className="size-3.5 object-contain" />
          </button>
        </div>
      </td>
    </tr>
  );
}