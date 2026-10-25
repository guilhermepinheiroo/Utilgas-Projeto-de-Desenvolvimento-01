import type { OpcaoSeletor } from "../../types/Dashboard";

export type { OpcaoSeletor };

interface SeletorSegmentadoProps<T extends string> {
  opcoes: OpcaoSeletor<T>[];
  valor: T;
  aoAlterar: (valor: T) => void;
  rotuloAcessivel: string;
  variante?: "escuro" | "verde";
}

const estilos = {
  escuro: {
    container: "bg-azul-escuro",
    ativo: "bg-white text-azul-escuro",
    inativo: "text-white hover:bg-white/10",
  },
  verde: {
    container: "bg-verde-painel",
    ativo: "bg-menta text-verde-painel",
    inativo: "text-white hover:bg-white/10",
  },
};

export function SeletorSegmentado<T extends string>({
  opcoes,
  valor,
  aoAlterar,
  rotuloAcessivel,
  variante = "escuro",
}: SeletorSegmentadoProps<T>) {
  const estilo = estilos[variante];

  return (
    <div
      role="radiogroup"
      aria-label={rotuloAcessivel}
      className={`inline-flex gap-1 rounded-full p-1 ${estilo.container}`}
    >
      {opcoes.map((opcao) => {
        const selecionado = opcao.valor === valor;

        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={selecionado}
            onClick={() => aoAlterar(opcao.valor)}
            className={`cursor-pointer rounded-full px-4 py-1 text-xs font-medium transition-colors ${
              selecionado ? estilo.ativo : estilo.inativo
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}