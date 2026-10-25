
import { useState } from "react";
import type { Cliente, StatusCliente } from "../../types/clientes";

interface ModalEditarClienteProps {
  aberto: boolean;
  clientes: Cliente[];
  clienteInicial: Cliente | null;
  aoFechar: () => void;
  aoSalvar: (cliente: Cliente) => void;
}

export function ModalEditarCliente({
  aberto,
  clientes,
  clienteInicial,
  aoFechar,
  aoSalvar,
}: ModalEditarClienteProps) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<Cliente | null>(clienteInicial);
  const [nome, setNome] = useState(clienteInicial?.nome ?? "");
  const [whatsapp, setWhatsapp] = useState(clienteInicial?.whatsapp ?? "");
  const [endereco, setEndereco] = useState(clienteInicial?.endereco ?? "");
  const [status, setStatus] = useState<StatusCliente>(
    clienteInicial?.status ?? "ativo",
  );

  if (!aberto) return null;

  const termo = busca.trim().toLocaleLowerCase();

  const resultados = clientes.filter((cliente) =>
    [
      cliente.nome,
      cliente.whatsapp,
      cliente.endereco,
    ].some((campo) => campo.toLocaleLowerCase().includes(termo)),
  );

  function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!selecionado || !nome.trim() || !whatsapp.trim() || !endereco.trim()) {
      return;
    }

    aoSalvar({
      ...selecionado,
      nome: nome.trim(),
      whatsapp: whatsapp.replace(/\D/g, ""),
      endereco: endereco.trim(),
      status,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-editar-cliente"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="titulo-editar-cliente" className="text-xl font-bold">
            Editar cliente
          </h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar modal">
            ✕
          </button>
        </div>

        <label htmlFor="buscar-cliente" className="mb-2 block text-sm font-medium">
          Pesquisar cliente
        </label>
        <input
          id="buscar-cliente"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Nome, WhatsApp ou endereço..."
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-700"
        />

        <div className="mb-5 max-h-40 space-y-2 overflow-y-auto">
          {resultados.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => {
                setSelecionado(cliente);
                setNome(cliente.nome);
                setWhatsapp(cliente.whatsapp);
                setEndereco(cliente.endereco);
                setStatus(cliente.status);
              }}
              className={`w-full rounded-lg border p-3 text-left ${
                selecionado?.id === cliente.id
                  ? "border-green-700 bg-green-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="block font-medium">{cliente.nome}</span>
              <span className="text-sm text-gray-500">
                {cliente.whatsapp} · {cliente.endereco}
              </span>
            </button>
          ))}

          {resultados.length === 0 && (
            <p className="py-3 text-sm text-gray-500">
              Nenhum cliente encontrado.
            </p>
          )}
        </div>

        {selecionado && (
          <form onSubmit={salvar} className="space-y-4">
            <h3 className="font-semibold">Dados do cliente</h3>

            <div>
              <label htmlFor="cliente-nome" className="mb-1 block text-sm">
                Nome completo
              </label>
              <input
                id="cliente-nome"
                required
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="cliente-whatsapp" className="mb-1 block text-sm">
                WhatsApp
              </label>
              <input
                id="cliente-whatsapp"
                required
                value={whatsapp}
                onChange={(evento) => setWhatsapp(evento.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="cliente-endereco" className="mb-1 block text-sm">
                Endereço
              </label>
              <input
                id="cliente-endereco"
                required
                value={endereco}
                onChange={(evento) => setEndereco(evento.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="cliente-status" className="mb-1 block text-sm">
                Status
              </label>
              <select
                id="cliente-status"
                value={status}
                onChange={(evento) =>
                  setStatus(evento.target.value as StatusCliente)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={aoFechar}
                className="rounded-lg border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-sidebar px-4 py-2 font-medium text-white"
              >
                Salvar alterações
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
