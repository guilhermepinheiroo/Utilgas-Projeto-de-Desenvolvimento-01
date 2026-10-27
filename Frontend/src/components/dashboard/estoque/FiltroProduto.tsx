import { useMemo } from "react";
import { useProdutos } from "../../../hooks/UseProdutos";
import type { FiltroEstoque } from "../../../types/Estoque";
import { Filtro } from "../../clientes/Filtro";
import type { OpcaoSeletor } from "../SeletorSegmentado";

interface FiltroProdutoProps {
  valor: FiltroEstoque;
  aoAlterar: (valor: FiltroEstoque) => void;
}

export function FiltroProduto({ valor, aoAlterar }: FiltroProdutoProps) {
  const { produtos } = useProdutos();
  const opcoes = useMemo<OpcaoSeletor<FiltroEstoque>[]>(
    () => [
      { valor: "todos", rotulo: "Todos os produtos" },
      ...produtos.map((p) => ({ valor: p.id, rotulo: p.nome })),
    ],
    [produtos]
  );

  return (
    <Filtro
      variante="verde"
      opcoes={opcoes}
      valor={valor}
      aoAlterar={aoAlterar}
      rotuloAcessivel="Filtrar por produto"
    />
  );
}
