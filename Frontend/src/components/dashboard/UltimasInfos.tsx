import type { ReactNode } from "react";

interface UltimasInfosProps {
  titulo: string;
  children: ReactNode;
}

export function UltimasInfos({ titulo, children }: UltimasInfosProps) {
  return (
    <section className="overflow-hidden border border-neutral-400 bg-white">
      <h2 className="bg-verde-painel px-3 py-2 text-base font-semibold text-white">{titulo}</h2>
      <ul className="max-h-72 divide-y divide-neutral-300 overflow-y-auto">{children}</ul>
    </section>
  );
}