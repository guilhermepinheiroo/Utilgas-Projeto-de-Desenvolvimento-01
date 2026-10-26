import { LinhaEntrega } from "./LinhaEntrega";
import { Paginacao } from "../clientes/Paginacao";
import type { Entrega } from "../../types/Entregas";
import { formatarNumero } from "../../utils/FormataNumero";

interface TabelaEntregasProps {
  entregas: Entrega[];
  total: number;
  pagina: number;
  totalPaginas: number;
  carregando: boolean;
  aoMudarPagina: (pagina: number) => void;
  aoAbrirAcoes: (entrega: Entrega) => void;
}

const colunas = ["Status", "Cliente", "Entregador", "Endereço", "Produto", "Hora", "Valor", "Ações"];

export function TabelaEntregas({
  entregas,
  total,
  pagina,
  totalPaginas,
  carregando,
  aoMudarPagina,
  aoAbrirAcoes,
}: TabelaEntregasProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-sidebar text-white">
            <tr>
              {colunas.map((coluna) => (
                <th
                  key={coluna}
                  scope="col"
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide"
                >
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-neutral-200 transition-opacity ${
              carregando ? "opacity-50" : ""
            }`}
          >
            {entregas.map((entrega) => (
              <LinhaEntrega key={entrega.id} entrega={entrega} aoAbrirAcoes={aoAbrirAcoes} />
            ))}
          </tbody>
        </table>
      </div>

      {!carregando && entregas.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-neutral-500">
          Nenhuma entrega encontrada para esses filtros.
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-slate-50 px-4 py-3">
        <p className="text-xs text-neutral-500">
          Mostrando <strong className="text-neutral-900">{entregas.length}</strong> de{" "}
          <strong className="text-neutral-900">{formatarNumero(total)}</strong> entregas
        </p>

        <Paginacao paginaAtual={pagina} totalPaginas={totalPaginas} aoMudar={aoMudarPagina} />
      </footer>
    </section>
  );
}