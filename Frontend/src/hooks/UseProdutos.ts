import { buscarProdutos } from "../services/Produtos";
import type { CategoriaProduto } from "../types/Produtos";
import { useConsulta } from "./UseConsulta";

export function useProdutos(categoria?: CategoriaProduto) {
  const consulta = useConsulta(() => buscarProdutos({ categoria }), categoria ?? "todos");
  return {
    produtos: consulta.dados ?? [],
    carregando: consulta.carregando,
    erro: consulta.erro,
    recarregar: consulta.recarregar,
  };
}
