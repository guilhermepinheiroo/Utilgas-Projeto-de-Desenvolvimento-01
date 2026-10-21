import { CardDestaque } from "../CardDestaque";
import { GradeDashboard } from "../GradeDashboard";
import { GraficoLinhas, type SerieGrafico } from "../GraficoLinhas";
import { UltimasInfos } from "../UltimasInfos";
import { SeletorSegmentado } from "../SeletorSegmentado";
import { ItemVenda } from "./ItensVenda";

import { opcoesPeriodo } from "../../../constants/Periodos";
import { useFaturamento } from "../../../hooks/UseFaturamento";
import { useUltimasVendas } from "../../../hooks/UseUltimasVendas";
import { useVendasGrafico } from "../../../hooks/UseVendasGrafico";
import { formatarMoeda } from "../../../utils/FormatacaoMoeda";

const series: SerieGrafico[] = [
  { chave: "botijao", nome: "Botijão", cor: "#1a8f0a" },
  { chave: "agua", nome: "Água", cor: "#0b5394" },
];

export function DashboardVendas() {
  const faturamento = useFaturamento();
  const vendas = useUltimasVendas();
  const grafico = useVendasGrafico();

  return (
    <GradeDashboard
      cartao={
        <CardDestaque titulo="Faturamento">
          <SeletorSegmentado
            opcoes={opcoesPeriodo}
            valor={faturamento.periodo}
            aoAlterar={faturamento.setPeriodo}
            rotuloAcessivel="Período do faturamento"
          />
          <p className={`text-4xl transition-opacity ${faturamento.carregando ? "opacity-50" : ""}`}>
            {faturamento.valor !== null ? formatarMoeda(faturamento.valor) : "—"}
          </p>
        </CardDestaque>
      }
      lista={
        <UltimasInfos titulo="Últimas vendas">
          {vendas.map((venda) => (
            <ItemVenda key={venda.id} venda={venda} />
          ))}
        </UltimasInfos>
      }
      grafico={
        <GraficoLinhas
          titulo="Vendas diárias: água e botijão"
          dados={grafico.dados}
          chaveEixoX="rotulo"
          series={series}
          carregando={grafico.carregando}
          controle={
            <SeletorSegmentado
              variante="verde"
              opcoes={opcoesPeriodo}
              valor={grafico.periodo}
              aoAlterar={grafico.setPeriodo}
              rotuloAcessivel="Período do gráfico de vendas"
            />
          }
        />
      }
    />
  );
}