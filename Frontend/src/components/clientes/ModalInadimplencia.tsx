import { useState, type FormEvent } from "react";
import { valorDigitadoParaNumero } from "../../services/Clientes";
import type { Cliente, InadimplenciaInput } from "../../types/clientes";
import { Dialogo } from "../Dialogo";

export type AlvoInadimplencia = { cliente: Cliente; modo: "marcar" | "remover" } | null;

interface ModalInadimplenciaProps {
  alvo: AlvoInadimplencia;
  executando?: boolean;
  erro?: string | null;
  aoFechar: () => void;
  aoMarcar: (cliente: Cliente, dados: InadimplenciaInput) => void;
  aoRemover: (cliente: Cliente) => void;
}

const classeCampo =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-verde-painel";

function FormMarcar({
  cliente,
  executando,
  erro,
  aoFechar,
  aoMarcar,
}: {
  cliente: Cliente;
  executando: boolean;
  erro: string | null;
  aoFechar: () => void;
  aoMarcar: (cliente: Cliente, dados: InadimplenciaInput) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [valorDevido, setValorDevido] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valor = valorDigitadoParaNumero(valorDevido);
    if (valor !== null && (Number.isNaN(valor) || valor < 0)) {
      setAviso("Informe um valor válido, ex.: 230,50.");
      return;
    }
    setAviso(null);
    aoMarcar(cliente, { motivo, valorDevido });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Marcar <strong>{cliente.nome}</strong> como inadimplente? Motivo e valor são opcionais.
      </p>

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
        Motivo
        <input
          value={motivo}
          maxLength={500}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: 2 botijões fiado"
          className={classeCampo}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
        Valor devido (R$)
        <input
          inputMode="decimal"
          value={valorDevido}
          onChange={(e) => setValorDevido(e.target.value)}
          placeholder="230,50"
          className={classeCampo}
        />
      </label>

      {(aviso ?? erro) && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {aviso ?? erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={aoFechar} className="rounded-md border px-4 py-2 text-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={executando}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {executando ? "Salvando..." : "Marcar como inadimplente"}
        </button>
      </div>
    </form>
  );
}

export function ModalInadimplencia({
  alvo,
  executando = false,
  erro = null,
  aoFechar,
  aoMarcar,
  aoRemover,
}: ModalInadimplenciaProps) {
  const marcando = alvo?.modo === "marcar";

  return (
    <Dialogo
      aberto={alvo !== null}
      titulo={marcando ? "Marcar como inadimplente" : "Regularizar cliente"}
      aoFechar={aoFechar}
    >
      {alvo && marcando && (
        <FormMarcar
          key={alvo.cliente.id}
          cliente={alvo.cliente}
          executando={executando}
          erro={erro}
          aoFechar={aoFechar}
          aoMarcar={aoMarcar}
        />
      )}

      {alvo && !marcando && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Tirar <strong>{alvo.cliente.nome}</strong> da lista de inadimplentes? O cliente volta
            para o status Ativo e o motivo e o valor devido são apagados.
          </p>

          {erro && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={aoFechar} className="rounded-md border px-4 py-2 text-sm">
              Cancelar
            </button>
            <button
              type="button"
              disabled={executando}
              onClick={() => aoRemover(alvo.cliente)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {executando ? "Salvando..." : "Regularizar cliente"}
            </button>
          </div>
        </div>
      )}
    </Dialogo>
  );
}
