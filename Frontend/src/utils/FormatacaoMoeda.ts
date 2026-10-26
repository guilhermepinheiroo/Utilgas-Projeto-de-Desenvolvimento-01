const formatador = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatarMoeda(valor: number): string {
  return formatador.format(valor);
}

export function formatarCentavos(valor: number): string {
  return formatarMoeda(valor / 100);
}