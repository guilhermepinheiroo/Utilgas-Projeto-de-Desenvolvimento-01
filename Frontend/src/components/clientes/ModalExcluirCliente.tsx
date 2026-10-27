
import type { Cliente } from "../../types/clientes";

interface ModalExcluirClienteProps {
  cliente: Cliente | null;
  aoFechar: () => void;
  aoConfirmar: (cliente: Cliente) => void;
  executando?: boolean;
  erro?: string | null;
}

export function ModalExcluirCliente({
  cliente,
  aoFechar,
  aoConfirmar,
  executando = false,
  erro = null,
}: ModalExcluirClienteProps) {
  if (!cliente) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-excluir-cliente"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">
          !
        </div>

        <h2 id="titulo-excluir-cliente" className="text-xl font-bold">
          Excluir cliente?
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Tem certeza de que deseja excluir{" "}
          <strong>{cliente.nome}</strong>?
        </p>

        {erro && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg border px-4 py-2"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => aoConfirmar(cliente)}
            disabled={executando}
            className="rounded-lg bg-red-600 disabled:opacity-60 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            {executando ? "Excluindo..." : "Excluir cliente"}
          </button>
        </div>
      </section>
    </div>
  );
}
