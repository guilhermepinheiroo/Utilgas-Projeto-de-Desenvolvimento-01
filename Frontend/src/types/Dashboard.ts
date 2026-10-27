export type Periodo = "hoje" | "7dias" | "30dias";

export interface OpcaoSeletor<T extends string> {
  valor: T;
  rotulo: string;
}

export type TipoProduto = "botijao" | "agua" | "acessorio";

export interface Venda {
  id: string;
  produto: string;
  tipo: TipoProduto;
  horario: string;
  status: string; // "Pendente", "Entregue", "Portaria", "Cancelada"...
}

export interface PontoGraficoVendas {
  rotulo: string;
  botijao: number;
  agua: number;
}
