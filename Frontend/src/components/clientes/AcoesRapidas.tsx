export interface AcaoRapida {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  corFundoIcone: string;
  aoClicar: () => void;
}

export function AcoesRapidas({ acoes }: { acoes: AcaoRapida[] }) {
  return (
    <section
      aria-labelledby="titulo-acoes-rapidas"
      className="rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 id="titulo-acoes-rapidas" className="mb-3 text-sm font-semibold text-neutral-900">
        Ações Rápidas
      </h2>

      <ul className="flex flex-col gap-2">
        {acoes.map((acao) => (
          <li key={acao.id}>
            <button
              type="button"
              onClick={acao.aoClicar}
              className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-neutral-200 bg-white p-2.5 text-left transition-colors hover:bg-neutral-50"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-md ${acao.corFundoIcone}`}
              >
                <img src={acao.icone} alt="" className="size-4 object-contain" />
              </span>

              <span className="leading-tight">
                <span className="block text-xs font-semibold text-neutral-900">{acao.titulo}</span>
                <span className="block text-[10px] text-neutral-500">{acao.descricao}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}