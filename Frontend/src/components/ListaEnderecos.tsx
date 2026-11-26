import type { Dispatch, SetStateAction } from "react";
import { CartaoEndereco } from "./CartaoEndereco";
import {
  criarEnderecoVazio,
  type DadosFormularioCliente,
  type EnderecoFormulario,
  type OpcaoRegiao,
} from "../types/FormularioCliente";

interface ListaEnderecosProps {
  enderecos: EnderecoFormulario[];
  regioes: OpcaoRegiao[];
  aoAlterarDados: Dispatch<SetStateAction<DadosFormularioCliente>>;
}

export function ListaEnderecos({ enderecos, regioes, aoAlterarDados }: ListaEnderecosProps) {
  function adicionar() {
    aoAlterarDados((atual) => ({
      ...atual,
      enderecos: [...atual.enderecos, criarEnderecoVazio(atual.enderecos.length === 0)],
    }));
  }

  function alterar(chave: string, parcial: Partial<EnderecoFormulario>) {
    aoAlterarDados((atual) => ({
      ...atual,
      enderecos: atual.enderecos.map((e) => (e.chave === chave ? { ...e, ...parcial } : e)),
    }));
  }

  function marcarPrincipal(chave: string) {
    aoAlterarDados((atual) => ({
      ...atual,
      enderecos: atual.enderecos.map((e) => ({ ...e, principal: e.chave === chave })),
    }));
  }

  function remover(chave: string) {
    aoAlterarDados((atual) => {
      const restantes = atual.enderecos.filter((e) => e.chave !== chave);

      // Se removeu o principal, o primeiro que sobrar assume
      if (restantes.length > 0 && !restantes.some((e) => e.principal)) {
        restantes[0] = { ...restantes[0], principal: true };
      }

      return { ...atual, enderecos: restantes };
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-verde-painel">Endereços</span>{" "}
          <span className="text-xs text-neutral-500">
            {enderecos.length} {enderecos.length === 1 ? "endereço" : "endereços"} · o endereço de
            entrega é escolhido na etapa seguinte
          </span>
        </p>

        <button
          type="button"
          onClick={adicionar}
          className="rounded-sm border border-neutral-300 bg-neutral-200 px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-neutral-300"
        >
          + Endereço
        </button>
      </div>

      {enderecos.map((endereco, indice) => (
        <CartaoEndereco
          key={endereco.chave}
          numero={indice + 1}
          endereco={endereco}
          regioes={regioes}
          podeRemover={enderecos.length > 1}
          aoAlterar={(parcial) => alterar(endereco.chave, parcial)}
          aoMarcarPrincipal={() => marcarPrincipal(endereco.chave)}
          aoRemover={() => remover(endereco.chave)}
        />
      ))}
    </section>
  );
}