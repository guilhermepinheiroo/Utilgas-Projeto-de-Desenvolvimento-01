import { useState } from "react";
import { AbasDashboard, type AbaDashboard } from "../components/dashboard/AbasDashboard";
import { DashboardVendas } from "../components/dashboard/vendas/DashboardVendas";

export function Dashboard() {
  const [aba, setAba] = useState<AbaDashboard>("vendas");

  return (
    <div className="flex flex-col gap-8 p-8">
      <AbasDashboard abaAtiva={aba} aoMudar={setAba} />

      {aba === "vendas" ? (
        <DashboardVendas />
      ) : (
        <p className="text-neutral-500">Estoque em construção.</p>
      )}
    </div>
  );
}