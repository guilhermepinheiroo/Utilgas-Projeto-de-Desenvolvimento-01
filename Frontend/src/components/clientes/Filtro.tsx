import type { OpcaoSeletor } from "../dashboard/SeletorSegmentado";

interface FiltroProps<T extends string> {
  opcoes: OpcaoSeletor<T>[];
  valor: T;
  aoAlterar: (valor: T) => void;
  rotuloAcessivel: string;
  icone?: string;
  iconeSeta?: string;
  variante?: "claro" | "verde";
}

const estilos = {
  claro: "border border-neutral-300 bg-white text-neutral-800 focus-visible:ring-verde-painel",
  verde: "bg-verde-painel text-white focus-visible:ring-white",
};

export function Filtro<T extends string>({
  opcoes,
  valor,
  aoAlterar,
  rotuloAcessivel,
  icone,
  iconeSeta,
  variante = "claro",
}: FiltroProps<T>) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{rotuloAcessivel}</span>

      {icone && (
        <img
          src={icone}
          alt=""
          className="pointer-events-none absolute left-3 size-4 object-contain"
        />
      )}

      <select
        value={valor}
        onChange={(e) => aoAlterar(e.target.value as T)}
        className={`max-w-48 cursor-pointer truncate rounded-md py-2 text-sm font-medium outline-none focus-visible:ring-2 ${
          icone ? "pl-9" : "pl-3"
        } ${iconeSeta ? "appearance-none pr-9" : "pr-3"} ${estilos[variante]}`}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor} className="text-neutral-900">
            {opcao.rotulo}
          </option>
        ))}
      </select>

      {iconeSeta && (
        <img
          src={iconeSeta}
          alt=""
          className="pointer-events-none absolute right-3 size-3 object-contain"
        />
      )}
    </label>
  );
}