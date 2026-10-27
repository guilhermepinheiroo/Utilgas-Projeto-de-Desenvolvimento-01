import { useMemo, useState } from "react";
import { CampoBusca } from "../components/CampoBusca";
import { Dialogo } from "../components/Dialogo";
import { ModalSelecionarCliente } from "../components/ModalSelecionarCliente";
import { iconeDaCategoria } from "../constants/IconesEstoque";
import { useProdutos } from "../hooks/UseProdutos";
import { useAcao } from "../hooks/UsenAcao";
import { registrarVenda } from "../services/Vendas";
import type { Cliente } from "../types/clientes";
import type { CategoriaProduto, Produto } from "../types/Produtos";
import type { FormaPagamento } from "../types/Vendas";
import { formatarCentavos } from "../utils/FormatacaoMoeda";
import { normalizar } from "../utils/Texto";

import iconeBusca from "../assets/telaclientes/icon-busca.png";
import iconeCartao from "../assets/icon-cartao.png";
import iconeDinheiro from "../assets/telavendas/icon-dinheiro-vivo.png";
import iconePix from "../assets/telavendas/icon-pix.png";
import iconePerfil from "../assets/telavendas/icon-perfil.png";
import iconeLixeira from "../assets/telaclientes/icon-lixeira.png";

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  descontoCentavos: number;
}

const formasPagamento: Array<{ id: FormaPagamento; nome: string; icone: string }> = [
  { id: "pix", nome: "PIX", icone: iconePix },
  { id: "dinheiro", nome: "Dinheiro", icone: iconeDinheiro },
  { id: "credito", nome: "Cartão de Crédito", icone: iconeCartao },
  { id: "debito", nome: "Cartão de Débito", icone: iconeCartao },
];

const totalDoItem = (item: ItemCarrinho) =>
  item.produto.precoCentavos * item.quantidade - item.descontoCentavos;

function ProdutoIcone({ categoria }: { categoria: CategoriaProduto }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-100">
      <img src={iconeDaCategoria(categoria)} alt="" className="size-6 object-contain" />
    </span>
  );
}

function CampoDesconto({
  valorCentavos,
  maximoCentavos,
  aoAlterar,
  rotulo,
}: {
  valorCentavos: number;
  maximoCentavos: number;
  aoAlterar: (centavos: number) => void;
  rotulo: string;
}) {
  const [texto, setTexto] = useState(valorCentavos ? String(valorCentavos / 100) : "");

  return (
    <input
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      value={texto}
      aria-label={rotulo}
      placeholder="0,00"
      onChange={(e) => {
        setTexto(e.target.value);
        const centavos = Math.round(Number(e.target.value.replace(",", ".")) * 100) || 0;
        aoAlterar(Math.min(Math.max(0, centavos), maximoCentavos));
      }}
      className="w-20 rounded border border-neutral-300 px-1.5 py-1 text-xs text-[#16a765]"
    />
  );
}

