import { CardDestaque } from "../CardDestaque";
import { GradeDashboard } from "../GradeDashboard";
import { GraficoLinhas } from "../GraficoLinhas";
import { SeletorSegmentado } from "../SeletorSegmentado";
import { UltimasInfos } from "../UltimasInfos";
import { FiltroProduto } from "./FiltroProduto";
import { ItemMovimentacao } from "./ItemMovimentacao";
import { VariacaoMensal } from "./Variacaomensal";

import { opcoesCategoriaGrafico } from "../../../constants/ProdutosEstoque";
import { useEstoqueGrafico } from "../../../hooks/UseEstoqueGrafico";
import { useMovimentacoes } from "../../../hooks/UseMovimentacoes";
import { useResumoEstoque } from "../../../hooks/UseResumoEstoque";

export function DashboardEstoque() {
  const movimentacoes = useMovimentacoes();
  const estoque = useResumoEstoque(movimentacoes[0]?.id);
  const grafico = useEstoqueGrafico();

  return (
    <GradeDashboard
      cartao={
        <CardDestaque titulo="Estoque">
          <div className="flex w-full items-center justify-between gap-4">
            <p className="text-sm">Quantidade em estoque</p>
            <FiltroProduto valor={estoque.filtro} aoAlterar={estoque.setFiltro} />
          </div>

          <p className={`text-6xl transition-opacity ${estoque.carregando ? "opacity-50" : ""}`}>
            {estoque.resumo?.quantidade ?? "—"}
          </p>

          {estoque.resumo && estoque.resumo.variacaoMensal !== null && (
            <VariacaoMensal percentual={estoque.resumo.variacaoMensal} />
          )}
        </CardDestaque>
      }
      lista={
        <UltimasInfos titulo="Entradas e saídas">
          {movimentacoes.length === 0 && (
            <li className="px-3 py-4 text-center text-xs text-neutral-500">
              Nenhuma movimentação registrada.
            </li>
          )}
          {movimentacoes.map((movimentacao) => (
            <ItemMovimentacao key={movimentacao.id} movimentacao={movimentacao} />
          ))}
        </UltimasInfos>
      }
      grafico={
        <GraficoLinhas
          titulo={`Estoque no fim de cada mês: ${grafico.categoria === "agua" ? "água" : "gás"}`}
          dados={grafico.dados}
          chaveEixoX="rotulo"
          series={grafico.series}
          carregando={grafico.carregando}
          controle={
            <SeletorSegmentado
              variante="verde"
              opcoes={opcoesCategoriaGrafico}
              valor={grafico.categoria}
              aoAlterar={grafico.setCategoria}
              rotuloAcessivel="Categoria do gráfico de estoque"
            />
          }
        />
      }
    />
  );
}