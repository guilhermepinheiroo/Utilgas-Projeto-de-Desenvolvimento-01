import { rotulosStatus } from "../../constants/Clientes";
import type { StatusCliente } from "../../types/clientes";

const estilos: Record<StatusCliente, string> = {
  ativo: "bg-green-100 text-green-800",
  inadimplente: "bg-red-100 text-red-700",
  inativo: "bg-neutral-200 text-neutral-600",
};

export function BadgeStatusCliente({ status }: { status: StatusCliente }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${estilos[status]}`}>
      {rotulosStatus[status]}
    </span>
  );
}