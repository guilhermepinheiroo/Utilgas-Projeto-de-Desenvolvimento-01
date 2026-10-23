import { opcoesFiltroEstoque } from "../../../constants/ProdutosEstoque";
import type { FiltroEstoque } from "../../../types/Estoque";
import { Filtro } from "../../clientes/Filtro";

interface FiltroProdutoProps {
  valor: FiltroEstoque;
  aoAlterar: (valor: FiltroEstoque) => void;
}

export function FiltroProduto({ valor, aoAlterar }: FiltroProdutoProps) {
  return (
    <Filtro
      variante="verde"
      opcoes={opcoesFiltroEstoque}
      valor={valor}
      aoAlterar={aoAlterar}
      rotuloAcessivel="Filtrar por produto"
    />
  );
}