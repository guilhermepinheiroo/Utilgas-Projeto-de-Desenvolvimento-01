import type { OpcaoCartao, TipoOpcaoCartao } from "../types/Cartao";
import { api } from "./Api";

interface OpcaoCartaoApi {
  id: number;
  nome: string;
  ativo: boolean;
}

const opcaoDeApi = (opcao: OpcaoCartaoApi): OpcaoCartao => ({
  id: String(opcao.id),
  nome: opcao.nome,
  ativo: opcao.ativo,
});

const caminhoDa = (tipo: TipoOpcaoCartao, id: string) => `/${tipo}/${encodeURIComponent(id)}`;

export async function listarOpcoesCartao(
  tipo: TipoOpcaoCartao,
  ativas = true
): Promise<OpcaoCartao[]> {
  const opcoes = await api.get<OpcaoCartaoApi[]>(`/${tipo}`, { ativo: ativas });
  return opcoes.map(opcaoDeApi);
}

export async function cadastrarOpcaoCartao(
  tipo: TipoOpcaoCartao,
  nome: string
): Promise<OpcaoCartao> {
  return opcaoDeApi(await api.post<OpcaoCartaoApi>(`/${tipo}`, { nome: nome.trim() }));
}

export async function renomearOpcaoCartao(
  tipo: TipoOpcaoCartao,
  id: string,
  nome: string
): Promise<OpcaoCartao> {
  return opcaoDeApi(await api.patch<OpcaoCartaoApi>(caminhoDa(tipo, id), { nome: nome.trim() }));
}

export async function alterarSituacaoOpcaoCartao(
  tipo: TipoOpcaoCartao,
  id: string,
  ativo: boolean
): Promise<OpcaoCartao> {
  return opcaoDeApi(await api.patch<OpcaoCartaoApi>(caminhoDa(tipo, id), { ativo }));
}
