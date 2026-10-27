import { useEffect, useId, useRef, type ReactNode } from "react";
import iconeFechar from "../assets/icon-fechar-popup.png";

interface DialogoProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  tituloVisivel?: boolean;
  largura?: "normal" | "larga";
}

export function Dialogo({
  aberto,
  titulo,
  aoFechar,
  children,
  tituloVisivel = true,
  largura = "normal",
}: DialogoProps) {
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

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
      onClick={(e) => {
        // Clique no fundo escuro (e não dentro da janela) fecha
        if (e.target === e.currentTarget) aoFechar();
      }}
      aria-labelledby={idTitulo}
      className={`m-auto max-h-[92vh] w-full overflow-y-auto rounded-lg ${
        largura === "larga" ? "max-w-2xl" : "max-w-lg"
      } bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/50`}
    >
      <div className="p-5">
        <header className="mb-4 flex items-center justify-between gap-4">
          <h2 id={idTitulo} className={tituloVisivel ? "text-base font-semibold" : "sr-only"}>
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="ml-auto rounded-md p-1.5 hover:bg-neutral-100"
          >
            <img src={iconeFechar} alt="" className="size-5 object-contain" />
          </button>
        </header>

        {aberto && children}
      </div>
    </dialog>
  );
}