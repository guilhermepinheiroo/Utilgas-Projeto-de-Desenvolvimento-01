import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CampoTelefone } from "../components/BuscaTelefone";
import { Dialogo } from "../components/Dialogo";
import { CartaoCliente } from "../components/atendimento/CartaoCliente";
import { EtapaEndereco } from "../components/atendimento/EtapaEndereco";
import { EtapaItens } from "../components/atendimento/EtapaItens";
import { EtapaPagamento } from "../components/atendimento/EtapaPagamento";
import { Etapas } from "../components/atendimento/Etapas";
import { ModalVendaRegistrada } from "../components/atendimento/ModalVendaRegistrada";
import {
  nomesEtapas,
  type ItemPedido,
} from "../components/atendimento/tipos";
import { ModalCliente } from "../components/ModalClientes";
import { useAcao } from "../hooks/UsenAcao";
import { useConsulta } from "../hooks/UseConsulta";
import { buscarClientePorTelefone, buscarRegioes } from "../services/Clientes";
import { registrarVenda } from "../services/Vendas";
import type { ClienteDetalhado } from "../types/clientes";
import type { DadosFormularioCliente, OpcaoRegiao } from "../types/FormularioCliente";
import type { BandeiraCartao, FormaPagamento, VendaRegistrada } from "../types/Vendas";
import { formatarCentavos } from "../utils/FormatacaoMoeda";
import {
  descontoEfetivoDoItem,
  ehBotijaoP13,
  subtotalCobradoDoItem,
} from "../utils/CalculoVenda";
import { formatarTelefone, telefoneCompleto } from "../utils/FormatacaoTelefone";
import {
  clienteParaFormulario,
  formularioVazio,
  resumoDoCliente,
  salvarCliente,
} from "../utils/MapeadoresClientes";
import { validarFormularioCliente } from "../utils/ValidarFormularioCliente";

type Tela = "telefone" | "venda";
type ModalAberto = "localizado" | "novo" | null;

const classeBotaoPrimario =
  "rounded-none bg-sidebar px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-sidebar-ativo disabled:cursor-not-allowed disabled:opacity-50";
const classeBotaoSecundario =
  "rounded-none border border-neutral-300 px-3 py-1 text-[11px] font-medium hover:bg-neutral-50 disabled:opacity-50";
const rotulosPagamento: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
  gas_do_povo: "Gás do Povo",
};

function Alerta({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {texto}
    </p>
  );
}

