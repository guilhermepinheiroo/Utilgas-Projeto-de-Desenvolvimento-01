import type { MetricaCliente } from "../../types/FormularioCliente";

export function MetricasCliente({ metricas }: { metricas: MetricaCliente[] }) {
  return (
    <dl className="grid grid-cols-2 divide-neutral-200 border border-neutral-200 md:grid-cols-4 md:divide-x">
      {metricas.map((metrica) => (
        <div key={metrica.rotulo} className="px-3 py-2">
          <dt className="titulo-indicador uppercase tracking-wide text-verde-painel">
            {metrica.rotulo}
          </dt>
          <dd className="indicador-valor mt-1 text-neutral-800">{metrica.valor}</dd>
        </div>
      ))}
    </dl>
  );
}