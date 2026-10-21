import iconeBusca from "../assents/busca.png";
import { formatarTelefone } from "../utils/FormatacaoTelefone";

interface CampoTelefoneProps {
  valor: string;
  aoAlterar: (valor: string) => void;
}

export function CampoTelefone({ valor, aoAlterar }: CampoTelefoneProps) {
  return (
    <label className="flex w-full max-w-md items-center gap-3 rounded-xl border px-4 py-3 focus-within:ring-2 cursor-pointer">
      <img src={iconeBusca} alt="" className="size-5 object-contain" />
      <input
        type="tel"
        inputMode="numeric"
        value={valor}
        onChange={(e) => aoAlterar(formatarTelefone(e.target.value))}
        placeholder="(53) 98812-4477"
        aria-label="Telefone do cliente"
        className="w-full bg-transparent text-center text-lg outline-none placeholder:text-neutral-400"
      />
    </label>
  );
}