export function Atendimento() {
  const navegar = useNavigate();
  const [tela, setTela] = useState<Tela>("telefone");
  const [telefone, setTelefone] = useState("");
  const [cliente, setCliente] = useState<ClienteDetalhado | null>(null);

  const [modal, setModal] = useState<ModalAberto>(null);
  const [dados, setDados] = useState<DadosFormularioCliente>(() => formularioVazio(""));
  const [aviso, setAviso] = useState<string | null>(null);

  const [etapa, setEtapa] = useState(0);
  const [enderecoId, setEnderecoId] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [pagamento, setPagamento] = useState<FormaPagamento>("pix");
  const [bandeira, setBandeira] = useState<BandeiraCartao | null>(null);
  const [observacao, setObservacao] = useState("");
  const [vendaRegistrada, setVendaRegistrada] = useState<VendaRegistrada | null>(null);

  const busca = useAcao();
  const salvamento = useAcao();
  const venda = useAcao();
  const consultaRegioes = useConsulta(buscarRegioes, "atendimento-regioes");
  const regiaoPadrao =
    consultaRegioes.dados?.find((regiao) => regiao.nome.toLocaleLowerCase("pt-BR") === "centro")
      ?.id ?? consultaRegioes.dados?.[0]?.id;
  const regioes: OpcaoRegiao[] = (consultaRegioes.dados ?? []).map((regiao) => ({
    valor: regiao.id,
    rotulo: regiao.nome,
  }));

  const endereco = cliente?.enderecos.find((e) => e.id === enderecoId) ?? null;
  const pagamentoCartao = pagamento === "credito" || pagamento === "debito";
  const instrucaoMaquininha =
    pagamentoCartao && bandeira ? `Levar máquina para cartão ${bandeira}` : null;
  const observacaoEntrega = [observacao.trim(), instrucaoMaquininha]
    .filter((texto): texto is string => texto !== null && texto.length > 0)
    .join(" · ");
  const liberadas = [
    true,
    cliente !== null,
    cliente !== null && itens.length > 0,
    cliente !== null && endereco !== null && itens.length > 0,
  ];
  const temBotijaoP13 = itens.some((item) => ehBotijaoP13(item.produto));

  function iniciarVenda(c: ClienteDetalhado) {
    setCliente(c);
    const principal = c.enderecos.find((e) => e.principal) ?? c.enderecos[0];
    setEnderecoId(principal?.id ?? null);
    setItens([]);
    setPagamento("pix");
    setBandeira(null);
    setObservacao("");
    setEtapa(1);
    setModal(null);
    setTela("venda");
  }

  function reiniciar() {
    setTela("telefone");
    setTelefone("");
    setCliente(null);
    setModal(null);
    setDados(formularioVazio(""));
    setVendaRegistrada(null);
    setAviso(null);
    busca.limparErro();
    salvamento.limparErro();
    venda.limparErro();
  }

  function alterarItens(novosItens: ItemPedido[]) {
    setItens(novosItens);
    if (!novosItens.some((item) => ehBotijaoP13(item.produto)) && pagamento === "gas_do_povo") {
      setPagamento("pix");
    }
  }

  function abrirLocalizado(c: ClienteDetalhado) {
    setCliente(c);
    setDados(clienteParaFormulario(c));
    setAviso(null);
    salvamento.limparErro();
    setModal("localizado");
  }

  function abrirNovo() {
    setCliente(null);
    const formulario = formularioVazio(telefone.replace(/\D/g, ""));
    if (regiaoPadrao && formulario.enderecos[0]) {
      formulario.enderecos[0].regiao = regiaoPadrao;
    }
    setDados(formulario);
    setAviso(null);
    salvamento.limparErro();
    setModal("novo");
  }

  // Voltar do modal: fecha e descarta as alterações, mantendo o telefone digitado
  function voltarDoModal() {
    if (modal === null) return;
    setModal(null);
    setCliente(null);
    setAviso(null);
    salvamento.limparErro();
  }

  async function iniciarAtendimento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!telefoneCompleto(telefone)) return;

    let encontrado: ClienteDetalhado | null = null;
    const ok = await busca.executar(async () => {
      encontrado = await buscarClientePorTelefone(telefone);
    });
    if (!ok) return;

    if (encontrado) abrirLocalizado(encontrado);
    else abrirNovo();
  }

  // Cadastro abre a revisão dos dados; cliente salvo pode seguir para a venda.
  async function confirmarCliente() {
    const problema = validarFormularioCliente(dados);
    if (problema) {
      setAviso(problema);
      return;
    }
    setAviso(null);
    const clienteJaCadastrado = cliente !== null;

    let salvo: ClienteDetalhado | null = null;
    const ok = await salvamento.executar(async () => {
      salvo = await salvarCliente(dados, cliente);
    });
    if (!ok || !salvo) return;

    if (clienteJaCadastrado) {
      iniciarVenda(salvo);
      return;
    }

    setCliente(salvo);
    setDados(clienteParaFormulario(salvo));
    setModal("localizado");
  }

  async function finalizar() {
    if (
      !cliente ||
      !endereco ||
      itens.length === 0 ||
      (pagamentoCartao && !bandeira) ||
      (pagamento === "gas_do_povo" && !temBotijaoP13)
    ) return;

    let registrada: VendaRegistrada | null = null;
    const ok = await venda.executar(async () => {
      registrada = await registrarVenda({
        origem: "atendimento",
        clienteId: cliente.id,
        enderecoId: endereco.id,
        pagamento,
        observacaoEntregador: observacaoEntrega,
        itens: itens.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          descontoCentavos: descontoEfetivoDoItem(item, pagamento),
        })),
      });
    });
    if (ok && registrada) setVendaRegistrada(registrada);
  }

  if (tela === "telefone") {
    const novo = modal === "novo";
    const resumo = !novo && cliente ? resumoDoCliente(cliente) : null;

    return (
      <>
        <form
          onSubmit={iniciarAtendimento}
          className="flex h-full min-h-screen flex-col items-center justify-center gap-6 px-6"
        >
          <h1 className="text-xl font-bold text-neutral-900">Atendimento por telefone</h1>
          <CampoTelefone valor={telefone} aoAlterar={setTelefone} />
          <div className="w-full max-w-md">
            <Alerta texto={busca.erro} />
          </div>
          <button
            type="submit"
            disabled={!telefoneCompleto(telefone) || busca.executando}
            className="cursor-pointer rounded-md bg-sidebar px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sidebar-ativo disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busca.executando ? "Buscando..." : "Iniciar Atendimento"}
          </button>
        </form>

        <ModalCliente
          aberto={modal !== null}
          modo={novo ? "novo" : "localizado"}
          eyebrow={`${novo ? "Cliente novo" : "Cliente localizado"} · WhatsApp ${telefone}`}
          titulo={novo ? "Cliente novo" : (resumo?.titulo ?? "")}
          selos={resumo?.selos}
          metricas={resumo?.metricas}
          dados={dados}
          aoAlterarDados={setDados}
          regioes={regioes}
          erroRegioes={consultaRegioes.erro}
          erro={aviso ?? salvamento.erro}
          salvando={salvamento.executando}
          rotuloConfirmar={novo ? "Cadastrar cliente" : "Iniciar Venda"}
          aoVoltar={voltarDoModal}
          aoConfirmar={() => void confirmarCliente()}
        />
      </>
    );
  }

  if (!cliente) return null;

  const podeAvancar = liberadas[etapa + 1] ?? false;
  const subtotal = itens.reduce((total, item) => total + item.produto.precoCentavos * item.quantidade, 0);
  const descontos = itens.reduce(
    (total, item) => total + descontoEfetivoDoItem(item, pagamento),
    0
  );

  return (
    <>
      <Dialogo
        aberto={tela === "venda"}
        titulo="Nova venda"
        semCabecalho
        aoFechar={reiniciar}
        classeLargura="max-w-5xl"
      >
        <div className="flex h-[calc(100dvh-2rem)] flex-col">
          <header className="shrink-0 px-8 pb-4 pt-6">
          <p className="informacao-secundaria uppercase text-[#274634]">
            Cliente localizado · WhatsApp {formatarTelefone(cliente.whatsapp)}
          </p>
          <h1 className="nome-cliente mt-1 uppercase leading-tight text-neutral-950">
            {cliente.nome}
          </h1>
          <div className="mt-1">
            <Etapas atual={etapa} aoIrPara={setEtapa} liberadas={liberadas} />
          </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6">
          <div className="mt-1">
          {etapa === 0 && <CartaoCliente cliente={cliente} aoTrocar={reiniciar} />}

          {etapa === 1 && <EtapaItens itens={itens} aoAlterar={alterarItens} />}

          {etapa === 2 && (
            <div className="flex flex-col gap-4">
              <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 bg-sidebar px-3 py-2 text-white">
                <h2 className="text-base font-semibold">Entrega e Pagamento</h2>
                <span className="informacao-secundaria text-white/60">
                  endereços já cadastrados do cliente
                </span>
              </header>

              <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
                <EtapaEndereco
                  cliente={cliente}
                  selecionado={enderecoId}
                  aoSelecionar={setEnderecoId}
                />
                <EtapaPagamento
                  pagamento={pagamento}
                  temBotijaoP13={temBotijaoP13}
                  aoAlterarPagamento={setPagamento}
                  bandeira={bandeira}
                  aoAlterarBandeira={setBandeira}
                  observacao={observacao}
                  aoAlterarObservacao={setObservacao}
                />
              </div>
            </div>
          )}

          {etapa === 3 && (
            <section className="flex flex-col gap-4 text-xs">
              <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 bg-sidebar px-3 py-2 text-white">
                <h2 className="text-base font-semibold">Resumo da Venda</h2>
                <span className="text-[9px] text-white/60">confira antes de registrar</span>
              </header>

              <div className="grid gap-6 md:grid-cols-2">
                <section className="flex flex-col gap-1">
                  <h3 className="text-[9px] font-semibold uppercase tracking-wide text-verde-painel">
                    Cliente
                  </h3>
                  <p className="text-sm font-bold uppercase text-neutral-900">{cliente.nome}</p>
                  <p className="text-[10px] text-neutral-500">
                    WhatsApp · <strong className="text-neutral-800">{formatarTelefone(cliente.whatsapp)}</strong>
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Entrega ·{" "}
                    <strong className="text-neutral-800">
                      {endereco
                        ? [
                            endereco.endereco,
                            endereco.bairro,
                            endereco.regiaoNome,
                          ]
                            .filter(Boolean)
                            .join(" - ")
                        : "Endereço não selecionado"}
                    </strong>
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Pagamento ·{" "}
                    <strong className="uppercase text-neutral-800">
                      {pagamentoCartao ? "Cartão" : rotulosPagamento[pagamento]}
                    </strong>
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-verde-painel">
                    Itens
                  </h3>
                  <ul className="divide-y divide-neutral-200">
                    {itens.map((item) => (
                      <li
                        key={item.produto.id}
                        className="flex justify-between gap-3 py-1.5 text-[9px] uppercase"
                      >
                        <span>
                          {item.quantidade}× {item.produto.nome}
                        </span>
                        <span className="shrink-0">
                          {formatarCentavos(subtotalCobradoDoItem(item, pagamento))}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-2 space-y-1 border-b border-neutral-300 pb-2 text-[9px] text-neutral-500">
                    <div className="flex justify-between gap-3">
                      <dt>Subtotal</dt>
                      <dd className="text-neutral-700">{formatarCentavos(subtotal)}</dd>
                    </div>
                    {descontos > 0 && (
                      <div className="flex justify-between gap-3">
                        <dt>Desconto</dt>
                        <dd className="text-neutral-700">− {formatarCentavos(descontos)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt>Taxa de entrega</dt>
                      <dd className="text-neutral-700">
                        {formatarCentavos(endereco?.taxaEntregaCentavos ?? 0)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[9px] uppercase tracking-wide text-neutral-600">
                      Total
                    </span>
                    <span className="text-2xl font-light tracking-wide text-neutral-900">
                      {formatarCentavos(
                        subtotal - descontos + (endereco?.taxaEntregaCentavos ?? 0)
                      )}
                    </span>
                  </div>
                </section>
              </div>
            </section>
          )}
          </div>
          </div>

          <div className="mx-8 mb-2 shrink-0">
            <Alerta texto={venda.erro} />
          </div>

        <footer className="flex shrink-0 justify-between border-t border-neutral-300 px-8 py-4">
          <button
            type="button"
            onClick={() => (etapa === 0 ? reiniciar() : setEtapa(etapa - 1))}
            className={classeBotaoSecundario}
          >
            {etapa === 0
              ? "Cancelar atendimento"
              : etapa >= 2
                ? `← ${nomesEtapas[etapa - 1]}`
                : nomesEtapas[etapa - 1]}
          </button>

          {etapa < nomesEtapas.length - 1 ? (
            <button
              type="button"
              onClick={() => setEtapa(etapa + 1)}
              disabled={!podeAvancar}
              className={classeBotaoPrimario}
            >
              {etapa === 2 ? `${nomesEtapas[etapa + 1]} →` : nomesEtapas[etapa + 1]}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finalizar()}
              disabled={
                venda.executando ||
                itens.length === 0 ||
                !endereco ||
                (pagamentoCartao && !bandeira) ||
                (pagamento === "gas_do_povo" && !temBotijaoP13)
              }
              className={classeBotaoPrimario}
            >
              {venda.executando ? "Registrando..." : "Registrar Venda"}
            </button>
          )}
        </footer>
        </div>
      </Dialogo>

      <ModalVendaRegistrada
        venda={vendaRegistrada}
        cliente={cliente}
        endereco={endereco}
        aoNovoAtendimento={reiniciar}
        aoVerEntregas={() => navegar("/entregas")}
      />
    </>
  );
}