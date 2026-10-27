interface CardIndicadorProps {
  titulo: string;
  valor: string;
  variacao?: string;
  descricao: string;
  tendencia: "positiva" | "negativa";
  iconeTendencia: string;
  iconeDestaque?: string;
}

export function CardIndicador({
  titulo,
  valor,
  variacao,
  descricao,
  tendencia,
  iconeTendencia,
  iconeDestaque,
}: CardIndicadorProps) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex min-h-6 items-start justify-between gap-2">
        <h2 className="text-xs text-neutral-500">{titulo}</h2>

        {iconeDestaque && (
          <span className="flex size-6 items-center justify-center rounded-md bg-red-100">
            <img src={iconeDestaque} alt="" className="size-3.5 object-contain" />
          </span>
        )}
      </div>

      <p className="mt-2 text-2xl font-bold text-neutral-900">{valor}</p>

      <p className="mt-1 flex items-center gap-1 text-[11px]">
        {variacao && (
          <>
            <img src={iconeTendencia} alt="" className="size-3 object-contain" />
            <span
              className={`font-semibold ${
                tendencia === "positiva" ? "text-green-600" : "text-red-600"
              }`}
            >
              {variacao}
            </span>
          </>
        )}
        <span className="text-neutral-500">{descricao}</span>
      </p>
    </article>
  );
}