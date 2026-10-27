import type {
  Cliente,
  ClienteDetalhado,
  ClienteInput,
  Endereco,
  EnderecoInput,
  PaginaClientes,
  ParametrosBuscaClientes,
  Regiao,
  ResumoClientes,
  StatusCliente,
} from "../types/clientes";
import { api, ErroApi, paraCentavos } from "./Api";

interface EnderecoApi {
  id: number;
  endereco: string;
  complemento: string | null;
  cep: string | null;
  bairro: string | null;
  regiao_id: number | null;
  regiao_nome: string | null;
  taxa_entrega: number | null;
  principal: boolean;
}

interface ClienteApi {
  id: number;
  nome: string;
  telefone: string;
  cpf_cnpj: string | null;
  email: string | null;
  observacoes: string | null;
  status: StatusCliente;
  criado_em: string;
  enderecos: EnderecoApi[];
  indicadores: {
    total_pedidos: number;
    ultima_compra: string | null;
    dias_desde_ultima_compra: number | null;
    frequencia_media_dias: number | null;
    recompra_prevista_em_dias: number | null;
  } | null;
}

interface ClienteResumoApi {
  id: number;
  nome: string;
  telefone: string;
  cpf_cnpj: string | null;
  endereco_principal: string | null;
  bairro: string | null;
  ultima_compra: string | null;
  status: StatusCliente;
  criado_em: string;
}

const soDigitos = (valor: string) => valor.replace(/\D/g, "");
const ouNulo = (valor: string) => (valor.trim() ? valor.trim() : null);

function enderecoDeApi(e: EnderecoApi): Endereco {
  return {
    id: String(e.id),
    endereco: e.endereco,
    complemento: e.complemento,
    cep: e.cep,
    bairro: e.bairro,
    regiaoId: e.regiao_id !== null ? String(e.regiao_id) : null,
    regiaoNome: e.regiao_nome,
    taxaEntregaCentavos: paraCentavos(e.taxa_entrega),
    principal: e.principal,
  };
}

function clienteDeApi(c: ClienteApi): ClienteDetalhado {
  return {
    id: String(c.id),
    nome: c.nome,
    whatsapp: c.telefone,
    cpf: c.cpf_cnpj,
    email: c.email,
    observacoes: c.observacoes,
    status: c.status,
    cadastradoEm: c.criado_em,
    enderecos: c.enderecos.map(enderecoDeApi),
    indicadores: c.indicadores && {
      totalPedidos: c.indicadores.total_pedidos,
      ultimaCompra: c.indicadores.ultima_compra,
      diasDesdeUltimaCompra: c.indicadores.dias_desde_ultima_compra,
      frequenciaMediaDias: c.indicadores.frequencia_media_dias,
      recompraPrevistaEmDias: c.indicadores.recompra_prevista_em_dias,
    },
  };
}

function resumoDeApi(c: ClienteResumoApi): Cliente {
  return {
    id: String(c.id),
    nome: c.nome,
    whatsapp: c.telefone,
    cpf: c.cpf_cnpj,
    endereco: c.endereco_principal ?? "",
    bairro: c.bairro,
    ultimaCompra: c.ultima_compra,
    status: c.status,
    cadastradoEm: c.criado_em,
  };
}

function clienteParaApi(input: ClienteInput) {
  return {
    nome: input.nome.trim(),
    telefone: soDigitos(input.whatsapp),
    cpf_cnpj: soDigitos(input.cpf) || null,
    email: ouNulo(input.email),
    observacoes: ouNulo(input.observacoes),
    status: input.status,
  };
}

function enderecoParaApi(input: EnderecoInput) {
  return {
    endereco: input.endereco.trim(),
    complemento: ouNulo(input.complemento),
    cep: soDigitos(input.cep) || null,
    bairro: ouNulo(input.bairro),
    regiao_id: input.regiaoId ? Number(input.regiaoId) : null,
    principal: input.principal,
  };
}

export async function buscarClientes({
  pagina,
  tamanhoPagina,
  busca,
  status,
}: ParametrosBuscaClientes): Promise<PaginaClientes> {
  const resposta = await api.get<{ itens: ClienteResumoApi[]; total: number }>("/clientes", {
    pagina,
    tamanho: tamanhoPagina,
    busca: busca.trim(),
    status: status === "todos" ? undefined : status,
  });
  return { itens: resposta.itens.map(resumoDeApi), total: resposta.total };
}

export async function buscarResumoClientes(): Promise<ResumoClientes> {
  type Ind = { valor: number; variacao_pct: number | null };
  const r = await api.get<{ total: Ind; novos_no_mes: Ind; ativos: Ind; inadimplentes: Ind }>(
    "/clientes/resumo"
  );
  const ind = (i: Ind) => ({ valor: i.valor, variacao: i.variacao_pct });
  return {
    total: ind(r.total),
    novosNoMes: ind(r.novos_no_mes),
    ativos: ind(r.ativos),
    inadimplentes: ind(r.inadimplentes),
  };
}

export async function buscarClientePorTelefone(telefone: string): Promise<ClienteDetalhado | null> {
  try {
    const c = await api.get<ClienteApi>(`/clientes/por-telefone/${soDigitos(telefone)}`);
    return clienteDeApi(c);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 404) return null;
    throw erro;
  }
}

export async function obterCliente(id: string): Promise<ClienteDetalhado> {
  return clienteDeApi(await api.get<ClienteApi>(`/clientes/${encodeURIComponent(id)}`));
}

export async function criarCliente(
  input: ClienteInput,
  endereco?: EnderecoInput
): Promise<ClienteDetalhado> {
  const c = await api.post<ClienteApi>("/clientes", {
    ...clienteParaApi(input),
    enderecos: endereco ? [enderecoParaApi({ ...endereco, principal: true })] : [],
  });
  return clienteDeApi(c);
}

export async function atualizarCliente(id: string, input: ClienteInput): Promise<ClienteDetalhado> {
  const c = await api.put<ClienteApi>(`/clientes/${encodeURIComponent(id)}`, clienteParaApi(input));
  return clienteDeApi(c);
}

export function excluirCliente(id: string): Promise<void> {
  return api.delete(`/clientes/${encodeURIComponent(id)}`);
}

export async function adicionarEndereco(clienteId: string, input: EnderecoInput): Promise<Endereco> {
  const e = await api.post<EnderecoApi>(
    `/clientes/${encodeURIComponent(clienteId)}/enderecos`,
    enderecoParaApi(input)
  );
  return enderecoDeApi(e);
}

export async function atualizarEndereco(
  clienteId: string,
  enderecoId: string,
  input: EnderecoInput
): Promise<Endereco> {
  const e = await api.put<EnderecoApi>(
    `/clientes/${encodeURIComponent(clienteId)}/enderecos/${encodeURIComponent(enderecoId)}`,
    enderecoParaApi(input)
  );
  return enderecoDeApi(e);
}

export async function buscarRegioes(): Promise<Regiao[]> {
  const regioes = await api.get<{ id: number; nome: string; taxa_entrega: number }[]>("/regioes");
  return regioes.map((r) => ({
    id: String(r.id),
    nome: r.nome,
    taxaEntregaCentavos: paraCentavos(r.taxa_entrega),
  }));
}
