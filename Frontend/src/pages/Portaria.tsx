import { useMemo, useState } from "react";
import { CampoBusca } from "../components/CampoBusca";
import { Dialogo } from "../components/Dialogo";
import { ModalSelecionarCliente } from "../components/ModalSelecionarCliente";
import type { Cliente } from "../types/clientes";

import iconeBusca from "../assets/telaclientes/icon-busca.png";
import iconeBotijao from "../assets/Icon-botijão.png";
import iconeGalao from "../assets/icon-galao.png";
import iconeCartao from "../assets/icon-cartao.png";
import iconeValvula from "../assets/icon-valvula.png";
import iconeDinheiro from "../assets/telavendas/icon-dinheiro-vivo.png";
import iconePix from "../assets/telavendas/icon-pix.png";
import iconePerfil from "../assets/telavendas/icon-perfil.png";
import iconeLixeira from "../assets/telaclientes/icon-lixeira.png";

type IdProdutoPortaria = "p13" | "p20" | "p45" | "p08" | "valvula" | "agua20";
type FormaPagamento = "pix" | "dinheiro" | "credito" | "debito";

interface ProdutoPortaria {
  id: IdProdutoPortaria;
  nome: string;
  precoCentavos: number;
  icone: string;
}

interface ItemCarrinho extends ProdutoPortaria {
  quantidade: number;
  descontoCentavos: number;
}

const produtos: ProdutoPortaria[] = [
  { id: "p13", nome: "P13 - Botijão de gás 13kg", precoCentavos: 11200, icone: iconeBotijao },
  { id: "p20", nome: "P20 - Botijão de gás 20kg", precoCentavos: 14800, icone: iconeBotijao },
  { id: "p45", nome: "P45 - Botijão de gás 45kg", precoCentavos: 28900, icone: iconeBotijao },
  { id: "p08", nome: "P08 - Botijão de gás 08kg", precoCentavos: 8700, icone: iconeBotijao },
  { id: "valvula", nome: "Válvula de Segurança", precoCentavos: 4250, icone: iconeValvula },
  { id: "agua20", nome: "Galão de Água 20 litros", precoCentavos: 2890, icone: iconeGalao },
];

const formasPagamento: Array<{ id: FormaPagamento; nome: string; icone: string }> = [
  { id: "pix", nome: "PIX", icone: iconePix },
  { id: "dinheiro", nome: "Dinheiro", icone: iconeDinheiro },
  { id: "credito", nome: "Cartão de Crédito", icone: iconeCartao },
  { id: "debito", nome: "Cartão de Débito", icone: iconeCartao },
];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function moeda(valorCentavos: number) {
  return formatoMoeda.format(valorCentavos / 100);
}

function totalDoItem(item: ItemCarrinho) {
  return item.precoCentavos * item.quantidade - item.descontoCentavos;
}

function ProdutoIcone({ produto }: { produto: ProdutoPortaria }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-100">
      <img src={produto.icone} alt="" className="size-6 object-contain" />
    </span>
  );
}

