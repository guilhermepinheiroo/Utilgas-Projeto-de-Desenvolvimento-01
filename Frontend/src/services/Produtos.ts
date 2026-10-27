import type { CategoriaProduto, NivelEstoque, Produto, ProdutoInput } from "../types/Produtos";
import { api, paraCentavos, paraReais } from "./Api";

interface ProdutoApi {
  id: number;
  nome: string;
  categoria: CategoriaProduto;
  preco: number;
  estoque_atual: number;
  estoque_vazio: number;
  controla_vazio: boolean;
  estoque_minimo: number;
  ativo: boolean;
  status_estoque: NivelEstoque;
}

function produtoDeApi(p: ProdutoApi): Produto {
  return {
    id: String(p.id),
    nome: p.nome,
    categoria: p.categoria,
    precoCentavos: paraCentavos(p.preco),
    quantidade: p.estoque_atual,
    vazios: p.estoque_vazio,
    controlaVazio: p.controla_vazio,
    estoqueMinimo: p.estoque_minimo,
    ativo: p.ativo,
    nivelEstoque: p.status_estoque,
  };
}

export async function buscarProdutos(params?: {
  busca?: string;
  categoria?: CategoriaProduto;
}): Promise<Produto[]> {
  const lista = await api.get<ProdutoApi[]>("/produtos", {
    busca: params?.busca?.trim(),
    categoria: params?.categoria,
    ativo: true,
  });
  return lista.map(produtoDeApi);
}

export async function criarProduto(input: ProdutoInput): Promise<Produto> {
  const p = await api.post<ProdutoApi>("/produtos", {
    nome: input.nome.trim(),
    categoria: input.categoria,
    preco: paraReais(input.precoCentavos),
    estoque_minimo: input.estoqueMinimo,
    estoque_inicial: input.estoqueInicial ?? 0,
  });
  return produtoDeApi(p);
}

export async function editarProduto(id: string, input: ProdutoInput): Promise<Produto> {
  const p = await api.put<ProdutoApi>(`/produtos/${encodeURIComponent(id)}`, {
    nome: input.nome.trim(),
    categoria: input.categoria,
    preco: paraReais(input.precoCentavos),
    estoque_minimo: input.estoqueMinimo,
  });
  return produtoDeApi(p);
}

export function excluirProduto(id: string): Promise<void> {
  return api.delete(`/produtos/${encodeURIComponent(id)}`);
}
