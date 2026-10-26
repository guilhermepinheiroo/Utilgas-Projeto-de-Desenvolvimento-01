import { rotulosStatusEntrega } from "../../constants/Entregas";
import type { StatusEntrega } from "../../types/Entregas";

const estilos: Record<StatusEntrega, string> = {
  pendente: "border-orange-500 text-orange-600",
  entregue: "border-green-600 text-green-700",
  cancelada: "border-red-600 text-red-600",
};

export function BadgeStatusEntrega({ status }: { status: StatusEntrega }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border bg-white px-3 py-1 text-xs font-semibold ${estilos[status]}`}
    >
      {rotulosStatusEntrega[status]}
    </span>
  );
}