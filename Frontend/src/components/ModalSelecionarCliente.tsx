import { useState } from "react";
import { useConsulta } from "../hooks/UseConsulta";
import { useDebounce } from "../hooks/UseDebounce";
import { buscarClientes } from "../services/Clientes";
import type { Cliente } from "../types/clientes";
import { formatarTelefone } from "../utils/FormatacaoTelefone";
import { Dialogo } from "./Dialogo";

interface ModalSelecionarClienteProps {
  aberto: boolean;
  titulo: string;
  busca?: string;
  aoSelecionar: (cliente: Cliente) => void;
  aoFechar: () => void;
}

function ListaClientes({
  buscaInicial,
  aoSelecionar,
}: {
  buscaInicial: string;
  aoSelecionar: (cliente: Cliente) => void;
}) {
  const [busca, setBusca] = useState(buscaInicial);
  const termo = useDebounce(busca, 300);
  const consulta = useConsulta(
    () => buscarClientes({ pagina: 1, tamanhoPagina: 20, busca: termo, status: "todos" }),
    termo
  );
  const clientes = consulta.dados?.itens ?? [];

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        autoFocus
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nome, telefone ou CPF..."
        aria-label="Buscar cliente"
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-verde-painel"
      />

      {consulta.erro && (
        <p role="alert" className="text-sm text-red-600">
          {consulta.erro}
        </p>
      )}

      <ul
        className={`flex max-h-80 flex-col gap-1 overflow-y-auto transition-opacity ${
          consulta.carregando ? "opacity-50" : ""
        }`}
      >
        {clientes.map((cliente) => (
          <li key={cliente.id}>
            <button
              type="button"
              onClick={() => aoSelecionar(cliente)}
              className="w-full rounded-md px-3 py-2 text-left hover:bg-neutral-100"
            >
              <span className="block text-sm font-medium">{cliente.nome}</span>
              <span className="text-[11px] text-neutral-500">
                {formatarTelefone(cliente.whatsapp)}
                {cliente.endereco && ` · ${cliente.endereco}`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!consulta.carregando && !consulta.erro && clientes.length === 0 && (
        <p className="py-4 text-center text-sm text-neutral-500">Nenhum cliente encontrado.</p>
      )}
    </div>
  );
}

export function ModalSelecionarCliente({
  aberto,
  titulo,
  busca = "",
  aoSelecionar,
  aoFechar,
}: ModalSelecionarClienteProps) {
  return (
    <Dialogo aberto={aberto} titulo={titulo} aoFechar={aoFechar}>
      <ListaClientes buscaInicial={busca} aoSelecionar={aoSelecionar} />
    </Dialogo>
  );
}
