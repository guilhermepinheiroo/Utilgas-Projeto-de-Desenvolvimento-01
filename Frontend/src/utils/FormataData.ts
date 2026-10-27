const FUSO = "America/Sao_Paulo";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});

// "2024-03-12" -> "12 Mar 2024"
// O texto é quebrado na mão para evitar o erro de fuso horário do new Date("yyyy-mm-dd")
export function formatarDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
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

// "2026-09-19T14:45:00+00:00" -> { data: "19/09/2026", hora: "11:45" }
export function formatarDataHora(iso: string | null | undefined): { data: string; hora: string } {
  if (!iso) return { data: "—", hora: "—" };

  const temFuso = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  if (temFuso) {
    const data = new Date(iso);
    if (!Number.isNaN(data.getTime())) {
      return { data: formatoData.format(data), hora: formatoHora.format(data) };
    }
  }

  const [data, hora = "00:00"] = iso.split("T");
  const [ano, mes, dia] = data.split("-");
  return { data: `${dia}/${mes}/${ano}`, hora: hora.slice(0, 5) };
}