export function Portaria() {
  const { produtos, carregando, erro: erroProdutos, recarregar } = useProdutos();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | CategoriaProduto>("todos");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pagamento, setPagamento] = useState<FormaPagamento>("pix");
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const venda = useAcao();

  const produtosFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return produtos.filter(
      (produto) =>
        (!termo || normalizar(produto.nome).includes(termo)) &&
        (filtro === "todos" || produto.categoria === filtro)
    );
  }, [produtos, busca, filtro]);

  const subtotal = carrinho.reduce((t, item) => t + item.produto.precoCentavos * item.quantidade, 0);
  const desconto = carrinho.reduce((t, item) => t + item.descontoCentavos, 0);
  const total = subtotal - desconto;

  function adicionarProduto(produto: Produto) {
    setMensagem(null);
    setCarrinho((itens) => {
      const existente = itens.find((item) => item.produto.id === produto.id);
      if (existente) {
        return itens.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: Math.min(item.quantidade + 1, produto.quantidade) }
            : item
        );
      }
      return [...itens, { produto, quantidade: 1, descontoCentavos: 0 }];
    });
  }

  function alterarQuantidade(id: string, delta: number) {
    setCarrinho((itens) =>
      itens
        .map((item) => {
          if (item.produto.id !== id) return item;
          const quantidade = Math.min(Math.max(0, item.quantidade + delta), item.produto.quantidade);
          const maximo = item.produto.precoCentavos * quantidade;
          return { ...item, quantidade, descontoCentavos: Math.min(item.descontoCentavos, maximo) };
        })
        .filter((item) => item.quantidade > 0)
    );
  }

  function alterarDesconto(id: string, centavos: number) {
    setCarrinho((itens) =>
      itens.map((item) => (item.produto.id === id ? { ...item, descontoCentavos: centavos } : item))
    );
  }

  function limpar() {
    setCarrinho([]);
    setCliente(null);
    setPagamento("pix");
  }

  async function finalizarVenda() {
    if (carrinho.length === 0) {
      setMensagem("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    let numero = 0;
    let totalVenda = 0;
    const ok = await venda.executar(async () => {
      const registrada = await registrarVenda({
        origem: "portaria",
        clienteId: cliente?.id ?? null,
        enderecoId: null,
        pagamento,
        itens: carrinho.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          descontoCentavos: item.descontoCentavos,
        })),
      });
      numero = registrada.numero;
      totalVenda = registrada.totalCentavos;
    });

    if (ok) {
      setMensagem(`Venda #${numero} registrada: ${formatarCentavos(totalVenda)}.`);
      limpar();
      recarregar(); // estoque mudou
    }
  }

  return (
    <div className="min-h-full bg-[#f3f6f4] p-4 text-neutral-800 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Vendas na portaria</h1>
        <CampoBusca
          valor={busca}
          aoAlterar={setBusca}
          placeholder="Buscar produto"
          rotuloAcessivel="Buscar produto"
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

      {(venda.erro || erroProdutos) && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{venda.erro ?? erroProdutos}</span>
          {erroProdutos && (
            <button type="button" onClick={recarregar} className="font-semibold underline">
              Tentar de novo
            </button>
          )}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.85fr)]">
        <div className="min-w-0">
          <section aria-labelledby="titulo-produtos">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="titulo-produtos" className="text-xl font-bold text-neutral-900">
                Produtos
              </h2>
              <select
                aria-label="Filtrar produtos"
                value={filtro}
                onChange={(event) => setFiltro(event.target.value as typeof filtro)}
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium"
              >
                <option value="todos">Todos</option>
                <option value="gas">Gás</option>
                <option value="agua">Água</option>
                <option value="acessorio">Acessórios</option>
              </select>
            </div>

            <div className="mb-5 rounded-md border border-neutral-300 bg-white p-3 sm:p-4">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-[#f3f7f5] px-3 py-2 text-[10px] font-medium text-neutral-500 sm:grid-cols-[minmax(0,1fr)_90px_120px_105px]">
                <span>Produto</span>
                <span className="hidden sm:block">Estoque</span>
                <span className="hidden sm:block">Preço Unit.</span>
                <span className="text-right sm:text-left">Ação</span>
              </div>
              <ul className={`divide-y divide-neutral-200 ${carregando ? "opacity-50" : ""}`}>
                {produtosFiltrados.map((produto) => {
                  const noCarrinho = carrinho.find((item) => item.produto.id === produto.id);
                  const esgotado = produto.quantidade === 0;
                  const limite = noCarrinho !== undefined && noCarrinho.quantidade >= produto.quantidade;
                  return (
                    <li
                      key={produto.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_90px_120px_105px]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <ProdutoIcone categoria={produto.categoria} />
                        <span className="text-xs font-semibold leading-tight">{produto.nome}</span>
                      </div>
                      <span
                        className={`hidden text-xs sm:block ${
                          produto.nivelEstoque !== "normal" ? "font-semibold text-red-600" : ""
                        }`}
                      >
                        {produto.quantidade} un
                      </span>
                      <span className="hidden text-xs sm:block">
                        {formatarCentavos(produto.precoCentavos)}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs sm:hidden">{formatarCentavos(produto.precoCentavos)}</span>
                        <button
                          type="button"
                          disabled={esgotado || limite}
                          onClick={() => adicionarProduto(produto)}
                          className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            noCarrinho ? "bg-[#16a765]" : "bg-sidebar hover:bg-sidebar-ativo"
                          }`}
                        >
                          {esgotado ? "Esgotado" : noCarrinho ? `+1 (${noCarrinho.quantidade})` : "＋ Adicionar"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!carregando && produtosFiltrados.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-neutral-500">
                  <img src={iconeBusca} alt="" className="mx-auto mb-2 size-5 opacity-40" />
                  Nenhum produto encontrado.
                </p>
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
                <span>Desconto (R$)</span>
                <span>Subtotal</span>
                <span />
              </div>
              {carrinho.length === 0 ? (
                <p className="px-2 py-10 text-center text-sm text-neutral-500">Seu carrinho está vazio.</p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {carrinho.map((item) => (
                    <li
                      key={item.produto.id}
                      className="grid gap-3 px-2 py-3 sm:grid-cols-[minmax(0,1fr)_75px_95px_95px_85px_24px] sm:items-center sm:gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <ProdutoIcone categoria={item.produto.categoria} />
                        <span className="text-xs font-semibold leading-tight">{item.produto.nome}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.produto.id, -1)}
                          className="size-6 rounded bg-neutral-100 text-sm"
                          aria-label={`Diminuir ${item.produto.nome}`}
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.produto.id, 1)}
                          disabled={item.quantidade >= item.produto.quantidade}
                          className="size-6 rounded bg-neutral-100 text-sm disabled:opacity-40"
                          aria-label={`Aumentar ${item.produto.nome}`}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs">{formatarCentavos(item.produto.precoCentavos)}</span>
                      <CampoDesconto
                        valorCentavos={item.descontoCentavos}
                        maximoCentavos={item.produto.precoCentavos * item.quantidade}
                        aoAlterar={(centavos) => alterarDesconto(item.produto.id, centavos)}
                        rotulo={`Desconto em ${item.produto.nome}`}
                      />
                      <span className="text-xs font-medium">{formatarCentavos(totalDoItem(item))}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCarrinho((itens) => itens.filter((i) => i.produto.id !== item.produto.id))
                        }
                        className="justify-self-end rounded bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                        aria-label={`Remover ${item.produto.nome}`}
                      >
                        <img src={iconeLixeira} alt="" className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <aside className="rounded-md border border-neutral-300 bg-white p-4 sm:p-5">
          <h2 className="border-b border-neutral-300 pb-3 text-xs font-bold">Resumo da Venda</h2>
          <div className="flex items-center justify-between gap-3 border-b border-neutral-300 py-3">
            <div className="flex min-w-0 items-center gap-2 rounded-md bg-[#a40000] px-3 py-2 text-white">
              <img src={iconePerfil} alt="" className="size-5 shrink-0 brightness-0 invert" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[10px] font-semibold">{cliente?.nome ?? "Cliente Indefinido"}</p>
                <p className="text-[9px] opacity-80">
                  {cliente ? "Cliente selecionado" : "Venda sem cadastro (opcional)"}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {cliente && (
                <button
                  type="button"
                  onClick={() => setCliente(null)}
                  className="rounded-md border border-neutral-300 px-2 py-2 text-[11px]"
                  aria-label="Remover cliente"
                >
                  ×
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalClienteAberto(true)}
                className="rounded-md bg-sidebar px-3 py-2 text-[11px] font-semibold text-white hover:bg-sidebar-ativo"
              >
                ✎ {cliente ? "Alterar" : "Escolher"}
              </button>
            </div>
          </div>

          <dl className="space-y-1 py-3 text-[10px]">
            <div className="flex justify-between">
              <dt>Itens ({carrinho.reduce((t, i) => t + i.quantidade, 0)})</dt>
              <dd>{formatarCentavos(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Desconto (Total)</dt>
              <dd>{formatarCentavos(desconto)}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between rounded-md bg-[#d2e4da] px-3 py-3 text-xs font-bold">
            <span>Total</span>
            <span>{formatarCentavos(total)}</span>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-xs font-bold">Forma de pagamento</legend>
            <div className="grid grid-cols-2 gap-2">
              {formasPagamento.map((forma) => (
                <label
                  key={forma.id}
                  className={`relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-[10px] transition-colors ${
                    pagamento === forma.id ? "border-sidebar bg-[#f5faf7]" : "border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="forma-pagamento"
                    value={forma.id}
                    checked={pagamento === forma.id}
                    onChange={() => setPagamento(forma.id)}
                    className="absolute right-2 top-2 accent-sidebar"
                  />
                  <img src={forma.icone} alt="" className="size-4 object-contain" />
                  <span>{forma.nome}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => void finalizarVenda()}
              disabled={venda.executando || carrinho.length === 0}
              className="rounded-md bg-sidebar py-2.5 text-xs font-bold text-white hover:bg-sidebar-ativo disabled:opacity-50"
            >
              {venda.executando ? "Registrando..." : "Finalizar Venda"}
            </button>
            <button
              type="button"
              onClick={() => setModalCancelamentoAberto(true)}
              disabled={venda.executando || (carrinho.length === 0 && !cliente)}
              className="rounded-md border border-sidebar py-2.5 text-xs font-bold text-sidebar hover:bg-neutral-50 disabled:opacity-50"
            >
              Limpar Venda
            </button>
          </div>
        </aside>
      </div>

      <ModalSelecionarCliente
        aberto={modalClienteAberto}
        titulo="Selecionar cliente"
        aoSelecionar={(novoCliente) => {
          setCliente(novoCliente);
          setModalClienteAberto(false);
        }}
        aoFechar={() => setModalClienteAberto(false)}
      />

      <Dialogo
        aberto={modalCancelamentoAberto}
        titulo="Limpar venda"
        aoFechar={() => setModalCancelamentoAberto(false)}
      >
        <p className="text-sm text-neutral-700">
          Tem certeza que deseja limpar o carrinho e o cliente selecionado? Nada foi registrado ainda.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setModalCancelamentoAberto(false)}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => {
              setModalCancelamentoAberto(false);
              limpar();
              setMensagem("Venda descartada.");
            }}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Limpar
          </button>
        </div>
      </Dialogo>
    </div>
  );
}
