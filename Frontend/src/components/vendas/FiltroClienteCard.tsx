import iconeSetaBaixo from "../../assets/telaclientes/icon-filtro-seta-baixo.png";

interface FiltroClienteCardProps {
  icone?: string;
  nomeSelecionado: string | null;
  aoAbrir: () => void;
  aoLimpar: () => void;
}

export function FiltroClienteCard({
  icone,
  nomeSelecionado,
  aoAbrir,
  aoLimpar,
}: FiltroClienteCardProps) {
  return (
    <div className="relative rounded-lg border border-neutral-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-verde-painel">
      <button
        type="button"
        onClick={aoAbrir}
        className="flex w-full flex-col gap-2 p-4 text-left outline-none"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          {icone && <img src={icone} alt="" className="size-5 object-contain" />}
          Cliente
        </span>
        <span className="truncate pr-8 text-xl font-bold uppercase text-neutral-900">
          {nomeSelecionado ?? "Todos"}
        </span>
      </button>

      <img
        src={iconeSetaBaixo}
        alt=""
        className="pointer-events-none absolute bottom-5 right-4 size-4 object-contain"
      />

      {nomeSelecionado && (
        <button
          type="button"
          onClick={aoLimpar}
          aria-label="Limpar filtro de cliente"
          className="absolute right-2 top-2 rounded-md px-2 py-0.5 text-lg leading-none text-neutral-500 hover:bg-neutral-100"
        >
          ×
        </button>
      )}
    </div>
  );
}