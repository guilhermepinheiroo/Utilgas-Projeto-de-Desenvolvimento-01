export function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

// 12 -> "+12%", -1.4 -> "-1,4%"
export function formatarVariacao(valor: number): string {
  return `${valor > 0 ? "+" : ""}${valor.toLocaleString("pt-BR")}%`;
}