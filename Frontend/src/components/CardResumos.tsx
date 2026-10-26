import type { ReactNode } from "react";

type CorValor = "verde" | "laranja" | "escuro";
type EstiloTitulo = "destaque" | "discreto";

const coresValor: Record<CorValor, string> = {
  verde: "text-verde-painel",
  laranja: "text-orange-600",
  escuro: "text-neutral-900",
};

const estilosTitulo: Record<EstiloTitulo, string> = {
  destaque: "text-xs text-verde-painel",
  discreto: "text-[11px] font-medium uppercase tracking-wide text-neutral-500",
};

interface CardResumoProps {
  titulo: string;
  valor: string;
  corValor?: CorValor;
  estiloTitulo?: EstiloTitulo;
  rodape?: ReactNode;
}

export function CardResumo({
  titulo,
  valor,
  corValor = "verde",
  estiloTitulo = "destaque",
  rodape,
}: CardResumoProps) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className={estilosTitulo[estiloTitulo]}>{titulo}</h2>
      <p className={`mt-2 text-2xl font-bold ${coresValor[corValor]}`}>{valor}</p>
      {rodape && <div className="mt-1">{rodape}</div>}
    </article>
  );
}