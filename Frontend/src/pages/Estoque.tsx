import { useCallback, useEffect, useMemo, useState } from "react";
import { CampoBusca } from "../components/CampoBusca";
import { Dialogo } from "../components/Dialogo";
import { mensagemDeErro } from "../services/Api";
import {
  buscarMovimentacoesEstoque,
  buscarProdutosEstoque,
  buscarResumoEstoqueGestao,
  criarProdutoEstoque,
  editarProdutoEstoque,
  excluirProdutoEstoque,
  registrarMovimentacao,
  registrarTrocaVazio,
} from "../services/EstoqueGestao";
import type {
  CategoriaProduto,
  MovimentacaoEstoque,
  ProdutoEstoque,
  ProdutoInput,
  ResumoEstoqueGestao,
  TipoMovimentacaoEstoque,
  TipoTrocaVazio,
} from "../types/EstoqueGestao";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const categorias: Array<{ id: CategoriaProduto; nome: string }> = [
  { id: "gas", nome: "Gás GLP" },
  { id: "agua", nome: "Água Mineral" },
  { id: "outros", nome: "Acessórios / Outros" },
];

type Modal = "produto" | "entrada" | "saida" | "troca" | null;

function statusProduto(produto: ProdutoEstoque) {
  if (produto.quantidade === 0 || produto.quantidade <= produto.estoqueMinimo / 2) {
    return { texto: "Crítico", classe: "bg-red-100 text-red-700" };
  }
  if (produto.quantidade <= produto.estoqueMinimo) {
    return { texto: "Baixo", classe: "bg-orange-100 text-orange-700" };
  }
  return { texto: "Normal", classe: "bg-green-100 text-green-700" };
}

function erroInicial(erro: unknown) {
  return mensagemDeErro(erro);
}

