import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CampoTelefone } from "../components/BuscaTelefone";
import { CartaoCliente } from "../components/atendimento/CartaoCliente";
import { EtapaEndereco } from "../components/atendimento/EtapaEndereco";
import { EtapaItens } from "../components/atendimento/EtapaItens";
import { EtapaPagamento } from "../components/atendimento/EtapaPagamento";
import { Etapas } from "../components/atendimento/Etapas";
import { ModalVendaRegistrada } from "../components/atendimento/ModalVendaRegistrada";
import { nomesEtapas, type ItemPedido } from "../components/atendimento/tipos";
import { CamposCliente, CamposEndereco } from "../components/clientes/FormCliente";
import { useAcao } from "../hooks/UsenAcao";
import { buscarClientePorTelefone, criarCliente, obterCliente } from "../services/Clientes";
import { registrarVenda } from "../services/Vendas";
import type { ClienteDetalhado, ClienteInput, EnderecoInput } from "../types/clientes";
import type { FormaPagamento, VendaRegistrada } from "../types/Vendas";
import { telefoneCompleto } from "../utils/FormatacaoTelefone";
import {
  clienteValido,
  clienteVazio,
  enderecoValido,
  enderecoVazio,
} from "../utils/ValidaCliente";

type Tela = "telefone" | "cadastro" | "venda";

const classeBotaoPrimario =
  "rounded-md bg-sidebar px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sidebar-ativo disabled:cursor-not-allowed disabled:opacity-50";
