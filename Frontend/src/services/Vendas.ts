import { catalogoProdutos } from "../constants/ProdutosEstoque";
import type { IdProdutoEstoque } from "../types/Estoque";
import type {
  FiltrosVendas,
  FormaPagamento,
  OrdenacaoVendas,
  PaginaVendas,
  ParametrosBuscaVendas,
  PeriodoVendas,
  ProdutoVendido,
  RegistroVenda,
  ResumoVendas,
  StatusVenda,
} from "../types/Vendas";
import { dataParaIso } from "../utils/FormataData";
import { esperar } from "../utils/Simulacao";
import { normalizar } from "../utils/Texto";
import { obterClienteMock } from "./Clientes";

const CLIENTES_NO_MOCK = 120;
const DIAS_DE_HISTORICO = 45;

const formasPagamento: FormaPagamento[] = ["pix", "dinheiro", "pix", "credito", "debito", "pix", "dinheiro"];
const botijoesVendidos: IdProdutoEstoque[] = [
  "botijaoP13", "botijaoP13", "botijaoP5", "botijaoP20", "botijaoP13", "botijaoP45",
];

function dataDeDiasAtras(dias: number): Date {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data;
}

function cpfSimulado(indice: number): string {
  return String(10000000000 + ((indice * 7919 + 13579) % 89999999999)).padStart(11, "0");
}

function criarItem(produtoId: IdProdutoEstoque, quantidade: number): ProdutoVendido {
  return { produtoId, quantidade, precoUnitarioCentavos: catalogoProdutos[produtoId].precoCentavos };
}

function criarVenda(sequencia: number, diasAtras: number, posicaoNoDia: number): RegistroVenda {
  const indiceCliente = (sequencia * 37) % CLIENTES_NO_MOCK;
  const clienteMock = obterClienteMock(indiceCliente);
  const semCadastro = sequencia % 5 === 0;

  const itens = [criarItem(botijoesVendidos[sequencia % botijoesVendidos.length], 1)];
  if (sequencia % 2 === 0) itens.push(criarItem("agua20l", sequencia % 3 === 0 ? 2 : 1));

  const hora = String(8 + ((posicaoNoDia * 53 + diasAtras) % 13)).padStart(2, "0");
  const minuto = String((posicaoNoDia * 17 + diasAtras * 7) % 60).padStart(2, "0");

  const status: StatusVenda =
    sequencia % 23 === 5 ? "cancelado" : sequencia % 6 === 2 ? "pendente" : "pago";

  return {
    id: `venda-${sequencia + 1}`,
    cliente: semCadastro
      ? null
      : {
          id: clienteMock.id,
          nome: clienteMock.nome,
          cpf: indiceCliente % 4 === 0 ? null : cpfSimulado(indiceCliente),
        },
    origem: sequencia % 3 === 1 ? "entrega" : "portaria",
    itens,
    dataHora: `${dataParaIso(dataDeDiasAtras(diasAtras))}T${hora}:${minuto}:00`,
    pagamento: formasPagamento[sequencia % formasPagamento.length],
    status,
    totalCentavos: itens.reduce((soma, item) => soma + item.precoUnitarioCentavos * item.quantidade, 0),
  };
}

function gerarVendas(): RegistroVenda[] {
  const vendas: RegistroVenda[] = [];
  let sequencia = 0;

  for (let dia = 0; dia < DIAS_DE_HISTORICO; dia++) {
    const quantidadeNoDia = dia === 0 ? 18 : 6 + ((dia * 5) % 9);

    for (let posicao = 0; posicao < quantidadeNoDia; posicao++) {
      vendas.push(criarVenda(sequencia++, dia, posicao));
    }
  }

  return vendas;
}

// Base simulada. Com o backend, isso vira o banco de dados.
const vendas = gerarVendas();

function intervaloDoPeriodo(periodo: PeriodoVendas): { de: string; ate: string } {
  const hoje = new Date();

  switch (periodo) {
    case "hoje":
      return { de: dataParaIso(hoje), ate: dataParaIso(hoje) };
    case "ontem": {
      const ontem = dataParaIso(dataDeDiasAtras(1));
      return { de: ontem, ate: ontem };
    }
    case "7dias":
      return { de: dataParaIso(dataDeDiasAtras(6)), ate: dataParaIso(hoje) };
    case "30dias":
      return { de: dataParaIso(dataDeDiasAtras(29)), ate: dataParaIso(hoje) };
    case "mes":
      return {
        de: dataParaIso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        ate: dataParaIso(hoje),
      };
  }
}

function filtrar(filtros: FiltrosVendas): RegistroVenda[] {
  const { de, ate } = intervaloDoPeriodo(filtros.periodo);
  const termo = normalizar(filtros.busca.trim());
  const termoNumerico = filtros.busca.replace(/\D/g, "");

  return vendas.filter((venda) => {
    const dia = venda.dataHora.slice(0, 10);

    if (dia < de || dia > ate) return false;
    if (filtros.clienteId && venda.cliente?.id !== filtros.clienteId) return false;
    if (filtros.pagamento !== "todos" && venda.pagamento !== filtros.pagamento) return false;
    if (filtros.status !== "todos" && venda.status !== filtros.status) return false;
    if (!termo) return true;

    const nomeCliente = normalizar(venda.cliente?.nome ?? "Cliente Indefinido");
    const produtos = venda.itens
      .map((item) => normalizar(catalogoProdutos[item.produtoId].descricao))
      .join(" ");
    const cpf = venda.cliente?.cpf ?? "";

    return (
      nomeCliente.includes(termo) ||
      produtos.includes(termo) ||
      (termoNumerico.length > 0 && cpf.includes(termoNumerico))
    );
  });
}

const comparadores: Record<OrdenacaoVendas, (a: RegistroVenda, b: RegistroVenda) => number> = {
  recentes: (a, b) => b.dataHora.localeCompare(a.dataHora),
  antigas: (a, b) => a.dataHora.localeCompare(b.dataHora),
  maior: (a, b) => b.totalCentavos - a.totalCentavos,
  menor: (a, b) => a.totalCentavos - b.totalCentavos,
};

export async function buscarVendas({
  ordenacao,
  pagina,
  tamanhoPagina,
  ...filtros
}: ParametrosBuscaVendas): Promise<PaginaVendas> {
  await esperar();

  const ordenadas = filtrar(filtros).sort(comparadores[ordenacao]);
  const inicio = (pagina - 1) * tamanhoPagina;

  return { itens: ordenadas.slice(inicio, inicio + tamanhoPagina), total: ordenadas.length };
}

// Vendas canceladas não entram nos totais
export async function buscarResumoVendas(filtros: FiltrosVendas): Promise<ResumoVendas> {
  await esperar();

  const validas = filtrar(filtros).filter((venda) => venda.status !== "cancelado");
  const totalCentavos = validas.reduce((soma, venda) => soma + venda.totalCentavos, 0);
  const clientes = new Set(validas.flatMap((venda) => (venda.cliente ? [venda.cliente.id] : [])));

  return {
    totalCentavos,
    quantidade: validas.length,
    clientesAtendidos: clientes.size,
    ticketMedioCentavos: validas.length ? Math.round(totalCentavos / validas.length) : 0,
  };
}