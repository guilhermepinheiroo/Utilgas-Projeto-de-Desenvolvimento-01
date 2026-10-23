// "2024-03-12" -> "12 Mar 2024"
// O texto é quebrado na mão para evitar o erro de fuso horário do new Date("yyyy-mm-dd")
export function formatarDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);

  const mesAbreviado = data
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");

  const mesCapitalizado = mesAbreviado.charAt(0).toUpperCase() + mesAbreviado.slice(1);

  return `${String(dia).padStart(2, "0")} ${mesCapitalizado} ${ano}`;
}