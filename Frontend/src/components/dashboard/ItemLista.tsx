import type { ReactNode } from "react";

interface ItemListaProps {
  icone: string;
  titulo: string;
  subtitulo: string;
  acao: ReactNode;
}

export function ItemLista({ icone, titulo, subtitulo, acao }: ItemListaProps) {
  return (
    <li className="flex items-center gap-3 px-3 py-1.5">
      <img src={icone} alt="" className="size-5 shrink-0 object-contain" />
      <div className="flex-1 leading-tight">
        <p className="text-[11px] text-neutral-900">{titulo}</p>
        <p className="text-[9px] text-neutral-500">{subtitulo}</p>
      </div>
      {acao}
    </li>
  );
}