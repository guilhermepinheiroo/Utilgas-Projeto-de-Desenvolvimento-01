
import { CheckCircle2, X } from "lucide-react";

interface AlertaSucessoProps {
  mensagem: string;
  onFechar: () => void;
}

export function AlertaSucesso({
  mensagem,
  onFechar,
}: AlertaSucessoProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm"
    >
      <CheckCircle2 size={22} className="shrink-0" />

      <p className="flex-1 text-sm font-medium">
        {mensagem}
      </p>

      <button
        type="button"
        onClick={onFechar}
        aria-label="Fechar alerta"
        className="rounded p-1 transition hover:bg-green-100"
      >
        <X size={18} />
      </button>
    </div>
  );
}
