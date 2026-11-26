import type { ClienteDetalhado } from "../../types/clientes";

interface EtapaEnderecoProps {
  cliente: ClienteDetalhado;
  selecionado: string | null;
  aoSelecionar: (enderecoId: string) => void;
}

export function EtapaEndereco({ cliente, selecionado, aoSelecionar }: EtapaEnderecoProps) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-medium text-neutral-800">Endereços de entrega</h3>

      {cliente.enderecos.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {cliente.enderecos.map((endereco) => (
            <li key={endereco.id}>
              <label
                className={`flex min-h-[50px] cursor-pointer items-center gap-3 border px-2.5 py-2 text-xs ${
                  selecionado === endereco.id
                    ? "border-[#9eac9f] bg-[#b1c3b4]"
                    : "border-neutral-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="endereco-entrega"
                  checked={selecionado === endereco.id}
                  onChange={() => aoSelecionar(endereco.id)}
                  className="size-4 shrink-0 accent-[#548260]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12px]">{endereco.endereco}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-neutral-500">
                    {[endereco.bairro, endereco.regiaoNome, endereco.principal ? "principal" : null]
                      .filter(Boolean)
                      .join(" · ") || "Endereço cadastrado"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert" className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Este cliente não possui endereço cadastrado. Cadastre um endereço antes de continuar a venda.
        </p>
      )}
    </section>
  );
}
