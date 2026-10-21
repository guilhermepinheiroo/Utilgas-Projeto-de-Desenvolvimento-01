import type { ReactNode } from "react";

interface GradeDashboardProps {
  cartao: ReactNode;
  lista: ReactNode;
  grafico: ReactNode;
}

export function GradeDashboard({ cartao, lista, grafico }: GradeDashboardProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>{cartao}</div>
      <div>{lista}</div>
      <div className="lg:col-span-2">{grafico}</div>
    </div>
  );
}