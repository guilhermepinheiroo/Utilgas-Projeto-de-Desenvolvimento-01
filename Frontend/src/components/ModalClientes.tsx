import type { Dispatch, SetStateAction } from "react";
import { ListaEnderecos } from "./ListaEnderecos";
import { MetricasCliente } from "./clientes/MetricasCliente";
import { CampoRotulado, SelecaoRotulada } from "./CamposFormulario";
import { Dialogo } from "./Dialogo";
import type {
  DadosFormularioCliente,
  EnderecoFormulario,
  MetricaCliente,
  OpcaoRegiao,
  SeloCliente,
} from "../types/FormularioCliente";
import { criarEnderecoVazio } from "../types/FormularioCliente";
import { formatarCep, formatarCpfCnpj, soDigitos } from "../utils/Documentos";
import { formatarTelefone } from "../utils/FormatacaoTelefone";
import iconeSetaEsquerda from "../assets/icon-seta-esquerda.png";
import iconeSetaDireita from "../assets/icon-seta-direita.png";
import iconerelogio from "../assets/icon-relogio.png";

interface ModalClienteProps {
  aberto: boolean;
  modo: "localizado" | "novo";
  eyebrow: string;
  titulo: string;
  selos?: SeloCliente[];
  metricas?: MetricaCliente[];
  dados: DadosFormularioCliente;
  aoAlterarDados: Dispatch<SetStateAction<DadosFormularioCliente>>;
  regioes: OpcaoRegiao[];
  erroRegioes?: string | null;
  erro: string | null;
  salvando: boolean;
  rotuloConfirmar: string;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}