export function Estoque() {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [resumo, setResumo] = useState<ResumoEstoqueGestao | null>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<"todos" | CategoriaProduto>("todos");
  const [modal, setModal] = useState<Modal>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoEstoque | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [lista, resumoAtual, movimentos] = await Promise.all([
        buscarProdutosEstoque({ busca, categoria: categoria === "todos" ? undefined : categoria }),
        buscarResumoEstoqueGestao(),
        buscarMovimentacoesEstoque(),
      ]);
      setProdutos(lista);
      setResumo(resumoAtual);
      setMovimentacoes(movimentos);
      setErro(null);
    } catch (e) {
      setErro(erroInicial(e));
    } finally {
      setCarregando(false);
    }
  }, [busca, categoria]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregar();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [carregar]);

  const alertas = useMemo(
    () => produtos.filter((produto) => produto.quantidade <= produto.estoqueMinimo),
    [produtos]
  );

  async function removerProduto() {
    if (!produtoSelecionado || !window.confirm(`Excluir o produto "${produtoSelecionado.nome}"?`)) return;
    try {
      await excluirProdutoEstoque(produtoSelecionado.id);
      setMensagem("Produto excluído.");
      setProdutoSelecionado(null);
      await carregar();
    } catch (e) {
      setErro(erroInicial(e));
    }
  }

  function imprimirInventario() {
    const janela = window.open("", "_blank", "noopener,noreferrer");
    if (!janela) {
      setErro("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.");
      return;
    }

    const linhas = produtos
      .map(
        (produto) =>
          `<tr><td>${produto.nome}</td><td>${produto.categoria}</td><td>${produto.quantidade}</td><td>${moeda.format(produto.precoCentavos / 100)}</td></tr>`
      )
      .join("");

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Inventário de Estoque</title>
          <style>
            body { font-family: Arial, sans-serif; color: #17231d; padding: 32px; }
            h1 { margin-bottom: 4px; }
            p { color: #66736b; margin-top: 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 24px; }
            th, td { border: 1px solid #d5ddd8; padding: 10px; text-align: left; }
            th { background: #eaf1ed; }
          </style>
        </head>
        <body>
          <h1>Inventário de Estoque</h1>
          <p>Emitido em ${new Date().toLocaleString("pt-BR")}</p>
          <table>
            <thead><tr><th>Produto</th><th>Categoria</th><th>Quantidade</th><th>Preço unitário</th></tr></thead>
            <tbody>${linhas || "<tr><td colspan='4'>Nenhum produto carregado.</td></tr>"}</tbody>
          </table>
        </body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    janela.print();
  }

  return (
    <div className="min-h-full bg-[#f3f6f4] p-5 text-neutral-800 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">Controle de Estoque</h1>
        <CampoBusca
          valor={busca}
          aoAlterar={setBusca}
          placeholder="Buscar produto ou tipo..."
          rotuloAcessivel="Buscar produto ou tipo"
        />
      </header>

      {erro && (
        <div role="alert" className="mb-5 flex flex-wrap justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{erro}</span>
          <button type="button" onClick={() => void carregar()} className="font-semibold underline">Tentar novamente</button>
        </div>
      )}
      {mensagem && <p role="status" className="mb-5 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{mensagem}</p>}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total em Estoque", resumo ? `${resumo.total} un` : "—"],
          ["Entradas (Mês)", resumo ? `${resumo.entradasMes} un` : "—"],
          ["Saídas (Mês)", resumo ? `${resumo.saidasMes} un` : "—"],
          ["Baixo Estoque", resumo ? `${resumo.baixoEstoque} itens` : "—"],
        ].map(([titulo, valor]) => (
          <article key={titulo} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-neutral-500">{titulo}</p>
            <strong className="mt-2 block text-2xl text-neutral-900">{valor}</strong>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <section className="rounded-lg border border-neutral-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
            <div>
              <h2 className="font-bold text-neutral-900">Itens em Estoque</h2>
              <p className="text-[11px] text-neutral-400">Dados fornecidos pelo backend</p>
            </div>
            <div className="flex gap-2">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value as typeof categoria)} className="rounded-md border border-neutral-200 px-3 py-2 text-xs">
                <option value="todos">Todos</option>
                {categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
              <button type="button" onClick={() => { setProdutoSelecionado(null); setModal("produto"); }} className="rounded-md bg-sidebar px-3 py-2 text-xs font-semibold text-white">＋ Novo Item</button>
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-[#f3f7f5] text-[10px] text-neutral-500"><tr>{["Produto", "Tipo", "Qtd.", "Preço Unit.", "Status", "Ações"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {produtos.map((produto) => {
                  const status = statusProduto(produto);
                  return <tr key={produto.id}>
                    <td className="px-4 py-3 font-semibold">{produto.nome}</td>
                    <td className="px-4 py-3 uppercase text-neutral-500">{produto.categoria}</td>
                    <td className="px-4 py-3 font-bold">{produto.quantidade}</td>
                    <td className="px-4 py-3">{moeda.format(produto.precoCentavos / 100)}</td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${status.classe}`}>{status.texto}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button type="button" title="Editar" onClick={() => { setProdutoSelecionado(produto); setModal("produto"); }}>✎</button><button type="button" title="Excluir" onClick={() => { setProdutoSelecionado(produto); void removerProduto(); }}>⌫</button></div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {!carregando && produtos.length === 0 && <p className="p-10 text-center text-sm text-neutral-500">Nenhum produto encontrado. Conecte o backend ou crie um novo item.</p>}
        </section>

        <aside className="grid gap-6">
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Alertas de Estoque <span className="float-right rounded-full bg-red-100 px-2 py-1 text-[10px] text-red-700">{alertas.length} ativos</span></h2>
            {alertas.length === 0 ? <p className="text-sm text-neutral-500">Nenhum alerta ativo.</p> : <ul className="space-y-2">{alertas.map((produto) => <li key={produto.id} className="rounded border border-orange-200 bg-orange-50 p-3 text-xs"><strong>{produto.nome}</strong><br />Restam {produto.quantidade} unidades. Mínimo: {produto.estoqueMinimo}.</li>)}</ul>}
          </section>
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Ações Rápidas</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModal("entrada")} className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50">＋<br />Registrar Entrada</button>
              <button type="button" onClick={() => setModal("saida")} className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50">−<br />Registrar Saída</button>
              <button type="button" onClick={() => setModal("troca")} className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50">⇄<br />Troca de Vazio</button>
              <button type="button" onClick={imprimirInventario} className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50">▣<br />Inventário</button>
            </div>
          </section>
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Movimentações</h2>
            <ul className="space-y-2">{movimentacoes.slice(0, 7).map((item) => <li key={item.id} className="flex justify-between gap-2 text-xs"><span>{item.tipo === "entrada" ? "↓" : "↑"} {item.produtoNome}</span><strong>{item.quantidade}</strong></li>)}</ul>
            {movimentacoes.length === 0 && <p className="text-sm text-neutral-500">Nenhuma movimentação carregada.</p>}
          </section>
        </aside>
      </div>

      <ModalProduto aberto={modal === "produto"} produto={produtoSelecionado} aoFechar={() => setModal(null)} aoSalvar={async (input) => { if (produtoSelecionado) await editarProdutoEstoque(produtoSelecionado.id, input); else await criarProdutoEstoque(input); setModal(null); setMensagem("Produto salvo com sucesso."); await carregar(); }} />
      <ModalMovimentacao aberto={modal === "entrada" || modal === "saida"} tipoInicial={modal === "saida" ? "saida" : "entrada"} produtos={produtos} aoFechar={() => setModal(null)} aoSalvar={async (input) => { await registrarMovimentacao(input); setModal(null); setMensagem("Movimentação registrada."); await carregar(); }} />
      <ModalTroca aberto={modal === "troca"} aoFechar={() => setModal(null)} aoSalvar={async (input) => { await registrarTrocaVazio(input); setModal(null); setMensagem("Troca de vazio registrada."); await carregar(); }} />
    </div>
  );
}

function ModalProduto({ aberto, produto, aoFechar, aoSalvar }: { aberto: boolean; produto: ProdutoEstoque | null; aoFechar: () => void; aoSalvar: (input: ProdutoInput) => Promise<void> }) {
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoria, setCategoria] = useState<CategoriaProduto>(produto?.categoria ?? "gas");
  const [preco, setPreco] = useState(produto ? String(produto.precoCentavos / 100) : "");
  const [inicial, setInicial] = useState(produto ? String(produto.quantidade) : "");
  const [minimo, setMinimo] = useState(produto ? String(produto.estoqueMinimo) : "");
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => { if (!nome.trim() || !preco || !inicial || !minimo) return; setSalvando(true); try { await aoSalvar({ nome: nome.trim(), categoria, precoCentavos: Math.round(Number(preco) * 100), estoqueInicial: Number(inicial), estoqueMinimo: Number(minimo) }); } finally { setSalvando(false); } };
  return <Dialogo aberto={aberto} titulo={produto ? "Editar produto" : "Criando novo produto"} aoFechar={aoFechar}><div className="grid gap-4"><label className="grid gap-1 text-sm font-semibold">Categoria<select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaProduto)} className="rounded border p-2 font-normal">{categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Nome do Produto<input value={nome} onChange={(e) => setNome(e.target.value)} className="rounded border p-2 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">Preço de Venda (R$)<input type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} className="rounded border p-2 font-normal" /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-semibold">Estoque Inicial<input type="number" min="0" value={inicial} onChange={(e) => setInicial(e.target.value)} className="rounded border p-2 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">Estoque Mínimo<input type="number" min="0" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="rounded border p-2 font-normal" /></label></div><button type="button" disabled={salvando} onClick={() => void salvar()} className="rounded-md bg-sidebar px-4 py-2 font-semibold text-white disabled:opacity-50">{salvando ? "Salvando..." : "＋ Salvar"}</button></div></Dialogo>;
}

function ModalMovimentacao({ aberto, tipoInicial, produtos, aoFechar, aoSalvar }: { aberto: boolean; tipoInicial: TipoMovimentacaoEstoque; produtos: ProdutoEstoque[]; aoFechar: () => void; aoSalvar: (input: { produtoId: string; quantidade: number; tipo: TipoMovimentacaoEstoque }) => Promise<void> }) {
  const [tipo, setTipo] = useState<TipoMovimentacaoEstoque>(tipoInicial);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const salvar = async () => { if (!produtoId || Number(quantidade) <= 0) return; if (tipo === "saida" && !window.confirm("Confirmar saída do estoque?")) return; await aoSalvar({ tipo, produtoId, quantidade: Number(quantidade) }); };
  return <Dialogo aberto={aberto} titulo={tipo === "entrada" ? "Registrar entrada" : "Registrar saída"} aoFechar={aoFechar}><div className="grid gap-4"><select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className="rounded border p-2"><option value="">Selecione o produto</option>{produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}</select><select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimentacaoEstoque)} className="rounded border p-2"><option value="entrada">Entrada</option><option value="saida">Saída</option></select><input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Quantidade" className="rounded border p-2" /><button type="button" onClick={() => void salvar()} className="rounded bg-sidebar px-4 py-2 font-semibold text-white">Registrar</button></div></Dialogo>;
}

function ModalTroca({ aberto, aoFechar, aoSalvar }: { aberto: boolean; aoFechar: () => void; aoSalvar: (input: { tipo: TipoTrocaVazio; quantidade: number }) => Promise<void> }) {
  const [tipo, setTipo] = useState<TipoTrocaVazio>("gas");
  const [quantidade, setQuantidade] = useState("");
  const salvar = async () => { if (Number(quantidade) <= 0 || !window.confirm("Confirmar troca de vazio?")) return; await aoSalvar({ tipo, quantidade: Number(quantidade) }); };
  return <Dialogo aberto={aberto} titulo="Troca de vazio" aoFechar={aoFechar}><div className="grid gap-4"><p className="text-sm text-neutral-600">Registre a quantidade de cascos/galões devolvidos na troca.</p><select value={tipo} onChange={(e) => setTipo(e.target.value as TipoTrocaVazio)} className="rounded border p-2"><option value="gas">Casco de gás</option><option value="agua">Galão de água</option></select><input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Quantidade" className="rounded border p-2" /><button type="button" onClick={() => void salvar()} className="rounded bg-sidebar px-4 py-2 font-semibold text-white">Registrar troca</button></div></Dialogo>;
}
