export type FormaPagamento = "pix" | "dinheiro" | "debito" | "credito";
export type StatusVenda = "pago" | "pendente" | "cancelado";
export type OrigemVenda = "portaria" | "entrega";
export type PeriodoVendas = "hoje" | "ontem" | "7dias" | "30dias" | "mes";
export type OrdenacaoVendas = "recentes" | "antigas" | "maior" | "menor";

export type FiltroPagamento = "todos" | FormaPagamento;
export type FiltroStatusVenda = "todos" | StatusVenda;

export interface ProdutoVendido {
  produtoId: string;
  produtoNome: string;
  categoria: string | null;
  quantidade: number;
  precoUnitarioCentavos: number; // preço no momento da venda
  descontoCentavos: number;
  subtotalCentavos: number;
}

export interface ClienteDaVenda {
  id: string;
  nome: string;
  cpf: string | null; // só dígitos
}

export interface EntregaDaVenda {
  id: string;
  status: "pendente" | "entregue" | "cancelada";
  regiao: string | null;
  entregadorId: string | null;
}

export interface RegistroVenda {
  id: string;
  numero: number;
  cliente: ClienteDaVenda | null; // null = "Cliente Indefinido"
  origem: OrigemVenda;
  itens: ProdutoVendido[];
  dataHora: string; // ISO com fuso
  pagamento: FormaPagamento;
  status: StatusVenda;
  subtotalCentavos: number;
  descontoCentavos: number;
  taxaEntregaCentavos: number;
  totalCentavos: number;
  entrega: EntregaDaVenda | null;
}

export interface FrequenciaRecalculada {
  anteriorDias: number | null;
  novaDias: number | null;
  recompraPrevistaEmDias: number | null;
  dentroDaJanelaDeContato: boolean | null;
}

export interface VendaRegistrada extends RegistroVenda {
  frequencia: FrequenciaRecalculada | null;
}

export interface ItemNovaVenda {
  produtoId: string;
  quantidade: number;
  descontoCentavos: number;
}

export interface NovaVenda {
  origem: "atendimento" | "portaria";
  clienteId: string | null;
  enderecoId: string | null;
  pagamento: FormaPagamento;
  observacaoEntregador?: string;
  itens: ItemNovaVenda[];
}

export interface FiltrosVendas {
  periodo: PeriodoVendas;
  clienteId: string | null;
  pagamento: FiltroPagamento;
  status: FiltroStatusVenda;
  busca: string;
}

export interface ParametrosBuscaVendas extends FiltrosVendas {
  ordenacao: OrdenacaoVendas;
  pagina: number;
  tamanhoPagina: number;
}

export interface ResumoVendas {
  totalCentavos: number;
  quantidade: number;
  clientesAtendidos: number;
  ticketMedioCentavos: number;
}

export interface PaginaVendas {
  itens: RegistroVenda[];
  total: number;
  resumo: ResumoVendas;
}
