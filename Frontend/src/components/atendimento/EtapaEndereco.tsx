import { useState } from "react";
import { useAcao } from "../../hooks/UsenAcao";
import { adicionarEndereco } from "../../services/Clientes";
import type { ClienteDetalhado, Endereco, EnderecoInput } from "../../types/clientes";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { enderecoValido, enderecoVazio } from "../../utils/ValidaCliente";
import { CamposEndereco } from "../clientes/FormCliente";

interface EtapaEnderecoProps {
  cliente: ClienteDetalhado;
  selecionado: string | null;
  aoSelecionar: (enderecoId: string) => void;
  aoAdicionado: (endereco: Endereco) => void;
}

export function EtapaEndereco({ cliente, selecionado, aoSelecionar, aoAdicionado }: EtapaEnderecoProps) {
  const [novo, setNovo] = useState<EnderecoInput | null>(cliente.enderecos.length ? null : enderecoVazio);
  const [aviso, setAviso] = useState<string | null>(null);
  const { executando, erro, executar } = useAcao();

  async function salvarNovo() {
    if (!novo) return;
    const problema = enderecoValido(novo);
    if (problema) {
      setAviso(problema);
      return;
    }
    setAviso(null);
    let criado: Endereco | null = null;
    const ok = await executar(async () => {
      criado = await adicionarEndereco(cliente.id, { ...novo, principal: cliente.enderecos.length === 0 });
    });
    if (ok && criado) {
      aoAdicionado(criado);
      setNovo(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Onde entregar?</h2>

      {cliente.enderecos.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {cliente.enderecos.map((endereco) => (
            <li key={endereco.id}>
              <label
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                  selecionado === endereco.id ? "border-sidebar bg-[#f5faf7]" : "border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="endereco"
                  checked={selecionado === endereco.id}
                  onChange={() => aoSelecionar(endereco.id)}
                  className="mt-1 accent-sidebar"
                />
                <span>
                  <span className="block font-semibold">
                    {endereco.endereco}
                    {endereco.complemento && ` (${endereco.complemento})`}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {[endereco.bairro, endereco.regiaoNome].filter(Boolean).join(" · ") || "Sem região"}
                  </span>
                  <span className="block text-xs text-neutral-700">
                    Taxa de entrega: {formatarCentavos(endereco.taxaEntregaCentavos)}
                    {endereco.principal && " · principal"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {novo ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-neutral-300 p-4">
          <h3 className="text-sm font-semibold">Novo endereço</h3>
          <CamposEndereco valor={novo} aoAlterar={setNovo} />
          {(aviso || erro) && (
            <p role="alert" className="text-sm text-red-600">
              {aviso ?? erro}
            </p>
          )}
          <div className="flex justify-end gap-2">
            {cliente.enderecos.length > 0 && (
              <button type="button" onClick={() => setNovo(null)} className="rounded-md border px-3 py-1.5 text-sm">
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={() => void salvarNovo()}
              disabled={executando}
              className="rounded-md bg-sidebar px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {executando ? "Salvando..." : "Salvar endereço"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNovo(enderecoVazio)}
          className="self-start text-sm font-medium text-verde-painel underline"
        >
          + Cadastrar outro endereço
        </button>
      )}
    </div>
  );
}
