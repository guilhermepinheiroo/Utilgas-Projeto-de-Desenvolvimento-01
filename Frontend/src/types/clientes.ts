export type StatusCliente = "ativo" | "inativo" | "inadimplente";

export type FiltroStatus = "todos" | StatusCliente;

export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string; // só dígitos, ex.: 53988124477
  cpf: string | null; // só dígitos
  endereco: string; // endereço principal ("" se não tiver)
  bairro: string | null;
  ultimaCompra: string | null; // yyyy-mm-dd
  status: StatusCliente;
  cadastradoEm: string; // ISO
}

export interface Endereco {
  id: string;
  endereco: string;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  regiaoId: string | null;
  regiaoNome: string | null;
  taxaEntregaCentavos: number;
  principal: boolean;
}

export interface IndicadoresCliente {
  totalPedidos: number;
  ultimaCompra: string | null;
  diasDesdeUltimaCompra: number | null;
  frequenciaMediaDias: number | null;
  recompraPrevistaEmDias: number | null;
}

export interface ClienteDetalhado {
  id: string;
  nome: string;
  whatsapp: string;
  cpf: string | null;
  email: string | null;
  observacoes: string | null;
  status: StatusCliente;
  cadastradoEm: string;
  enderecos: Endereco[];
  indicadores: IndicadoresCliente | null;
}

export interface ClienteInput {
  nome: string;
  whatsapp: string;
  cpf: string;
  email: string;
  observacoes: string;
  status: StatusCliente;
}

export interface EnderecoInput {
  endereco: string;
  complemento: string;
  cep: string;
  bairro: string;
  regiaoId: string;
  principal: boolean;
}

export interface Regiao {
  id: string;
  nome: string;
  taxaEntregaCentavos: number;
}

export interface IndicadorClientes {
  valor: number;
  variacao: number | null; // em %
}

export interface ResumoClientes {
  total: IndicadorClientes;
  novosNoMes: IndicadorClientes;
  ativos: IndicadorClientes;
  inadimplentes: IndicadorClientes;
}

export interface ParametrosBuscaClientes {
  pagina: number;
  tamanhoPagina: number;
  busca: string;
  status: FiltroStatus;
}

export interface PaginaClientes {
  itens: Cliente[];
  total: number;
}
