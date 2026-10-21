import { opcoesFiltroEstoque } from "../../../constants/ProdutosEstoque";
import type { FiltroEstoque } from "../../../types/Estoque";

interface FiltroProdutoProps {
  valor: FiltroEstoque;
  aoAlterar: (valor: FiltroEstoque) => void;
}

export function FiltroProduto({ valor, aoAlterar }: FiltroProdutoProps) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Filtrar por produto</span>

      <select
        value={valor}
        onChange={(e) => aoAlterar(e.target.value as FiltroEstoque)}
        className="max-w-44 cursor-pointer truncate rounded-md bg-verde-painel px-3 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {opcoesFiltroEstoque.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor} className="text-neutral-900">
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}