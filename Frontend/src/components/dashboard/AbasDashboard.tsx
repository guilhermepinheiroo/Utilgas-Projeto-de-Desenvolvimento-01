export type AbaDashboard = "vendas" | "estoque";

interface AbasDashboardProps {
  abaAtiva: AbaDashboard;
  aoMudar: (aba: AbaDashboard) => void;
}

const abas: { valor: AbaDashboard; rotulo: string }[] = [
  { valor: "vendas", rotulo: "Vendas" },
  { valor: "estoque", rotulo: "Estoque" },
];

export function AbasDashboard({ abaAtiva, aoMudar }: AbasDashboardProps) {
  return (
    <div role="tablist" className="flex gap-6">
      {abas.map((aba) => {
        const ativa = aba.valor === abaAtiva;

        return (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(aba.valor)}
            className={`rounded-md px-10 py-3 text-lg font-medium transition-colors ${
              ativa
                ? "bg-verde-painel text-white"
                : "bg-menta text-verde-painel hover:bg-menta/70"
            }`}
          >
            {aba.rotulo}
          </button>
        );
      })}
    </div>
  );
}