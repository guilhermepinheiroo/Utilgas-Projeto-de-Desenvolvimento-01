import iconeBusca from "../assets/telaclientes/icon-busca.png";

interface CampoBuscaProps {
  valor: string;
  aoAlterar: (valor: string) => void;
  placeholder: string;
  rotuloAcessivel: string;
  larguraTotal?: boolean;
}

export function CampoBusca({
  valor,
  aoAlterar,
  placeholder,
  rotuloAcessivel,
  larguraTotal = false,
}: CampoBuscaProps) {
  return (
    <label
      className={`flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-verde-painel ${
        larguraTotal ? "w-full" : "w-80 max-w-full"
      }`}
    >
      <span className="sr-only">{rotuloAcessivel}</span>
      <img src={iconeBusca} alt="" className="size-4 object-contain opacity-60" />
      <input
        type="search"
        value={valor}
        onChange={(e) => aoAlterar(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
      />
    </label>
  );
}