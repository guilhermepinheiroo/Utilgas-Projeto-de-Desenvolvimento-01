import { useState, type FormEvent } from "react";
import { nomesOpcaoCartao, opcoesTipoCartao } from "../../constants/Cartao";
import { useConsulta } from "../../hooks/UseConsulta";
import { mensagemDeErro } from "../../services/Api";
import {
  alterarSituacaoOpcaoCartao,
  cadastrarOpcaoCartao,
  listarOpcoesCartao,
  renomearOpcaoCartao,
} from "../../services/OpcoesCartao";
import type { OpcaoCartao, TipoOpcaoCartao } from "../../types/Cartao";
import { Dialogo } from "../Dialogo";
import { SeletorSegmentado, type OpcaoSeletor } from "../dashboard/SeletorSegmentado";

type Situacao = "ativas" | "inativas";

const opcoesSituacao: OpcaoSeletor<Situacao>[] = [
  { valor: "ativas", rotulo: "Ativas" },
  { valor: "inativas", rotulo: "Inativas" },
];

type AoAlterarOpcao = (tipo: TipoOpcaoCartao, opcao: OpcaoCartao) => void;

interface GerenciadorProps {
  tipo: TipoOpcaoCartao;
  aoAlterar: AoAlterarOpcao;
}

function Gerenciador({ tipo, aoAlterar }: GerenciadorProps) {
  const nomes = nomesOpcaoCartao[tipo];
  const [situacao, setSituacao] = useState<Situacao>("ativas");
  const lista = useConsulta(
    () => listarOpcoesCartao(tipo, situacao === "ativas"),
    `${tipo}-${situacao}`
  );
  const [nome, setNome] = useState("");
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const itens = lista.dados ?? [];

  function concluir(opcao: OpcaoCartao) {
    lista.recarregar();
    aoAlterar(tipo, opcao);
  }

  function cancelarEdicao() {
    setIdEmEdicao(null);
    setNome("");
    setErro(null);
  }

  function comecarEdicao(opcao: OpcaoCartao) {
    setIdEmEdicao(opcao.id);
    setNome(opcao.nome);
    setErro(null);
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!nome.trim()) {
      setErro(`Informe o nome da ${nomes.singular}.`);
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      const salva = idEmEdicao
        ? await renomearOpcaoCartao(tipo, idEmEdicao, nome)
        : await cadastrarOpcaoCartao(tipo, nome);
      if (!idEmEdicao) setSituacao("ativas");
      setIdEmEdicao(null);
      setNome("");
      concluir(salva);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarSituacao(opcao: OpcaoCartao) {
    setErro(null);
    try {
      const alterada = await alterarSituacaoOpcaoCartao(tipo, opcao.id, !opcao.ativo);
      if (idEmEdicao === opcao.id) cancelarEdicao();
      concluir(alterada);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={salvar}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {idEmEdicao ? `Renomear ${nomes.singular}` : `Nova ${nomes.singular}`}
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            autoComplete="off"
            className="rounded-md border border-neutral-300 px-3 py-2 font-normal"
          />
        </label>

        <div className="flex justify-end gap-3">
          {idEmEdicao && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancelar edição
            </button>
          )}
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {salvando ? "Salvando..." : idEmEdicao ? "Salvar nome" : `Cadastrar ${nomes.singular}`}
          </button>
        </div>
      </form>

      {(erro ?? lista.erro) && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro ?? lista.erro}
        </p>
      )}

      <section className="flex flex-col gap-3" aria-label={`${nomes.titulo}s cadastradas`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Cadastradas</h3>
          <SeletorSegmentado
            opcoes={opcoesSituacao}
            valor={situacao}
            aoAlterar={setSituacao}
            rotuloAcessivel={`Mostrar ${nomes.singular}s`}
          />
        </div>

        {lista.carregando ? (
          <p className="py-4 text-center text-sm text-neutral-500">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500">
            {situacao === "ativas"
              ? `Nenhuma ${nomes.singular} ativa.`
              : `Nenhuma ${nomes.singular} inativa.`}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {itens.map((opcao) => (
              <li
                key={opcao.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <p className="text-sm font-medium">{opcao.nome}</p>
                <div className="flex gap-2">
                  {opcao.ativo && (
                    <button
                      type="button"
                      onClick={() => comecarEdicao(opcao)}
                      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-neutral-50"
                    >
                      Renomear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void alternarSituacao(opcao)}
                    className={`rounded-md border px-3 py-1 text-xs font-medium ${
                      opcao.ativo
                        ? "border-red-300 text-red-700 hover:bg-red-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {opcao.ativo ? "Desativar" : "Reativar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Conteudo({ aoAlterar }: { aoAlterar: AoAlterarOpcao }) {
  const [tipo, setTipo] = useState<TipoOpcaoCartao>("maquininhas");

  return (
    <div className="flex flex-col gap-5">
      <SeletorSegmentado
        opcoes={opcoesTipoCartao}
        valor={tipo}
        aoAlterar={setTipo}
        rotuloAcessivel="O que gerenciar"
      />
      <Gerenciador key={tipo} tipo={tipo} aoAlterar={aoAlterar} />
    </div>
  );
}

interface ModalOpcoesCartaoProps {
  aberto: boolean;
  aoFechar: () => void;
  aoAlterar: AoAlterarOpcao;
}

export function ModalOpcoesCartao({ aberto, aoFechar, aoAlterar }: ModalOpcoesCartaoProps) {
  return (
    <Dialogo aberto={aberto} titulo="Maquininhas e bandeiras" aoFechar={aoFechar} largura="larga">
      <Conteudo aoAlterar={aoAlterar} />
    </Dialogo>
  );
}
