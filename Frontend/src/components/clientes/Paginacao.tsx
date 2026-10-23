import iconePaginaAnterior from "../../assets/telaclientes/icon-pag-dir.png";
import iconeProximaPagina from "../../assets/telaclientes/icon-pag-esq.png";

interface PaginacaoProps {
  paginaAtual: number;
  totalPaginas: number;
  aoMudar: (pagina: number) => void;
}

// Ex.: 178 páginas, na 1 -> [1, 2, 3, "...", 178]
function gerarPaginas(atual: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const paginas = new Set<number>([1, total, atual - 1, atual, atual + 1]);

  if (atual <= 3) {
    paginas.add(2);
    paginas.add(3);
  }

  if (atual >= total - 2) {
    paginas.add(total - 1);
    paginas.add(total - 2);
  }

  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const resultado: (number | "...")[] = [];

  ordenadas.forEach((pagina, indice) => {
    if (indice > 0 && pagina - ordenadas[indice - 1] > 1) resultado.push("...");
    resultado.push(pagina);
  });

  return resultado;
}

const botaoBase =
  "flex size-7 cursor-pointer items-center justify-center rounded-md border text-xs transition-colors";
const botaoNormal = "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100";
const botaoDesabilitado = "disabled:cursor-not-allowed disabled:opacity-40";

export function Paginacao({ paginaAtual, totalPaginas, aoMudar }: PaginacaoProps) {
  return (
    <nav aria-label="Paginação" className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={paginaAtual === 1}
        onClick={() => aoMudar(paginaAtual - 1)}
        className={`${botaoBase} ${botaoNormal} ${botaoDesabilitado}`}
      >
        <img src={iconeProximaPagina} alt="" className="size-3 object-contain" />
      </button>

      {gerarPaginas(paginaAtual, totalPaginas).map((item, indice) =>
        item === "..." ? (
          <span key={`reticencias-${indice}`} className="px-1 text-xs text-neutral-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === paginaAtual ? "page" : undefined}
            onClick={() => aoMudar(item)}
            className={`${botaoBase} ${
              item === paginaAtual ? "border-sidebar bg-sidebar text-white" : botaoNormal
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        aria-label="Próxima página"
        disabled={paginaAtual === totalPaginas}
        onClick={() => aoMudar(paginaAtual + 1)}
        className={`${botaoBase} ${botaoNormal} ${botaoDesabilitado}`}
      >
        <img src={iconePaginaAnterior} alt="" className="size-3 object-contain" />
      </button>
    </nav>
  );
}