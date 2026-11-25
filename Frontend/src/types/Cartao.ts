export type TipoOpcaoCartao = "maquininhas" | "bandeiras";

export interface OpcaoCartao {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface CartaoSelecionado {
  maquininhaId: string;
  bandeiraId: string;
}

export interface CartaoUsado {
  maquininha: string | null;
  bandeira: string | null;
}
