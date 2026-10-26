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
// Date -> "2026-09-19" (data local, sem problema de fuso)
export function dataParaIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// "2026-09-19T11:45:00" -> { data: "19/09/2026", hora: "11:45" }
export function formatarDataHora(iso: string): { data: string; hora: string } {
  const [data, hora] = iso.split("T");
  const [ano, mes, dia] = data.split("-");

  return { data: `${dia}/${mes}/${ano}`, hora: hora.slice(0, 5) };
}