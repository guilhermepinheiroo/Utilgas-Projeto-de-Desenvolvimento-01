interface CampoDataProps {
  valor: string; // "2026-10-26"
  aoAlterar: (valor: string) => void;
  rotuloAcessivel: string;
}

export function CampoData({ valor, aoAlterar, rotuloAcessivel }: CampoDataProps) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{rotuloAcessivel}</span>
      <input
        type="date"
        value={valor}
        // Se o usuário apagar a data no seletor, mantém a anterior
        onChange={(e) => e.target.value && aoAlterar(e.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-verde-painel"
      />
    </label>
  );
}