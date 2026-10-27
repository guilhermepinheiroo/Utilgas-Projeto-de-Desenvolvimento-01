import { nomesEtapas } from "./tipos";

interface EtapasProps {
  atual: number; // 0 a 3
  aoIrPara: (etapa: number) => void;
  liberadas: boolean[]; // quais etapas já podem ser abertas
}

export function Etapas({ atual, aoIrPara, liberadas }: EtapasProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Etapas do atendimento">
      {nomesEtapas.map((nome, indice) => {
        const ativa = indice === atual;
        const feita = indice < atual;
        return (
          <li key={nome} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!liberadas[indice]}
              onClick={() => aoIrPara(indice)}
              aria-current={ativa ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                ativa
                  ? "bg-sidebar text-white"
                  : feita
                    ? "bg-menta text-sidebar"
                    : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                {feita ? "✓" : indice + 1}
              </span>
              {nome}
            </button>
            {indice < nomesEtapas.length - 1 && <span className="h-px w-6 bg-neutral-300" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
