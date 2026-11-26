import { useState, type FormEvent } from "react";
import { Check, Pencil, Phone, Trash2, UserRound, UserRoundPlus, X } from "lucide-react";
import { Dialogo } from "../Dialogo";
import {
  atualizarEntregador,
  cadastrarEntregador,
  excluirEntregador,
} from "../../services/Entregas";
import { mensagemDeErro } from "../../services/Api";
import type { Entregador } from "../../types/Entregas";
import { formatarCpfCnpj, soDigitos } from "../../utils/Documentos";
import { formatarTelefone } from "../../utils/FormatacaoTelefone";

type Tela = "lista" | "formulario" | "confirmacao";
type TipoVeiculo = "Moto" | "Carro" | "Caminhão";

const tiposVeiculo: TipoVeiculo[] = ["Moto", "Carro", "Caminhão"];

interface ModalEntregadoresProps {
  aberto: boolean;
  telaInicial: "lista" | "formulario";
  entregadores: Entregador[];
  carregando: boolean;
  erroLista: string | null;
  aoFechar: () => void;
  aoAtualizar: () => void;
  aoRecarregarLista: () => Promise<void>;
}

export function ModalEntregadores({
  aberto,
  telaInicial,
  entregadores,
  carregando,
  erroLista,
  aoFechar,
  aoAtualizar,
  aoRecarregarLista,
}: ModalEntregadoresProps) {
  const [tela, setTela] = useState<Tela>(telaInicial);
  const [selecionado, setSelecionado] = useState<Entregador | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Entregador | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo>("Moto");
  const [placa, setPlaca] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [pixObservacoes, setPixObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [executandoId, setExecutandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function iniciarCadastro() {
    setSelecionado(null);
    setNome("");
    setTelefone("");
    setCpf("");
    setTipoVeiculo("Moto");
    setPlaca("");
    setAtivo(true);
    setPixObservacoes("");
    setErro(null);
    setTela("formulario");
  }

  function iniciarEdicao(entregador: Entregador) {
    setSelecionado(entregador);
    setNome(entregador.nome);
    setTelefone(entregador.telefone ?? "");
    setCpf(entregador.cpf ?? "");
    setTipoVeiculo(entregador.tipoVeiculo ?? "Moto");
    setPlaca(entregador.placa ?? "");
    setAtivo(entregador.ativo !== false);
    setPixObservacoes(entregador.pixObservacoes ?? "");
    setErro(null);
    setTela("formulario");
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    const telefoneLimpo = soDigitos(telefone);
    const cpfLimpo = soDigitos(cpf);
    const placaLimpa = placa.trim();
    if (nomeLimpo.length < 2) {
      setErro("Informe o nome completo do entregador.");
      return;
    }
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
      setErro("Informe um telefone com DDD.");
      return;
    }
    if (!cpfLimpo) {
      setErro("Informe o CPF.");
      return;
    }
    if (!placaLimpa) {
      setErro("Informe a placa do veículo.");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      const dados = {
        nome: nomeLimpo,
        telefone: telefoneLimpo,
        cpf: cpfLimpo,
        tipoVeiculo,
        placa: placaLimpa,
        pixObservacoes: pixObservacoes.trim(),
      };
      if (selecionado) {
        await atualizarEntregador(selecionado.id, { ...dados, ativo });
      } else {
        await cadastrarEntregador(dados);
      }
      aoAtualizar();
      setTela("lista");
      setSelecionado(null);
      await aoRecarregarLista();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;

    const entregador = paraExcluir;
    setExecutandoId(entregador.id);
    setErro(null);
    try {
      await excluirEntregador(entregador.id);
      aoAtualizar();
      setParaExcluir(null);
      setTela("lista");
      await aoRecarregarLista();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setExecutandoId(null);
    }
  }

  const titulo = tela === "lista"
    ? "Gerenciar Entregadores"
    : tela === "confirmacao"
      ? "Excluir Entregador"
      : selecionado
        ? "Editar Entregador"
        : "Cadastrar Novo Entregador";
  const IconeFormulario = selecionado ? UserRound : UserRoundPlus;

  return (
    <Dialogo
      aberto={aberto}
      titulo={titulo}
      aoFechar={aoFechar}
      classeLargura={
        tela === "lista" ? "max-w-3xl" : tela === "confirmacao" ? "max-w-lg" : "max-w-[522px]"
      }
      semCabecalho={tela === "formulario"}
      classePainel={tela === "formulario" ? "rounded-xl bg-white shadow-xl" : undefined}
      bloqueado={salvando || executandoId !== null}
    >
      {tela === "lista" ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={iniciarCadastro}
              className="rounded-md bg-verde-painel px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-verde-painel/90"
            >
              + Novo Entregador
            </button>
          </div>

          {(erro || erroLista) && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro ?? erroLista}
            </p>
          )}

          {carregando ? (
            <p className="py-8 text-center text-sm text-neutral-500">Carregando entregadores...</p>
          ) : entregadores.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              Nenhum entregador cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-neutral-200 text-xs text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Telefone</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {entregadores.map((entregador) => {
                    const ativo = entregador.ativo !== false;
                    return (
                      <tr key={entregador.id}>
                        <td className="px-3 py-3 font-medium text-neutral-800">{entregador.nome}</td>
                        <td className="px-3 py-3 text-neutral-600">
                          {entregador.telefone ? formatarTelefone(entregador.telefone) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              ativo ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => iniciarEdicao(entregador)}
                              disabled={executandoId !== null}
                              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                            >
                              <Pencil size={13} aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setParaExcluir(entregador);
                                setErro(null);
                                setTela("confirmacao");
                              }}
                              disabled={executandoId !== null}
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tela === "confirmacao" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-700">
            Tem certeza de que deseja excluir{" "}
            <strong>{paraExcluir?.nome ?? "este entregador"}</strong>? Essa ação não pode ser
            desfeita.
          </p>
          <p className="text-xs text-neutral-500">
            Entregadores associados a entregas não podem ser excluídos para preservar o histórico.
          </p>
          {erro && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setErro(null);
                setParaExcluir(null);
                setTela("lista");
              }}
              disabled={executandoId !== null}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmarExclusao()}
              disabled={executandoId !== null || !paraExcluir}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 size={16} aria-hidden="true" />
              {executandoId ? "Excluindo..." : "Excluir Entregador"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <header className="flex items-start gap-3 border-b border-neutral-100 px-6 py-5">
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8efec] text-[#184b3b]">
              <IconeFormulario size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {selecionado
                  ? "Atualize os dados do entregador para mantê-lo vinculado às rotas de entrega."
                  : "Preencha os dados do entregador para vinculá-lo às rotas de entrega."}
              </p>
            </div>
            <button
              type="button"
              onClick={aoFechar}
              disabled={salvando}
              aria-label="Fechar"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </header>

          <form onSubmit={(e) => void salvar(e)} className="flex flex-col gap-4 px-6 py-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold tracking-wide text-slate-600">
                NOME COMPLETO
              </span>
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
                required
                placeholder="Ex: Carlos Eduardo Silva"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-verde-painel focus:ring-2 focus:ring-verde-painel/15"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold tracking-wide text-slate-600">
                  TELEFONE / WHATSAPP
                </span>
                <span className="relative">
                  <Phone
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formatarTelefone(telefone)}
                    onChange={(e) => setTelefone(soDigitos(e.target.value).slice(0, 11))}
                    required
                    placeholder="(53) 99876-5432"
                    className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-verde-painel focus:ring-2 focus:ring-verde-painel/15"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold tracking-wide text-slate-600">
                  CPF
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatarCpfCnpj(cpf)}
                  onChange={(e) => setCpf(soDigitos(e.target.value).slice(0, 11))}
                  required
                  placeholder="123.456.789-00"
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-verde-painel focus:ring-2 focus:ring-verde-painel/15"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold tracking-wide text-slate-600">
                  TIPO DE VEÍCULO
                </span>
                <select
                  value={tipoVeiculo}
                  onChange={(e) => {
                    const tipo = tiposVeiculo.find((opcao) => opcao === e.target.value);
                    if (tipo) setTipoVeiculo(tipo);
                  }}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-verde-painel focus:ring-2 focus:ring-verde-painel/15"
                >
                  {tiposVeiculo.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold tracking-wide text-slate-600">
                  PLACA DO VEÍCULO
                </span>
                <input
                  type="text"
                  autoCapitalize="characters"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  required
                  placeholder="Ex: ABC-1D23"
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm uppercase text-slate-800 outline-none placeholder:normal-case placeholder:text-slate-400 focus:border-verde-painel focus:ring-2 focus:ring-verde-painel/15"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold tracking-wide text-slate-600">
                {selecionado ? "STATUS" : "STATUS INICIAL"}
              </span>
              <select
                value={ativo ? "ativo" : "inativo"}
                onChange={(e) => setAtivo(e.target.value === "ativo")}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-verde-painel focus:ring-2 focus:ring-verde-painel/15"
              >
                <option value="ativo">Ativo / Disponível</option>
                <option value="inativo">Inativo / Indisponível</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold tracking-wide text-slate-600">
                CHAVE PIX OU OBSERVAÇÕES <span className="font-normal normal-case text-slate-400">(opcional)</span>
              </span>
              <input
                type="text"
                value={pixObservacoes}
                onChange={(e) => setPixObservacoes(e.target.value)}
                maxLength={250}
                placeholder="Chave PIX para repasses ou anotações internas"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-verde-painel focus:ring-2 focus:ring-verde-painel/15"
              />
            </label>

            {erro && (
              <p role="alert" className="text-sm text-red-600">
                {erro}
              </p>
            )}

            <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (telaInicial === "lista") setTela("lista");
                  else aoFechar();
                }}
                disabled={salvando}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-lg bg-[#123e32] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f342a] disabled:opacity-50"
              >
                <Check size={16} aria-hidden="true" />
                {salvando
                  ? "Salvando..."
                  : selecionado
                    ? "Salvar Alterações"
                    : "Salvar Entregador"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </Dialogo>
  );
}
