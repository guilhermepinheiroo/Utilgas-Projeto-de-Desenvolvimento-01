import iconeSetaBaixo from "../assets/telaclientes/icon-filtro-seta-baixo.png";
import type { OpcaoSeletor } from "./dashboard/SeletorSegmentado";

interface FiltroCardProps<T extends string> {
  rotulo: string;
  opcoes: OpcaoSeletor<T>[];
  valor: T;
  aoAlterar: (valor: T) => void;
  icone?: string;
}

export function FiltroCard<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoAlterar,
  icone,
}: FiltroCardProps<T>) {
  return (
    <label className="relative flex cursor-pointer flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm focus-within:ring-2 focus-within:ring-verde-painel">
      <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
        {icone && <img src={icone} alt="" className="size-5 object-contain" />}
        {rotulo}
      </span>

      <select
        value={valor}
        onChange={(e) => aoAlterar(e.target.value as T)}
        className="w-full cursor-pointer appearance-none truncate bg-transparent pr-8 text-xl font-bold uppercase text-neutral-900 outline-none"
      >
        {opcoes.map((opcao) => (
          <option
            key={opcao.valor}
            value={opcao.valor}
            className="text-base font-normal normal-case text-neutral-900"
          >
            {opcao.rotulo}
          </option>
        ))}
      </select>

      <img
        src={iconeSetaBaixo}
        alt=""
        className="pointer-events-none absolute bottom-5 right-4 size-4 object-contain"
      />
    </label>
  );
}
