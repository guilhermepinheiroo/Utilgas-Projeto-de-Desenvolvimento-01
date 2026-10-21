import type { Periodo, PontoGraficoVendas, Venda } from "../types/Dashboard";
import { esperar, valorSimulado } from "../utils/Simulacao";

const faturamentoPorPeriodo: Record<Periodo, number> = {
  hoje: 850,
  "7dias": 6000,
  "30dias": 24500,
};

const horas = ["08h", "09h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h", "21h"];
const botijaoPorHora = [1, 5, 6, 1, 2, 7, 11, 2, 12, 0, 1, 5, 10, 2];
const aguaPorHora = [1, 5, 9, 12, 2, 6, 3, 8, 15, 19, 17, 15, 15, 6];

const vendasIniciais: Venda[] = [
  { id: "1", produto: "Botijão P13", tipo: "botijao", horario: "08:30", status: "Entregue" },
  { id: "2", produto: "Água 20L", tipo: "agua", horario: "09:30", status: "Entregue" },
  { id: "3", produto: "Água 20L", tipo: "agua", horario: "10:30", status: "Entregue" },
  { id: "4", produto: "Botijão P13", tipo: "botijao", horario: "08:30", status: "Entregue" },
  { id: "5", produto: "Botijão P13", tipo: "botijao", horario: "08:30", status: "Entregue" },
  { id: "6", produto: "Água 20L", tipo: "agua", horario: "10:30", status: "Entregue" },
  { id: "7", produto: "Botijão P13", tipo: "botijao", horario: "08:30", status: "Entregue" },
  { id: "8", produto: "Água 20L", tipo: "agua", horario: "10:30", status: "Entregue" },
];

function gerarDias(quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date();
    data.setDate(data.getDate() - (quantidade - 1 - i));
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  });
}


export async function buscarFaturamento(periodo: Periodo): Promise<number> {
  await esperar();
  return faturamentoPorPeriodo[periodo];
}

export async function buscarUltimasVendas(): Promise<Venda[]> {
  await esperar();
  return vendasIniciais;
}

export async function buscarVendasGrafico(periodo: Periodo): Promise<PontoGraficoVendas[]> {
  await esperar();

  if (periodo === "hoje") {
    return horas.map((rotulo, i) => ({
      rotulo,
      botijao: botijaoPorHora[i],
      agua: aguaPorHora[i],
    }));
  }

  const quantidadeDias = periodo === "7dias" ? 7 : 30;

  return gerarDias(quantidadeDias).map((rotulo, i) => ({
    rotulo,
    botijao: valorSimulado(60, i, 0),
    agua: valorSimulado(90, i, 2),
  }));
}

// Usada só para simular vendas chegando em tempo real
export function gerarVendaAleatoria(): Venda {
  const ehBotijao = Math.random() > 0.5;
  const agora = new Date();

  return {
    id: crypto.randomUUID(),
    produto: ehBotijao ? "Botijão P13" : "Água 20L",
    tipo: ehBotijao ? "botijao" : "agua",
    horario: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    status: "Pendente",
  };
}