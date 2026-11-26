import { useEffect, useId, useRef, type ReactNode } from "react";
import iconeFechar from "../assets/icon-fechar-popup.png";

interface DialogoProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  ocultarTitulo?: boolean;
  classeLargura?: string;
  classeBackdrop?: string;
  classePainel?: string;
  semCabecalho?: boolean;
  semArredondamento?: boolean;
  bloqueado?: boolean;
}

export function Dialogo({
  aberto,
  titulo,
  aoFechar,
  children,
  ocultarTitulo = false,
  classeLargura = "max-w-lg",
  classeBackdrop = "backdrop:bg-black/50",
  classePainel,
  semCabecalho = false,
  semArredondamento = false,
  bloqueado = false,
}: DialogoProps) {
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  // Visual da caixa (arredondamento, fundo e sombra).
  // Se passar classePainel, ela substitui o padrão por completo.
  const painel =
    classePainel ??
    `${semArredondamento ? "rounded-none" : "rounded-lg"} bg-white shadow-xl`;

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo) return;

    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={dialogoRef}
      onClose={aoFechar}
      onCancel={(e) => {
        if (bloqueado) e.preventDefault();
      }}
      onClick={(e) => {
        if (!bloqueado && e.target === e.currentTarget) aoFechar();
      }}
      aria-labelledby={semCabecalho ? undefined : idTitulo}
      aria-label={semCabecalho ? titulo : undefined}
      className={`m-auto w-full ${classeLargura} ${painel} p-0 text-neutral-900 ${classeBackdrop} ${
        semCabecalho ? "overflow-hidden" : ""
      }`}
    >
      {semCabecalho ? (
        aberto && children
      ) : (
        <div className="p-5">
          <header
            className={`mb-4 flex items-center gap-4 ${
              ocultarTitulo ? "justify-end" : "justify-between"
            }`}
          >
            <h2 id={idTitulo} className={ocultarTitulo ? "sr-only" : "text-base font-semibold"}>
              {titulo}
            </h2>
            <button
              type="button"
              onClick={aoFechar}
              disabled={bloqueado}
              aria-label="Fechar"
              className="rounded-md p-2 transition-colors hover:bg-neutral-100 disabled:opacity-50"
            >
              <img src={iconeFechar} alt="" className="size-4 object-contain" />
            </button>
          </header>

          {aberto && children}
        </div>
      )}
    </dialog>
  );
}