export const esperar = (ms = 300) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// Curva previsível: o mesmo índice sempre gera o mesmo valor
export function valorSimulado(base: number, indice: number, fase: number): number {
  return Math.round(base + base * 0.4 * Math.sin(indice * 0.9 + fase));
}