import { LinhaCliente } from "./LinhaCliente";
import { Paginacao } from "./Paginacao";
import type { Cliente } from "../../types/clientes";
import { formatarNumero } from "../../utils/FormataNumero";

interface TabelaClientesProps {
  clientes: Cliente[];
  total: number;
  pagina: number;
  totalPaginas: number;
  carregando: boolean;
  aoMudarPagina: (pagina: number) => void;
  aoEditar: (cliente: Cliente) => void;
  aoExcluir: (cliente: Cliente) => void;
}

const colunas = ["Nome", "WhatsApp", "Endereço", "Última Compra", "Status"];

export function TabelaClientes({
  clientes,
  total,
  pagina,
  totalPaginas,
  carregando,
  aoMudarPagina,
  aoEditar,
  aoExcluir,
}: TabelaClientesProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-neutral-500">
            <tr>
              {colunas.map((coluna) => (
                <th key={coluna} scope="col" className="px-4 py-3 font-medium">
                  {coluna}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-center font-medium">
                Ações
              </th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-neutral-200 transition-opacity ${
              carregando ? "opacity-50" : ""
            }`}
          >
            {clientes.map((cliente) => (
              <LinhaCliente
                key={cliente.id}
                cliente={cliente}
                aoEditar={aoEditar}
                aoExcluir={aoExcluir}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!carregando && clientes.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-neutral-500">
          Nenhum cliente encontrado.
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-slate-100 px-4 py-3">
        <p className="text-xs text-neutral-500">
          Mostrando <strong className="text-neutral-900">{clientes.length}</strong> de{" "}
          <strong className="text-neutral-900">{formatarNumero(total)}</strong> clientes
        </p>

        <Paginacao paginaAtual={pagina} totalPaginas={totalPaginas} aoMudar={aoMudarPagina} />
      </footer>
    </section>
  );
}