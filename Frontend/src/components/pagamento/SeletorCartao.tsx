import { useState } from "react";
import { nomesOpcaoCartao } from "../../constants/Cartao";
import { useConsulta } from "../../hooks/UseConsulta";
import { listarOpcoesCartao } from "../../services/OpcoesCartao";
import type { CartaoSelecionado, OpcaoCartao, TipoOpcaoCartao } from "../../types/Cartao";
import { ModalOpcoesCartao } from "./ModalOpcoesCartao";

const campoDoTipo: Record<TipoOpcaoCartao, keyof CartaoSelecionado> = {
  maquininhas: "maquininhaId",
  bandeiras: "bandeiraId",
};

const tipos: TipoOpcaoCartao[] = ["maquininhas", "bandeiras"];

interface CampoOpcaoProps {
  tipo: TipoOpcaoCartao;
  opcoes: OpcaoCartao[];
  carregando: boolean;
  valor: string;
  aoAlterar: (id: string) => void;
}

function CampoOpcao({ tipo, opcoes, carregando, valor, aoAlterar }: CampoOpcaoProps) {
  const nomes = nomesOpcaoCartao[tipo];
  const valorDisponivel = opcoes.some((opcao) => opcao.id === valor) ? valor : "";

  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {nomes.titulo}
      <select
        value={valorDisponivel}
        onChange={(e) => aoAlterar(e.target.value)}
        disabled={carregando}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-normal disabled:opacity-60"
      >
        <option value="">
          {carregando
            ? "Carregando..."
            : opcoes.length > 0
              ? "Escolha"
              : `Nenhuma ${nomes.singular} ativa`}
        </option>
        {opcoes.map((opcao) => (
          <option key={opcao.id} value={opcao.id}>
            {opcao.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SeletorCartaoProps {
  valor: CartaoSelecionado;
  aoAlterar: (cartao: CartaoSelecionado) => void;
}

export function SeletorCartao({ valor, aoAlterar }: SeletorCartaoProps) {
  const consultas = {
    maquininhas: useConsulta(() => listarOpcoesCartao("maquininhas"), "maquininhas"),
    bandeiras: useConsulta(() => listarOpcoesCartao("bandeiras"), "bandeiras"),
  };
  const [gerenciando, setGerenciando] = useState(false);

  const erro = consultas.maquininhas.erro ?? consultas.bandeiras.erro;
  const incompleto = !valor.maquininhaId || !valor.bandeiraId;

  function escolher(tipo: TipoOpcaoCartao, id: string) {
    aoAlterar({ ...valor, [campoDoTipo[tipo]]: id });
  }

  function aoAlterarOpcao(tipo: TipoOpcaoCartao, opcao: OpcaoCartao) {
    consultas[tipo].recarregar();
    if (!opcao.ativo && valor[campoDoTipo[tipo]] === opcao.id) escolher(tipo, "");
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">Dados do cartão</span>
        <button
          type="button"
          onClick={() => setGerenciando(true)}
          className="text-xs font-medium text-sidebar underline hover:no-underline"
        >
          Gerenciar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tipos.map((tipo) => (
          <CampoOpcao
            key={tipo}
            tipo={tipo}
            opcoes={consultas[tipo].dados ?? []}
            carregando={consultas[tipo].carregando}
            valor={valor[campoDoTipo[tipo]]}
            aoAlterar={(id) => escolher(tipo, id)}
          />
        ))}
      </div>

      {erro ? (
        <p role="alert" className="text-xs text-red-700">
          {erro}
        </p>
      ) : (
        incompleto && (
          <p className="text-xs text-neutral-500">
            Escolha a maquininha e a bandeira para registrar a venda.
          </p>
        )
      )}

      <ModalOpcoesCartao
        aberto={gerenciando}
        aoFechar={() => setGerenciando(false)}
        aoAlterar={aoAlterarOpcao}
      />
    </div>
  );
}
