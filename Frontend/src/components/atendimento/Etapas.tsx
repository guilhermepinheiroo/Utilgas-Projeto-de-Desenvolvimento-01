import { nomesEtapas } from "./tipos";

interface EtapasProps {
  atual: number; // 0 a 3
  aoIrPara: (etapa: number) => void;
  liberadas: boolean[]; // quais etapas já podem ser abertas
}

export function Etapas({ atual, aoIrPara, liberadas }: EtapasProps) {
  return (
    <ol
      className="mx-auto grid w-[92%] grid-cols-2 gap-px overflow-hidden border border-neutral-300 bg-neutral-300 sm:grid-cols-4"
      aria-label="Etapas do atendimento"
    >
      {nomesEtapas.map((nome, indice) => {
        const ativa = indice === atual;
        const feita = indice < atual;

        return (
          <li
            key={nome}
            className={`h-24 min-w-0 ${
              ativa
                ? "bg-sidebar text-white"
                : feita
                  ? "bg-[#dce7df] text-sidebar"
                  : "bg-white text-neutral-700"
            }`}
          >
            <button
              type="button"
              disabled={!liberadas[indice]}
              onClick={() => aoIrPara(indice)}
              aria-current={ativa ? "step" : undefined}
              className="flex h-full w-full items-stretch text-left transition-colors enabled:hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                className={`flex w-12 shrink-0 items-center justify-center text-lg font-bold sm:w-14 ${
                  ativa ? "bg-white/10" : feita ? "bg-sidebar/10" : "bg-neutral-100"
                }`}
              >
                {indice + 1}
              </span>

              <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2 sm:px-4">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-current/60">
                  Etapa {indice + 1}
                </span>
                <span className="block truncate text-sm font-semibold">{nome}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}