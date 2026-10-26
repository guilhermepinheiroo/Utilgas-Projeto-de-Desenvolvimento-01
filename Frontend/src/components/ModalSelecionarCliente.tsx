import { useEffect, useState } from "react";
import { buscarClientes } from "../services/Clientes";
import type { Cliente } from "../types/clientes";
import { Dialogo } from "./Dialogo";

interface ModalSelecionarClienteProps {
  aberto: boolean;
  titulo: string;
  busca?: string;
  aoSelecionar: (cliente: Cliente) => void;
  aoFechar: () => void;
}

export function ModalSelecionarCliente({
  aberto,
  titulo,
  busca = "",
  aoSelecionar,
  aoFechar,
}: ModalSelecionarClienteProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    if (!aberto) return;
    buscarClientes({ pagina: 1, tamanhoPagina: 20, busca, status: "todos" }).then((resposta) =>
      setClientes(resposta.itens)
    );
  }, [aberto, busca]);

  return (
    <Dialogo aberto={aberto} titulo={titulo} aoFechar={aoFechar}>
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {clientes.map((cliente) => (
          <li key={cliente.id}>
            <button
              type="button"
              onClick={() => aoSelecionar(cliente)}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100"
            >
              {cliente.nome}
            </button>
          </li>
        ))}
      </ul>
    </Dialogo>
  );
}