export function ModalCliente({
  aberto,
  modo,
  eyebrow,
  titulo,
  selos = [],
  metricas,
  dados,
  aoAlterarDados,
  regioes,
  erroRegioes = null,
  erro,
  salvando,
  rotuloConfirmar,
  aoVoltar,
  aoConfirmar,
}: ModalClienteProps) {
  const novo = modo === "novo";

  if (novo) {
    return (
      <Dialogo
        aberto={aberto}
        titulo="Cliente não cadastrado"
        semCabecalho
        semArredondamento
        bloqueado={salvando}
        aoFechar={aoVoltar}
        classeLargura="max-w-[calc(100vw-48px)] xl:max-w-[1200px]"
        classeBackdrop="backdrop:bg-black/40"
      >
        <CadastroNovoCliente
          dados={dados}
          aoAlterarDados={aoAlterarDados}
          regioes={regioes}
          erroRegioes={erroRegioes}
          erro={erro}
          salvando={salvando}
          aoVoltar={aoVoltar}
          aoConfirmar={aoConfirmar}
        />
      </Dialogo>
    );
  }

  function alterar(parcial: Partial<DadosFormularioCliente>) {
    aoAlterarDados((atual) => ({ ...atual, ...parcial }));
  }

  return (
    <Dialogo
      aberto={aberto}
      titulo={titulo}
      semCabecalho
      bloqueado={salvando}
      aoFechar={aoVoltar}
      classeLargura="max-w-6xl"
    >
      <div className="flex max-h-[calc(100dvh-3rem)] flex-col">
        <header className="px-8 pb-4 pt-6">
          <p className="informacao-secundaria uppercase tracking-wide text-verde-painel">{eyebrow}</p>
          <h2 className="nome-cliente mt-1 uppercase tracking-tight text-neutral-900">
            {titulo}
          </h2>

          {selos.length > 0 && (
            <ul className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase">
              {selos.map((selo) => (
                <li
                  key={selo.texto}
                  className={
                    selo.destaque
                      ? "bg-neutral-200 px-1 font-bold text-neutral-900"
                      : "text-neutral-500"
                  }
                >
                  {selo.texto}
                </li>
              ))}
            </ul>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-sidebar px-5 py-4 text-white">
            <h3 className="text-lg font-semibold uppercase">Informações do cliente</h3>
            <span className="text-xs text-white/60">
              {novo ? "preencha os dados do novo cliente" : "já cadastradas, editáveis aqui mesmo"}
            </span>
          </div>

          <form
            id="formulario-cliente"
            onSubmit={(e) => {
              e.preventDefault();
              aoConfirmar();
            }}
            className="mt-6 flex flex-col gap-5"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              <CampoRotulado
                rotulo="Nome / Razão social"
                valor={dados.nome}
                aoAlterar={(nome) => alterar({ nome })}
                autoComplete="off"
              />
              <CampoRotulado
                rotulo="Telefone / Whatsapp"
                valor={formatarTelefone(dados.whatsapp)}
                aoAlterar={(valor) => alterar({ whatsapp: soDigitos(valor).slice(0, 11) })}
                inputMode="tel"
                readOnly={novo}
                autoComplete="off"
              />
              <CampoRotulado
                rotulo="CPF / CNPJ"
                valor={formatarCpfCnpj(dados.documento)}
                aoAlterar={(valor) => alterar({ documento: soDigitos(valor).slice(0, 14) })}
                inputMode="numeric"
                autoComplete="off"
              />
              <CampoRotulado
                rotulo="E-mail"
                type="email"
                valor={dados.email}
                aoAlterar={(email) => alterar({ email })}
                autoComplete="off"
              />
            </div>

            <ListaEnderecos
              enderecos={dados.enderecos}
              regioes={regioes}
              aoAlterarDados={aoAlterarDados}
            />
            {erroRegioes && (
              <p role="alert" className="text-sm text-red-600">
                Não foi possível carregar as regiões: {erroRegioes}
              </p>
            )}

            <CampoRotulado
              rotulo="Observações"
              corRotulo="verde"
              valor={dados.observacoes}
              aoAlterar={(observacoes) => alterar({ observacoes })}
              autoComplete="off"
            />
          </form>

          {metricas && metricas.length > 0 && (
            <div className="mt-6">
              <MetricasCliente metricas={metricas} />
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-neutral-300 px-8 py-4">
          {erro && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={aoVoltar}
              disabled={salvando}
              className="flex items-center gap-2 rounded-sm border border-neutral-300 bg-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-300 disabled:opacity-50"
            >
              <img src={iconeSetaEsquerda} alt="" className="size-4 object-contain" />
              Voltar
            </button>

            <button
              type="submit"
              form="formulario-cliente"
              disabled={salvando}
              className="flex items-center gap-2 rounded-sm bg-verde-painel px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sidebar-ativo disabled:opacity-60"
            >
              {salvando ? "Salvando..." : rotuloConfirmar}
              <img src={iconeSetaDireita} alt="" className="size-4 object-contain" />
            </button>
          </div>
        </footer>
      </div>
    </Dialogo>
  );
}

interface CadastroNovoClienteProps {
  dados: DadosFormularioCliente;
  aoAlterarDados: Dispatch<SetStateAction<DadosFormularioCliente>>;
  regioes: OpcaoRegiao[];
  erroRegioes?: string | null;
  erro: string | null;
  salvando: boolean;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}

function CadastroNovoCliente({
  dados,
  aoAlterarDados,
  regioes,
  erroRegioes,
  erro,
  salvando,
  aoVoltar,
  aoConfirmar,
}: CadastroNovoClienteProps) {
  const endereco = dados.enderecos[0];

  function alterarEndereco(parcial: Partial<EnderecoFormulario>) {
    aoAlterarDados((atual) => ({
      ...atual,
      enderecos: atual.enderecos.length
        ? atual.enderecos.map((item, indice) =>
            indice === 0 ? { ...item, ...parcial, principal: true } : item
          )
        : [{ ...criarEnderecoVazio(true), ...parcial }],
    }));
  }

  return (
    <div className="flex max-h-[calc(100dvh-40px)] min-h-[min(760px,calc(100dvh-40px))] flex-col bg-white">
      <header className="px-7 pt-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-verde-painel">ATENDIMENTO</p>
        <h2 className="mt-7 text-[28px] font-bold leading-tight text-neutral-950">
          CLIENTE NÃO CADASTRADO
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto px-7 pt-5">
        <div className="flex items-center gap-3 border border-[#64886a] bg-[#cbd8cd] px-3 py-5 text-xs text-neutral-900"> 
            <img src={iconerelogio} alt="" className="size-5   object-contain" />
          <p>
            Nenhum cadastro para o WhatsApp <strong>{dados.whatsapp}</strong>. Preencha os dados
            abaixo para cadastrar e conferir os dados antes de iniciar a venda.
          </p>
        </div>

        <form
          id="formulario-cliente-novo"
          onSubmit={(evento) => {
            evento.preventDefault();
            aoConfirmar();
          }}
          className="mt-7 grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2"
        >
          <CampoRotulado
            rotulo="WhatsApp (chave)"
            valor={dados.whatsapp}
            aoAlterar={() => undefined}
            semArredondamento
            readOnly
            autoComplete="off"
          />
          <CampoRotulado
            rotulo="Nome / Razão social"
            valor={dados.nome}
            aoAlterar={(nome) => aoAlterarDados((atual) => ({ ...atual, nome }))}
            placeholder="Ex.: Mercearia Pelotas"
            semArredondamento
            required
            autoComplete="off"
          />
          <CampoRotulado
            rotulo="CPF / CNPJ"
            valor={formatarCpfCnpj(dados.documento)}
            aoAlterar={(valor) =>
              aoAlterarDados((atual) => ({
                ...atual,
                documento: soDigitos(valor).slice(0, 14),
              }))
            }
            placeholder="000.000.000-00"
            inputMode="numeric"
            semArredondamento
            autoComplete="off"
          />
          <CampoRotulado
            rotulo="E-mail (opcional)"
            type="email"
            valor={dados.email}
            aoAlterar={(email) => aoAlterarDados((atual) => ({ ...atual, email }))}
            placeholder="cliente@gmail.com"
            semArredondamento
            autoComplete="off"
          />

          <div className="grid grid-cols-1 gap-x-7 gap-y-5 md:col-span-2 sm:grid-cols-3">
            <CampoRotulado
              rotulo="Logradouro e número"
              valor={endereco?.logradouro ?? ""}
              aoAlterar={(logradouro) => alterarEndereco({ logradouro })}
              placeholder="R. Exemplo, 120"
              semArredondamento
              required
              autoComplete="off"
            />
            <CampoRotulado
              rotulo="Complemento"
              valor={endereco?.complemento ?? ""}
              aoAlterar={(complemento) => alterarEndereco({ complemento })}
              placeholder="apto, bloco, sala"
              semArredondamento
              autoComplete="off"
            />
            <CampoRotulado
              rotulo="Bairro"
              valor={endereco?.bairro ?? ""}
              aoAlterar={(bairro) => alterarEndereco({ bairro })}
              semArredondamento
              autoComplete="off"
            />
            <CampoRotulado
              rotulo="CEP"
              valor={formatarCep(endereco?.cep ?? "")}
              aoAlterar={(valor) => alterarEndereco({ cep: soDigitos(valor).slice(0, 8) })}
              placeholder="00000-000"
              inputMode="numeric"
              semArredondamento
              autoComplete="off"
            />
            <CampoRotulado
              rotulo="Ponto de referência"
              valor={endereco?.pontoReferencia ?? ""}
              aoAlterar={(pontoReferencia) => alterarEndereco({ pontoReferencia })}
              placeholder="portão, esquina, interfone"
              semArredondamento
              autoComplete="off"
            />
            <SelecaoRotulada
              rotulo="Região de entrega"
              valor={endereco?.regiao ?? ""}
              aoAlterar={(regiao) => alterarEndereco({ regiao })}
              opcoes={regioes}
              semArredondamento
            />
          </div>
        </form>

        {erroRegioes && (
          <p role="alert" className="mt-3 text-xs text-red-600">
            Não foi possível carregar as regiões: {erroRegioes}
          </p>
        )}
        <p className="mt-3 text-[11px] font-semibold text-neutral-500">
          Obrigatórios: WhatsApp, nome e endereço. CPF/CNPJ e e-mail podem ser preenchidos depois,
          em Clientes. Este endereço entra como principal.
        </p>
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-neutral-300 px-7 py-3">
        {erro && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={aoVoltar}
            disabled={salvando}
            className="flex items-center gap-2 border border-neutral-300 bg-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-300 disabled:opacity-50"
          >
            <img src={iconeSetaEsquerda} alt="" className="size-4 object-contain" />
            Voltar
          </button>
          <button
            type="submit"
            form="formulario-cliente-novo"
            disabled={salvando}
            className="flex items-center gap-2 bg-verde-painel px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sidebar-ativo disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Cadastrar cliente"}
            <img src={iconeSetaDireita} alt="" className="size-4 object-contain" />
          </button>
        </div>
      </footer>
    </div>
  );
}