export function Portaria() {
  const [busca, setBusca] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "gas" | "agua">("todos");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pagamento, setPagamento] = useState<FormaPagamento>("pix");
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return produtos.filter((produto) => {
      const correspondeBusca = !termo || produto.nome.toLocaleLowerCase("pt-BR").includes(termo);
      const correspondeFiltro =
        filtro === "todos" || (filtro === "agua" ? produto.id === "agua20" : produto.id !== "agua20");
      return correspondeBusca && correspondeFiltro;
    });
  }, [busca, filtro]);

  const subtotal = carrinho.reduce((total, item) => total + item.precoCentavos * item.quantidade, 0);
  const desconto = carrinho.reduce((total, item) => total + item.descontoCentavos, 0);
  const total = subtotal - desconto;

  function adicionarProduto(produto: ProdutoPortaria) {
    setMensagem(null);
    setCarrinho((itens) => {
      const existente = itens.find((item) => item.id === produto.id);
      if (existente) {
        return itens.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...itens, { ...produto, quantidade: 1, descontoCentavos: 0 }];
    });
  }

  function alterarQuantidade(id: IdProdutoPortaria, delta: number) {
    setCarrinho((itens) =>
      itens
        .map((item) =>
          item.id === id
            ? { ...item, quantidade: Math.max(0, item.quantidade + delta) }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  function removerItem(id: IdProdutoPortaria) {
    setCarrinho((itens) => itens.filter((item) => item.id !== id));
  }

  function finalizarVenda() {
    if (carrinho.length === 0) {
      setMensagem("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    setMensagem("Venda finalizada com sucesso.");
    setCarrinho([]);
    setCliente(null);
    setPagamento("pix");
  }

  function confirmarCancelamento() {
    setModalCancelamentoAberto(false);
    setCarrinho([]);
    setCliente(null);
    setPagamento("pix");
    setMensagem("Venda cancelada.");
  }

  return (
    <div className="min-h-full bg-[#f3f6f4] p-4 text-neutral-800 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Vendas na portaria</h1>
        <CampoBusca
          valor={buscaCliente}
          aoAlterar={(valor) => {
            setBuscaCliente(valor);
            setModalClienteAberto(true);
          }}
          placeholder="Buscar clientes"
          rotuloAcessivel="Buscar clientes"
        />
      </header>

      {mensagem && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          <span>{mensagem}</span>
          <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar mensagem">
            ×
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.85fr)]">
        <main className="min-w-0">
          <section aria-labelledby="titulo-produtos">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="titulo-produtos" className="text-xl font-bold text-neutral-900">
                Produtos
              </h2>
              <div className="flex w-full gap-2 sm:w-auto">
                <label className="relative hidden min-w-0 sm:block">
                  <span className="sr-only">Buscar produtos</span>
                  <img src={iconeBusca} alt="" className="absolute left-3 top-2.5 size-4 opacity-50" />
                  <input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar"
                    className="w-32 rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-2 text-xs outline-none focus:border-sidebar"
                  />
                </label>
                <select
                  aria-label="Filtrar produtos"
                  value={filtro}
                  onChange={(event) => setFiltro(event.target.value as typeof filtro)}
                  className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium sm:flex-none"
                >
                  <option value="todos">Todos</option>
                  <option value="gas">Gás</option>
                  <option value="agua">Água</option>
                </select>
                <button
                  type="button"
                  onClick={() => setBusca(busca)}
                  className="rounded-md bg-sidebar px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sidebar-ativo"
                >
                  <span className="mr-1" aria-hidden>
                    ⌕
                  </span>
                  Buscar
                </button>
              </div>
            </div>

            <div className="mb-5 rounded-md border border-neutral-300 bg-white p-3 sm:p-4">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-[#f3f7f5] px-3 py-2 text-[10px] font-medium text-neutral-500 sm:grid-cols-[minmax(0,1fr)_120px_105px]">
                <span>Produto</span>
                <span className="hidden sm:block">Preço Unit.</span>
                <span className="text-right sm:text-left">Ação</span>
              </div>
              <div className="relative mb-2 sm:hidden">
                <img src={iconeBusca} alt="" className="absolute left-3 top-2.5 size-4 opacity-50" />
                <input
                  id="busca-produtos"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar produto"
                  className="w-full rounded-md border border-neutral-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-sidebar"
                />
              </div>
              <ul className="divide-y divide-neutral-200">
                {produtosFiltrados.map((produto) => {
                  const adicionado = carrinho.some((item) => item.id === produto.id);
                  return (
                    <li key={produto.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_120px_105px]">
                      <div className="flex min-w-0 items-center gap-2">
                        <ProdutoIcone produto={produto} />
                        <span className="text-xs font-semibold leading-tight">{produto.nome}</span>
                      </div>
                      <span className="hidden text-xs sm:block">{moeda(produto.precoCentavos)}</span>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs sm:hidden">{moeda(produto.precoCentavos)}</span>
                        <button
                          type="button"
                          onClick={() => adicionarProduto(produto)}
                          className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors ${
                            adicionado ? "bg-[#16a765]" : "bg-sidebar hover:bg-sidebar-ativo"
                          }`}
                        >
                          {adicionado ? "Adicionado" : "＋ Adicionar"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {produtosFiltrados.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-neutral-500">Nenhum produto encontrado.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="titulo-carrinho">
            <h2 id="titulo-carrinho" className="mb-3 text-xl font-bold text-neutral-900">
              Carrinho de Compras
            </h2>
            <div className="rounded-md border border-neutral-300 bg-white p-3 sm:p-4">
              <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_75px_95px_95px_85px_24px] gap-2 bg-[#f3f7f5] px-3 py-2 text-[10px] font-medium text-neutral-500 sm:grid">
                <span>Produto</span>
                <span>Qtd</span>
                <span>Preço Unit.</span>
                <span>Desconto (Item)</span>
                <span>Subtotal</span>
                <span />
              </div>
              {carrinho.length === 0 ? (
                <p className="px-2 py-10 text-center text-sm text-neutral-500">Seu carrinho está vazio.</p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {carrinho.map((item) => (
                    <li key={item.id} className="grid gap-3 px-2 py-3 sm:grid-cols-[minmax(0,1fr)_75px_95px_95px_85px_24px] sm:items-center sm:gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <ProdutoIcone produto={item} />
                        <span className="text-xs font-semibold leading-tight">{item.nome}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => alterarQuantidade(item.id, -1)} className="size-6 rounded bg-neutral-100 text-sm" aria-label={`Diminuir ${item.nome}`}>
                          −
                        </button>
                        <span className="w-5 text-center text-xs">{item.quantidade}</span>
                        <button type="button" onClick={() => alterarQuantidade(item.id, 1)} className="size-6 rounded bg-neutral-100 text-sm" aria-label={`Aumentar ${item.nome}`}>
                          +
                        </button>
                      </div>
                      <span className="text-xs">{moeda(item.precoCentavos)}</span>
                      <span className="text-xs text-[#16a765]">{moeda(item.descontoCentavos)}</span>
                      <span className="text-xs font-medium">{moeda(totalDoItem(item))}</span>
                      <button type="button" onClick={() => removerItem(item.id)} className="justify-self-end rounded bg-red-50 p-1.5 text-red-500 hover:bg-red-100" aria-label={`Remover ${item.nome}`}>
                        <img src={iconeLixeira} alt="" className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>

        <aside className="rounded-md border border-neutral-300 bg-white p-4 sm:p-5">
          <h2 className="border-b border-neutral-300 pb-3 text-xs font-bold">Resumo da Venda</h2>
          <div className="flex items-center justify-between gap-3 border-b border-neutral-300 py-3">
            <div className="flex min-w-0 items-center gap-2 rounded-md bg-[#a40000] px-3 py-2 text-white">
              <img src={iconePerfil} alt="" className="size-5 shrink-0 brightness-0 invert" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[10px] font-semibold">{cliente?.nome ?? "Cliente Indefinido"}</p>
                <p className="text-[9px] opacity-80">{cliente ? "Cliente selecionado" : "CPF não informado"}</p>
              </div>
            </div>
            <button type="button" onClick={() => setModalClienteAberto(true)} className="rounded-md bg-sidebar px-3 py-2 text-[11px] font-semibold text-white hover:bg-sidebar-ativo">
              ✎ Alterar
            </button>
          </div>

          <dl className="space-y-1 py-3 text-[10px]">
            <div className="flex justify-between"><dt>Itens ({carrinho.length})</dt><dd>{moeda(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Desconto (Total)</dt><dd>{moeda(desconto)}</dd></div>
          </dl>
          <div className="flex items-center justify-between rounded-md bg-[#d2e4da] px-3 py-3 text-xs font-bold">
            <span>Total</span>
            <span>{moeda(total)}</span>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-xs font-bold">Forma de pagamento</legend>
            <div className="grid grid-cols-2 gap-2">
              {formasPagamento.map((forma) => (
                <label key={forma.id} className={`relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-[10px] transition-colors ${pagamento === forma.id ? "border-sidebar bg-[#f5faf7]" : "border-neutral-300"}`}>
                  <input type="radio" name="forma-pagamento" value={forma.id} checked={pagamento === forma.id} onChange={() => setPagamento(forma.id)} className="absolute right-2 top-2 accent-sidebar" />
                  <img src={forma.icone} alt="" className="size-4 object-contain" />
                  <span>{forma.nome}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-2">
            <button type="button" onClick={finalizarVenda} className="rounded-md bg-sidebar py-2.5 text-xs font-bold text-white hover:bg-sidebar-ativo">
              Finalizar Venda
            </button>
            <button type="button" onClick={() => setModalCancelamentoAberto(true)} className="rounded-md border border-sidebar py-2.5 text-xs font-bold text-sidebar hover:bg-neutral-50">
              Cancelar Venda
            </button>
          </div>
        </aside>
      </div>

      <ModalSelecionarCliente
        aberto={modalClienteAberto}
        titulo="Selecionar cliente"
        busca={buscaCliente}
        aoSelecionar={(novoCliente) => {
          setCliente(novoCliente);
          setBuscaCliente(novoCliente.nome);
          setModalClienteAberto(false);
        }}
        aoFechar={() => setModalClienteAberto(false)}
      />

      <Dialogo
        aberto={modalCancelamentoAberto}
        titulo="Cancelar venda"
        aoFechar={() => setModalCancelamentoAberto(false)}
      >
        <p className="text-sm text-neutral-700">Tem certeza que deseja cancelar a venda e limpar os dados inseridos?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setModalCancelamentoAberto(false)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
            Voltar
          </button>
          <button type="button" onClick={confirmarCancelamento} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white">
            Confirmar cancelamento
          </button>
        </div>
      </Dialogo>
    </div>
  );
}
