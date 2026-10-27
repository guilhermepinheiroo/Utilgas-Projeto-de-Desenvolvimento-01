import type {
  FormaPagamento,
  NovaVenda,
  OrdenacaoVendas,
  PaginaVendas,
  ParametrosBuscaVendas,
  PeriodoVendas,
  RegistroVenda,
  StatusVenda,
  VendaRegistrada,
} from "../types/Vendas";
import { api, paraCentavos, paraReais } from "./Api";

type FormaApi = "pix" | "dinheiro" | "cartao_credito" | "cartao_debito";
type StatusApi = "pendente" | "concluida" | "cancelada";

interface VendaApi {
  id: number;
  criado_em: string;
  origem: "atendimento" | "portaria";
  cliente_id: number | null;
  cliente_nome: string | null;
  cliente_cpf: string | null;
  forma_pagamento: FormaApi;
  subtotal: number;
  desconto: number;
  taxa_entrega: number;
  total: number;
  status: StatusApi;
  itens: {
    produto_id: number;
    produto_nome: string;
    categoria: string | null;
    quantidade: number;
    preco_unitario: number;
    desconto: number;
    subtotal: number;
  }[];
  entrega: {
    id: number;
    status: "pendente" | "entregue" | "cancelada";
    regiao: string | null;
    entregador_id: number | null;
  } | null;
  frequencia?: {
    anterior_dias: number | null;
    nova_dias: number | null;
    recompra_prevista_em_dias: number | null;
    dentro_da_janela_de_contato: boolean | null;
  } | null;
}

const formaDeApi: Record<FormaApi, FormaPagamento> = {
  pix: "pix",
  dinheiro: "dinheiro",
  cartao_credito: "credito",
  cartao_debito: "debito",
};

export const formaParaApi: Record<FormaPagamento, FormaApi> = {
  pix: "pix",
  dinheiro: "dinheiro",
  credito: "cartao_credito",
  debito: "cartao_debito",
};

const statusDeApi: Record<StatusApi, StatusVenda> = {
  concluida: "pago",
  pendente: "pendente",
  cancelada: "cancelado",
};

const statusParaApi: Record<StatusVenda, StatusApi> = {
  pago: "concluida",
  pendente: "pendente",
  cancelado: "cancelada",
};

const periodoParaApi: Record<PeriodoVendas, string> = {
  hoje: "hoje",
  ontem: "ontem",
  "7dias": "7d",
  "30dias": "30d",
  mes: "mes",
};

const ordemParaApi: Record<OrdenacaoVendas, string> = {
  recentes: "mais_recentes",
  antigas: "mais_antigas",
  maior: "maior_valor",
  menor: "menor_valor",
};

function vendaDeApi(v: VendaApi): RegistroVenda {
  return {
    id: String(v.id),
    numero: v.id,
    cliente:
      v.cliente_id !== null
        ? { id: String(v.cliente_id), nome: v.cliente_nome ?? "Cliente", cpf: v.cliente_cpf }
        : null,
    origem: v.origem === "atendimento" ? "entrega" : "portaria",
    itens: v.itens.map((i) => ({
      produtoId: String(i.produto_id),
      produtoNome: i.produto_nome,
      categoria: i.categoria,
      quantidade: i.quantidade,
      precoUnitarioCentavos: paraCentavos(i.preco_unitario),
      descontoCentavos: paraCentavos(i.desconto),
      subtotalCentavos: paraCentavos(i.subtotal),
    })),
    dataHora: v.criado_em,
    pagamento: formaDeApi[v.forma_pagamento],
    status: statusDeApi[v.status],
    subtotalCentavos: paraCentavos(v.subtotal),
    descontoCentavos: paraCentavos(v.desconto),
    taxaEntregaCentavos: paraCentavos(v.taxa_entrega),
    totalCentavos: paraCentavos(v.total),
    entrega: v.entrega && {
      id: String(v.entrega.id),
      status: v.entrega.status,
      regiao: v.entrega.regiao,
      entregadorId: v.entrega.entregador_id !== null ? String(v.entrega.entregador_id) : null,
    },
  };
}

export async function buscarVendas({
  periodo,
  clienteId,
  pagamento,
  status,
  busca,
  ordenacao,
  pagina,
  tamanhoPagina,
}: ParametrosBuscaVendas): Promise<PaginaVendas> {
  const r = await api.get<{
    itens: VendaApi[];
    total: number;
    totais: {
      total_vendas: number;
      quantidade_vendas: number;
      clientes_atendidos: number;
      ticket_medio: number;
    };
  }>("/vendas", {
    periodo: periodoParaApi[periodo],
    cliente_id: clienteId,
    forma_pagamento: pagamento === "todos" ? undefined : formaParaApi[pagamento],
    status: status === "todos" ? undefined : statusParaApi[status],
    busca: busca.trim(),
    ordem: ordemParaApi[ordenacao],
    pagina,
    tamanho: tamanhoPagina,
  });

  return {
    itens: r.itens.map(vendaDeApi),
    total: r.total,
    resumo: {
      totalCentavos: paraCentavos(r.totais.total_vendas),
      quantidade: r.totais.quantidade_vendas,
      clientesAtendidos: r.totais.clientes_atendidos,
      ticketMedioCentavos: paraCentavos(r.totais.ticket_medio),
    },
  };
}

export async function registrarVenda(venda: NovaVenda): Promise<VendaRegistrada> {
  const v = await api.post<VendaApi>("/vendas", {
    origem: venda.origem,
    cliente_id: venda.clienteId ? Number(venda.clienteId) : null,
    endereco_id: venda.enderecoId ? Number(venda.enderecoId) : null,
    forma_pagamento: formaParaApi[venda.pagamento],
    observacao_entregador: venda.observacaoEntregador?.trim() || null,
    itens: venda.itens.map((item) => ({
      produto_id: Number(item.produtoId),
      quantidade: item.quantidade,
      desconto: paraReais(item.descontoCentavos),
    })),
  });

  return {
    ...vendaDeApi(v),
    frequencia: v.frequencia
      ? {
          anteriorDias: v.frequencia.anterior_dias,
          novaDias: v.frequencia.nova_dias,
          recompraPrevistaEmDias: v.frequencia.recompra_prevista_em_dias,
          dentroDaJanelaDeContato: v.frequencia.dentro_da_janela_de_contato,
        }
      : null,
  };
}

export async function cancelarVenda(id: string): Promise<RegistroVenda> {
  return vendaDeApi(await api.post<VendaApi>(`/vendas/${encodeURIComponent(id)}/cancelar`));
}

export async function buscarVendasDeHoje(tamanho = 30): Promise<RegistroVenda[]> {
  const r = await buscarVendas({
    periodo: "hoje",
    clienteId: null,
    pagamento: "todos",
    status: "todos",
    busca: "",
    ordenacao: "recentes",
    pagina: 1,
    tamanhoPagina: tamanho,
  });
  return r.itens;
}
