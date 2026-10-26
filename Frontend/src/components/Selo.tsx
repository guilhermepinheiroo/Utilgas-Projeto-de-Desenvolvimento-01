import type { ReactNode } from "react";

export type CorSelo = "escuro" | "verde" | "vermelho" | "cinza";

const estilos: Record<CorSelo, string> = {
  escuro: "bg-sidebar text-white",
  verde: "bg-green-200 text-green-900",
  vermelho: "bg-red-600 text-white",
  cinza: "bg-neutral-200 text-neutral-600",
};

export function Selo({ cor, children }: { cor: CorSelo; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${estilos[cor]}`}
    >
      {children}
    </span>
  );
}