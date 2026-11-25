import { useEffect, useState, type FormEvent } from "react";
import { mensagemDeErro } from "../../services/Api";
import {
  alterarSituacaoEntregador,
  cadastrarEntregador,
  editarEntregador,
  listarEntregadoresCadastrados,
} from "../../services/Entregas";
import type { EntregadorCadastrado, EntregadorInput } from "../../types/Entregas";
import { formatarTelefoneFixoOuCelular } from "../../utils/FormatacaoTelefone";
import { Dialogo } from "../Dialogo";
import { SeletorSegmentado, type OpcaoSeletor } from "../dashboard/SeletorSegmentado";

type Situacao = "ativos" | "inativos";

const opcoesSituacao: OpcaoSeletor<Situacao>[] = [
  { valor: "ativos", rotulo: "Ativos" },
  { valor: "inativos", rotulo: "Inativos" },
];

const entregadorVazio: EntregadorInput = { nome: "", telefone: "" };

function problemaNoFormulario(input: EntregadorInput): string | null {
  if (!input.nome.trim()) return "Informe o nome do entregador.";
  const digitos = input.telefone.replace(/\D/g, "");
  if (digitos && digitos.length < 10) return "O telefone precisa de DDD + número.";
  return null;
}

interface ConteudoProps {
  aoAlterarEntregadores: () => void;
}

function Conteudo({ aoAlterarEntregadores }: ConteudoProps) {
  const [situacao, setSituacao] = useState<Situacao>("ativos");
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState<{
    chave: string;
    itens: EntregadorCadastrado[];
  } | null>(null);
  const [formulario, setFormulario] = useState<EntregadorInput>(entregadorVazio);
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const chave = `${situacao}-${versao}`;

  useEffect(() => {
    let cancelado = false;

    listarEntregadoresCadastrados(situacao === "ativos")
      .then((itens) => {
        if (!cancelado) setResultado({ chave, itens });
      })
      .catch((e) => {
        if (cancelado) return;
        setResultado({ chave, itens: [] });
        setErro(mensagemDeErro(e));
      });

    return () => {
      cancelado = true;
    };
  }, [chave, situacao]);

  const carregando = resultado?.chave !== chave;
  const lista = resultado?.itens ?? [];

  function recarregar() {
    setVersao((atual) => atual + 1);
    aoAlterarEntregadores();
  }

  function cancelarEdicao() {
    setIdEmEdicao(null);
    setFormulario(entregadorVazio);
    setErro(null);
  }

  function comecarEdicao(entregador: EntregadorCadastrado) {
    setIdEmEdicao(entregador.id);
    setFormulario({
      nome: entregador.nome,
      telefone: formatarTelefoneFixoOuCelular(entregador.telefone ?? ""),
    });
    setErro(null);
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problema = problemaNoFormulario(formulario);
    if (problema) {
      setErro(problema);
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      if (idEmEdicao) {
        await editarEntregador(idEmEdicao, formulario);
      } else {
        await cadastrarEntregador(formulario);
        setSituacao("ativos");
      }
      setIdEmEdicao(null);
      setFormulario(entregadorVazio);
      recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarSituacao(entregador: EntregadorCadastrado) {
    setErro(null);
    try {
      await alterarSituacaoEntregador(entregador.id, !entregador.ativo);
      if (idEmEdicao === entregador.id) cancelarEdicao();
      recarregar();
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
        <h3 className="text-sm font-semibold">
          {idEmEdicao ? "Editar entregador" : "Novo entregador"}
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              autoComplete="off"
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Telefone (opcional)
            <input
              type="tel"
              inputMode="numeric"
              value={formulario.telefone}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  telefone: formatarTelefoneFixoOuCelular(e.target.value),
                })
              }
              placeholder="(53) 98812-4477"
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

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
            {salvando ? "Salvando..." : idEmEdicao ? "Salvar alterações" : "Cadastrar entregador"}
          </button>
        </div>
      </form>

      {erro && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <section className="flex flex-col gap-3" aria-label="Entregadores cadastrados">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Entregadores cadastrados</h3>
          <SeletorSegmentado
            opcoes={opcoesSituacao}
            valor={situacao}
            aoAlterar={setSituacao}
            rotuloAcessivel="Mostrar entregadores"
          />
        </div>

        {carregando ? (
          <p className="py-4 text-center text-sm text-neutral-500">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500">
            {situacao === "ativos" ? "Nenhum entregador ativo." : "Nenhum entregador inativo."}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {lista.map((entregador) => (
              <li
                key={entregador.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{entregador.nome}</p>
                  <p className="text-xs text-neutral-500">
                    {entregador.telefone
                      ? formatarTelefoneFixoOuCelular(entregador.telefone)
                      : "Sem telefone"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {entregador.ativo && (
                    <button
                      type="button"
                      onClick={() => comecarEdicao(entregador)}
                      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-neutral-50"
                    >
                      Editar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => alternarSituacao(entregador)}
                    className={`rounded-md border px-3 py-1 text-xs font-medium ${
                      entregador.ativo
                        ? "border-red-300 text-red-700 hover:bg-red-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {entregador.ativo ? "Desativar" : "Reativar"}
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

interface ModalEntregadoresProps {
  aberto: boolean;
  aoFechar: () => void;
  aoAlterarEntregadores: () => void;
}

export function ModalEntregadores({
  aberto,
  aoFechar,
  aoAlterarEntregadores,
}: ModalEntregadoresProps) {
  return (
    <Dialogo aberto={aberto} titulo="Entregadores" aoFechar={aoFechar} largura="larga">
      <Conteudo aoAlterarEntregadores={aoAlterarEntregadores} />
    </Dialogo>
  );
}
