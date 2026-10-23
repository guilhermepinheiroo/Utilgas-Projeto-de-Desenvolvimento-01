export type StatusCliente = "ativo" | "inativo" | "inadimplente";

export type FiltroStatus = "todos" | StatusCliente;

export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string; // só dígitos, ex.: 53988124477
  endereco: string;
  ultimaCompra: string | null; // yyyy-mm-dd
  status: StatusCliente;
  cadastradoEm: string; // yyyy-mm-dd
}

export interface IndicadorClientes {
  valor: number;
  variacao: number; // em %
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