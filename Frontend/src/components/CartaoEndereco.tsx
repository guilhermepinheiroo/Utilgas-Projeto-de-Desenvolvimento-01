import { CampoRotulado, SelecaoRotulada } from "./CamposFormulario";
import { buscarCep } from "../services/Cep";
import type { EnderecoFormulario, OpcaoRegiao } from "../types/FormularioCliente";
import { formatarCep, soDigitos } from "../utils/Documentos";

interface CartaoEnderecoProps {
  numero: number;
  endereco: EnderecoFormulario;
  regioes: OpcaoRegiao[];
  podeRemover: boolean;
  aoAlterar: (parcial: Partial<EnderecoFormulario>) => void;
  aoMarcarPrincipal: () => void;
  aoRemover: () => void;
}

export function CartaoEndereco({
  numero,
  endereco,
  regioes,
  podeRemover,
  aoAlterar,
  aoMarcarPrincipal,
  aoRemover,
}: CartaoEnderecoProps) {
  async function alterarCep(valor: string) {
    const cep = soDigitos(valor).slice(0, 8);
    aoAlterar({ cep });

    if (cep.length !== 8) return;

    const encontrado = await buscarCep(cep);
    if (!encontrado) return;

    // Só preenche o que o operador ainda não digitou
    aoAlterar({
      logradouro: endereco.logradouro.trim() ? endereco.logradouro : encontrado.logradouro,
      bairro: endereco.bairro.trim() ? endereco.bairro : encontrado.bairro,
    });
  }

  return (
    <fieldset className="rounded-sm border border-neutral-300 bg-neutral-100 p-3">
      <legend className="sr-only">Endereço {numero}</legend>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-800">
            <input
              type="radio"
              name="endereco-principal"
              checked={endereco.principal}
              onChange={aoMarcarPrincipal}
              className="accent-sidebar"
            />
            Principal
          </label>
        </div>

        {podeRemover && (
          <button
            type="button"
            onClick={aoRemover}
            className="text-[11px] font-semibold text-verde-painel hover:underline"
          >
            Remover
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-6">
        <CampoRotulado
          pequeno
          classe="sm:col-span-4"
          rotulo="Endereço"
          valor={endereco.logradouro}
          aoAlterar={(logradouro) => aoAlterar({ logradouro })}
          autoComplete="off"
        />
        <CampoRotulado
          pequeno
          classe="sm:col-span-2"
          rotulo="Complemento"
          valor={endereco.complemento}
          aoAlterar={(complemento) => aoAlterar({ complemento })}
          autoComplete="off"
        />
        <CampoRotulado
          pequeno
          classe="sm:col-span-2"
          rotulo="Ponto de referência"
          valor={endereco.pontoReferencia}
          aoAlterar={(pontoReferencia) => aoAlterar({ pontoReferencia })}
          autoComplete="off"
        />
        <CampoRotulado
          pequeno
          classe="sm:col-span-2"
          rotulo="CEP"
          valor={formatarCep(endereco.cep)}
          aoAlterar={alterarCep}
          inputMode="numeric"
          autoComplete="off"
        />
        <CampoRotulado
          pequeno
          classe="sm:col-span-2"
          rotulo="Bairro"
          valor={endereco.bairro}
          aoAlterar={(bairro) => aoAlterar({ bairro })}
          autoComplete="off"
        />
        <SelecaoRotulada
          pequeno
          classe="sm:col-span-2"
          rotulo="Região"
          valor={endereco.regiao}
          aoAlterar={(regiao) => aoAlterar({ regiao })}
          opcoes={regioes}
        />
      </div>
    </fieldset>
  );
}