import type { ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SerieGrafico {
  chave: string;
  nome: string;
  cor: string;
}

interface GraficoLinhasProps<T extends object> {
  titulo: string;
  dados: T[];
  chaveEixoX: keyof T & string;
  series: SerieGrafico[];
  controle?: ReactNode;
  carregando?: boolean;
}

export function GraficoLinhas<T extends object>({
  titulo,
  dados,
  chaveEixoX,
  series,
  controle,
  carregando = false,
}: GraficoLinhasProps<T>) {
  return (
    <section className="rounded-md bg-neutral-100 p-6">
      <header className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
        <h2 className="text-base text-neutral-900">{titulo}</h2>

        <div className="md:justify-self-center">{controle}</div>

        <ul className="flex flex-col gap-1 text-xs text-neutral-800 md:items-end">
          {series.map((serie) => (
            <li key={serie.chave} className="flex items-center gap-2">
              <span
                className="size-3"
                style={{ backgroundColor: serie.cor }}
                aria-hidden
              />
              {serie.nome}
            </li>
          ))}
        </ul>
      </header>

      <div className={`mt-4 h-80 transition-opacity ${carregando ? "opacity-50" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e5e5e5" />
            <XAxis dataKey={String(chaveEixoX)} tick={{ fontSize: 11 }} tickLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip />
            {series.map((serie) => (
              <Line
                key={serie.chave}
                type="linear"
                dataKey={serie.chave}
                name={serie.nome}
                stroke={serie.cor}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}