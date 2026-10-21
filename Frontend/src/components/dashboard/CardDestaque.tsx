import type { ReactNode } from "react";

interface CardDestaqueProps {
  titulo: string;
  children: ReactNode;
}

export function CardDestaque({ titulo, children }: CardDestaqueProps) {
  return (
    <section className="flex flex-col items-center gap-5 rounded-md bg-azul-card p-6 text-white">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}