const classeBotaoSecundario =
  "rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50";

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

  const [novoCliente, setNovoCliente] = useState<ClienteInput>(clienteVazio);
  const [novoEndereco, setNovoEndereco] = useState<EnderecoInput>(enderecoVazio);
  const [aviso, setAviso] = useState<string | null>(null);

  const [etapa, setEtapa] = useState(0);
  const [enderecoId, setEnderecoId] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [pagamento, setPagamento] = useState<FormaPagamento>("pix");
  const [observacao, setObservacao] = useState("");
  const [vendaRegistrada, setVendaRegistrada] = useState<VendaRegistrada | null>(null);

  const busca = useAcao();
  const cadastro = useAcao();
  const venda = useAcao();

  const endereco = cliente?.enderecos.find((e) => e.id === enderecoId) ?? null;
  const liberadas = [true, cliente !== null, endereco !== null, endereco !== null && itens.length > 0];

  function iniciarVenda(c: ClienteDetalhado) {
    setCliente(c);
    const principal = c.enderecos.find((e) => e.principal) ?? c.enderecos[0];
    setEnderecoId(principal?.id ?? null);
    setItens([]);
    setPagamento("pix");
    setObservacao("");
    setEtapa(0);
    setTela("venda");
  }

  function reiniciar() {
    setTela("telefone");
    setTelefone("");
    setCliente(null);
    setNovoCliente(clienteVazio);
    setNovoEndereco(enderecoVazio);
    setVendaRegistrada(null);
    setAviso(null);
    busca.limparErro();
    venda.limparErro();
  }

  async function iniciarAtendimento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!telefoneCompleto(telefone)) return;

    let encontrado: ClienteDetalhado | null = null;
    const ok = await busca.executar(async () => {
      encontrado = await buscarClientePorTelefone(telefone);
    });
    if (!ok) return;

    if (encontrado) {
      iniciarVenda(encontrado);
    } else {
      setNovoCliente({ ...clienteVazio, whatsapp: telefone.replace(/\D/g, "") });
      setNovoEndereco(enderecoVazio);
      setAviso(null);
      setTela("cadastro");
    }
  }

  async function cadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problema = clienteValido(novoCliente) ?? enderecoValido(novoEndereco);
    if (problema) {
      setAviso(problema);
      return;
    }
    setAviso(null);

    let criado: ClienteDetalhado | null = null;
    const ok = await cadastro.executar(async () => {
      criado = await criarCliente(novoCliente, novoEndereco);
    });
    if (ok && criado) iniciarVenda(criado);
  }

  async function finalizar() {
    if (!cliente || !endereco || itens.length === 0) return;

    let registrada: VendaRegistrada | null = null;
    const ok = await venda.executar(async () => {
      registrada = await registrarVenda({
        origem: "atendimento",
        clienteId: cliente.id,
        enderecoId: endereco.id,
        pagamento,
        observacaoEntregador: observacao,
        itens: itens.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          descontoCentavos: item.descontoCentavos,
        })),
      });
    });
    if (ok && registrada) setVendaRegistrada(registrada);
  }

  if (tela === "telefone") {
    return (
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
    );
  }

  if (tela === "cadastro") {
    return (
      <form onSubmit={cadastrar} className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <header>
          <h1 className="text-2xl font-bold text-neutral-900">Cliente novo</h1>
          <p className="text-sm text-neutral-500">
            Telefone sem cadastro.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Dados do cliente</h2>
          <CamposCliente valor={novoCliente} aoAlterar={setNovoCliente} mostrarStatus={false} />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Endereço de entrega</h2>
          <CamposEndereco valor={novoEndereco} aoAlterar={setNovoEndereco} />
        </section>

        <Alerta texto={aviso ?? cadastro.erro} />

        <div className="flex justify-between gap-3">
          <button type="button" onClick={reiniciar} className={classeBotaoSecundario}>
            Voltar
          </button>
          <button type="submit" disabled={cadastro.executando} className={classeBotaoPrimario}>
            {cadastro.executando ? "Cadastrando..." : "Cadastrar e continuar"}
          </button>
        </div>
      </form>
    );
  }

  if (!cliente) return null;

  const podeAvancar = liberadas[etapa + 1] ?? false;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">Nova venda</h1>
        <Etapas atual={etapa} aoIrPara={setEtapa} liberadas={liberadas} />
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        {etapa === 0 && <CartaoCliente cliente={cliente} aoTrocar={reiniciar} />}

        {etapa === 1 && (
          <EtapaEndereco
            cliente={cliente}
            selecionado={enderecoId}
            aoSelecionar={setEnderecoId}
            aoAdicionado={(novo) => {
              setEnderecoId(novo.id);
              obterCliente(cliente.id)
                .then(setCliente)
                .catch(() =>
                  setCliente({ ...cliente, enderecos: [...cliente.enderecos, novo] })
                );
            }}
          />
        )}

        {etapa === 2 && <EtapaItens itens={itens} aoAlterar={setItens} />}

        {etapa === 3 && (
          <EtapaPagamento
            itens={itens}
            endereco={endereco}
            pagamento={pagamento}
            aoAlterarPagamento={setPagamento}
            observacao={observacao}
            aoAlterarObservacao={setObservacao}
          />
        )}
      </section>

      <Alerta texto={venda.erro} />

      <footer className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => (etapa === 0 ? reiniciar() : setEtapa(etapa - 1))}
          className={classeBotaoSecundario}
        >
          {etapa === 0 ? "Cancelar atendimento" : "Voltar"}
        </button>

        {etapa < nomesEtapas.length - 1 ? (
          <button
            type="button"
            onClick={() => setEtapa(etapa + 1)}
            disabled={!podeAvancar}
            className={classeBotaoPrimario}
          >
            Continuar: {nomesEtapas[etapa + 1]}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void finalizar()}
            disabled={venda.executando || itens.length === 0 || !endereco}
            className={classeBotaoPrimario}
          >
            {venda.executando ? "Registrando..." : "Registrar Venda"}
          </button>
        )}
      </footer>

      <ModalVendaRegistrada
        venda={vendaRegistrada}
        aoNovoAtendimento={reiniciar}
        aoVerEntregas={() => navegar("/entregas")}
      />
    </div>
  );
}
