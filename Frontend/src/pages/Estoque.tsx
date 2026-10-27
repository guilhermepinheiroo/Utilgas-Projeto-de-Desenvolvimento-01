import { useState } from "react";
import { CampoBusca } from "../components/CampoBusca";
import { Dialogo } from "../components/Dialogo";
import { rotulosCategoria } from "../constants/ProdutosEstoque";
import { useConsulta } from "../hooks/UseConsulta";
import { useDebounce } from "../hooks/UseDebounce";
import { useAcao } from "../hooks/UsenAcao";
import {
  buscarMovimentacoesEstoque,
  buscarResumoEstoqueGestao,
  registrarMovimentacao,
  registrarTrocaVazio,
} from "../services/EstoqueGestao";
import { buscarProdutos, criarProduto, editarProduto, excluirProduto } from "../services/Produtos";
import type {
  MovimentacaoEstoque,
  MovimentacaoInput,
  TipoEstoque,
  TipoMovimentacaoEstoque,
  TrocaVazioInput,
} from "../types/EstoqueGestao";
import type { CategoriaProduto, NivelEstoque, Produto, ProdutoInput } from "../types/Produtos";
import { formatarDataHora } from "../utils/FormataData";
import { formatarCentavos } from "../utils/FormatacaoMoeda";

type Modal =
  | { tipo: "produto"; produto: Produto | null }
  | { tipo: "movimentacao"; movimento: TipoMovimentacaoEstoque }
  | { tipo: "troca" }
  | { tipo: "excluir"; produto: Produto }
  | null;

const categorias = Object.entries(rotulosCategoria) as [CategoriaProduto, string][];

const estiloNivel: Record<NivelEstoque, { texto: string; classe: string }> = {
  critico: { texto: "Crítico", classe: "bg-red-100 text-red-700" },
  baixo: { texto: "Baixo", classe: "bg-orange-100 text-orange-700" },
  normal: { texto: "Normal", classe: "bg-green-100 text-green-700" },
};

const rotuloOrigem: Record<MovimentacaoEstoque["origem"], string> = {
  compra: "Compra",
  ajuste: "Ajuste",
  troca_vazio: "Troca de vazio",
  venda: "Venda",
  cancelamento: "Cancelamento",
};

const classeCampo = "rounded border border-neutral-300 p-2 text-sm";

function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function Estoque() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<"todos" | CategoriaProduto>("todos");
  const [modal, setModal] = useState<Modal>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  const termo = useDebounce(busca);
  const produtosConsulta = useConsulta(
    () => buscarProdutos({ busca: termo, categoria: categoria === "todos" ? undefined : categoria }),
    `${termo}|${categoria}|${versao}`
  );
  const resumoConsulta = useConsulta(buscarResumoEstoqueGestao, `resumo|${versao}`);
  const movConsulta = useConsulta(() => buscarMovimentacoesEstoque(30), `mov|${versao}`);
  const todosConsulta = useConsulta(() => buscarProdutos(), `todos|${versao}`);

  const produtos = produtosConsulta.dados ?? [];
  const todosProdutos = todosConsulta.dados ?? [];
  const resumo = resumoConsulta.dados;
  const movimentacoes = movConsulta.dados ?? [];
  const erro = produtosConsulta.erro ?? resumoConsulta.erro ?? movConsulta.erro ?? erroAcao;

  const alertas = todosProdutos.filter((produto) => produto.quantidade <= produto.estoqueMinimo);

  function concluir(texto: string) {
    setModal(null);
    setMensagem(texto);
    setErroAcao(null);
    setVersao((n) => n + 1);
  }

  function imprimirInventario() {
    const janela = window.open("", "_blank");
    if (!janela) {
      setErroAcao("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.");
      return;
    }

    const linhas = todosProdutos
      .map(
        (p) =>
          `<tr><td>${escaparHtml(p.nome)}</td><td>${rotulosCategoria[p.categoria]}</td><td>${p.quantidade}</td><td>${p.controlaVazio ? p.vazios : "—"}</td><td>${formatarCentavos(p.precoCentavos)}</td></tr>`
      )
      .join("");

    janela.document.write(`<!doctype html>
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
            <thead><tr><th>Produto</th><th>Categoria</th><th>Cheios</th><th>Vazios</th><th>Preço unitário</th></tr></thead>
            <tbody>${linhas || "<tr><td colspan='5'>Nenhum produto cadastrado.</td></tr>"}</tbody>
          </table>
        </body>
      </html>`);
    janela.document.close();
    janela.focus();
    janela.print();
  }

  const cards: [string, string][] = [
    ["Cheios em Estoque", resumo ? `${resumo.total} un` : "—"],
    ["Vasilhames Vazios", resumo ? `${resumo.vazios} un` : "—"],
    ["Entradas (Mês)", resumo ? `${resumo.entradasMes} un` : "—"],
    ["Saídas (Mês)", resumo ? `${resumo.saidasMes} un` : "—"],
    ["Baixo Estoque", resumo ? `${resumo.baixoEstoque} itens` : "—"],
  ];

  return (
    <div className="min-h-full bg-[#f3f6f4] p-5 text-neutral-800 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">Controle de Estoque</h1>
        <CampoBusca
          valor={busca}
          aoAlterar={setBusca}
          placeholder="Buscar produto..."
          rotuloAcessivel="Buscar produto"
        />
      </header>

      {erro && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{erro}</span>
          <button
            type="button"
            onClick={() => {
              setErroAcao(null);
              setVersao((n) => n + 1);
            }}
            className="font-semibold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {mensagem && (
        <p
          role="status"
          className="mb-5 flex justify-between rounded-md bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {mensagem}
          <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar mensagem">
            ×
          </button>
        </p>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([titulo, valor]) => (
          <article key={titulo} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-neutral-500">{titulo}</p>
            <strong className="mt-2 block text-2xl text-neutral-900">{valor}</strong>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <section className="rounded-lg border border-neutral-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
            <h2 className="font-bold text-neutral-900">Itens em Estoque</h2>
            <div className="flex gap-2">
              <select
                aria-label="Filtrar por categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as typeof categoria)}
                className="rounded-md border border-neutral-200 px-3 py-2 text-xs"
              >
                <option value="todos">Todos</option>
                {categorias.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setModal({ tipo: "produto", produto: null })}
                className="rounded-md bg-sidebar px-3 py-2 text-xs font-semibold text-white"
              >
                ＋ Novo Item
              </button>
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#f3f7f5] text-[10px] text-neutral-500">
                <tr>
                  {["Produto", "Tipo", "Cheios", "Vazios", "Preço Unit.", "Status", "Ações"].map(
                    (item) => (
                      <th key={item} className="px-4 py-3">
                        {item}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-neutral-100 transition-opacity ${
                  produtosConsulta.carregando ? "opacity-50" : ""
                }`}
              >
                {produtos.map((produto) => {
                  const status = estiloNivel[produto.nivelEstoque];
                  return (
                    <tr key={produto.id}>
                      <td className="px-4 py-3 font-semibold">{produto.nome}</td>
                      <td className="px-4 py-3 text-neutral-500">{rotulosCategoria[produto.categoria]}</td>
                      <td className="px-4 py-3 font-bold">{produto.quantidade}</td>
                      <td className="px-4 py-3">{produto.controlaVazio ? produto.vazios : "—"}</td>
                      <td className="px-4 py-3">{formatarCentavos(produto.precoCentavos)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-1 text-[10px] font-semibold ${status.classe}`}>
                          {status.texto}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            title="Editar"
                            aria-label={`Editar ${produto.nome}`}
                            onClick={() => setModal({ tipo: "produto", produto })}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            title="Excluir"
                            aria-label={`Excluir ${produto.nome}`}
                            onClick={() => setModal({ tipo: "excluir", produto })}
                          >
                            ⌫
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!produtosConsulta.carregando && produtos.length === 0 && (
            <p className="p-10 text-center text-sm text-neutral-500">Nenhum produto encontrado.</p>
          )}
        </section>

        <aside className="grid gap-6">
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-bold">
              Alertas de Estoque{" "}
              <span className="float-right rounded-full bg-red-100 px-2 py-1 text-[10px] text-red-700">
                {alertas.length} ativos
              </span>
            </h2>
            {alertas.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhum alerta ativo.</p>
            ) : (
              <ul className="space-y-2">
                {alertas.map((produto) => (
                  <li key={produto.id} className="rounded border border-orange-200 bg-orange-50 p-3 text-xs">
                    <strong>{produto.nome}</strong>
                    <br />
                    Restam {produto.quantidade} unidades. Mínimo: {produto.estoqueMinimo}.
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Ações Rápidas</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModal({ tipo: "movimentacao", movimento: "entrada" })}
                className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50"
              >
                ＋<br />
                Registrar Entrada
              </button>
              <button
                type="button"
                onClick={() => setModal({ tipo: "movimentacao", movimento: "saida" })}
                className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50"
              >
                −<br />
                Registrar Saída
              </button>
              <button
                type="button"
                onClick={() => setModal({ tipo: "troca" })}
                className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50"
              >
                ⇄<br />
                Troca de Vazio
              </button>
              <button
                type="button"
                onClick={imprimirInventario}
                className="rounded-md border p-4 text-xs font-semibold hover:bg-neutral-50"
              >
                ▣<br />
                Inventário
              </button>
            </div>
          </section>
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Movimentações</h2>
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {movimentacoes.map((item) => {
                const { data, hora } = formatarDataHora(item.dataHora);
                return (
                  <li key={item.id} className="flex justify-between gap-2 text-xs">
                    <span>
                      <span className={item.tipo === "entrada" ? "text-green-700" : "text-red-600"}>
                        {item.tipo === "entrada" ? "↓" : "↑"}
                      </span>{" "}
                      {item.produtoNome}
                      {item.tipoEstoque === "vazio" && " (vazio)"}
                      <span className="block text-[10px] text-neutral-400">
                        {rotuloOrigem[item.origem]} · {data} {hora}
                      </span>
                    </span>
                    <strong>{item.quantidade}</strong>
                  </li>
                );
              })}
            </ul>
            {!movConsulta.carregando && movimentacoes.length === 0 && (
              <p className="text-sm text-neutral-500">Nenhuma movimentação registrada.</p>
            )}
          </section>
        </aside>
      </div>

      <Dialogo
        aberto={modal?.tipo === "produto"}
        titulo={modal?.tipo === "produto" && modal.produto ? "Editar produto" : "Novo produto"}
        aoFechar={() => setModal(null)}
      >
        {modal?.tipo === "produto" && (
          <FormProduto
            key={modal.produto?.id ?? "novo"}
            produto={modal.produto}
            aoSalvar={async (input) => {
              if (modal.produto) await editarProduto(modal.produto.id, input);
              else await criarProduto(input);
              concluir("Produto salvo com sucesso.");
            }}
          />
        )}
      </Dialogo>

      <Dialogo
        aberto={modal?.tipo === "movimentacao"}
        titulo={
          modal?.tipo === "movimentacao" && modal.movimento === "saida"
            ? "Registrar saída"
            : "Registrar entrada"
        }
        aoFechar={() => setModal(null)}
      >
        {modal?.tipo === "movimentacao" && (
          <FormMovimentacao
            key={modal.movimento}
            tipoInicial={modal.movimento}
            produtos={todosProdutos}
            aoSalvar={async (input) => {
              await registrarMovimentacao(input);
              concluir("Movimentação registrada.");
            }}
          />
        )}
      </Dialogo>

      <Dialogo aberto={modal?.tipo === "troca"} titulo="Troca de vazio" aoFechar={() => setModal(null)}>
        {modal?.tipo === "troca" && (
          <FormTroca
            produtos={todosProdutos.filter((p) => p.controlaVazio)}
            aoSalvar={async (input) => {
              await registrarTrocaVazio(input);
              concluir("Troca de vazio registrada.");
            }}
          />
        )}
      </Dialogo>

      <Dialogo aberto={modal?.tipo === "excluir"} titulo="Excluir produto" aoFechar={() => setModal(null)}>
        {modal?.tipo === "excluir" && (
          <ConfirmarExclusao
            produto={modal.produto}
            aoCancelar={() => setModal(null)}
            aoConfirmar={async () => {
              await excluirProduto(modal.produto.id);
              concluir("Produto removido da lista.");
            }}
          />
        )}
      </Dialogo>
    </div>
  );
}

function BotaoSalvar({ executando, texto }: { executando: boolean; texto: string }) {
  return (
    <button
      type="submit"
      disabled={executando}
      className="rounded-md bg-sidebar px-4 py-2 font-semibold text-white disabled:opacity-50"
    >
      {executando ? "Salvando..." : texto}
    </button>
  );
}

function MensagemErro({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <p role="alert" className="text-sm text-red-600">
      {erro}
    </p>
  );
}

function FormProduto({
  produto,
  aoSalvar,
}: {
  produto: Produto | null;
  aoSalvar: (input: ProdutoInput) => Promise<void>;
}) {
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoria, setCategoria] = useState<CategoriaProduto>(produto?.categoria ?? "gas");
  const [preco, setPreco] = useState(produto ? String(produto.precoCentavos / 100) : "");
  const [inicial, setInicial] = useState("0");
  const [minimo, setMinimo] = useState(produto ? String(produto.estoqueMinimo) : "0");
  const { executando, erro, executar } = useAcao();

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nome.trim() || preco === "" || Number(preco) < 0) return;
    void executar(() =>
      aoSalvar({
        nome: nome.trim(),
        categoria,
        precoCentavos: Math.round(Number(preco.replace(",", ".")) * 100),
        estoqueMinimo: Math.max(0, Number(minimo) || 0),
        estoqueInicial: produto ? undefined : Math.max(0, Number(inicial) || 0),
      })
    );
  }

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <label className="grid gap-1 text-sm font-semibold">
        Categoria
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaProduto)}
          className={`${classeCampo} font-normal`}
        >
          {categorias.map(([id, nomeCategoria]) => (
            <option key={id} value={id}>
              {nomeCategoria}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Nome do Produto
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={`${classeCampo} font-normal`}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Preço de Venda (R$)
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          className={`${classeCampo} font-normal`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {!produto && (
          <label className="grid gap-1 text-sm font-semibold">
            Estoque Inicial
            <input
              type="number"
              min="0"
              value={inicial}
              onChange={(e) => setInicial(e.target.value)}
              className={`${classeCampo} font-normal`}
            />
          </label>
        )}
        <label className="grid gap-1 text-sm font-semibold">
          Estoque Mínimo
          <input
            type="number"
            min="0"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            className={`${classeCampo} font-normal`}
          />
        </label>
      </div>
      {produto && (
        <p className="text-xs text-neutral-500">
          A quantidade muda pelas entradas e saídas.
        </p>
      )}
      <MensagemErro erro={erro} />
      <BotaoSalvar executando={executando} texto="＋ Salvar" />
    </form>
  );
}

function FormMovimentacao({
  tipoInicial,
  produtos,
  aoSalvar,
}: {
  tipoInicial: TipoMovimentacaoEstoque;
  produtos: Produto[];
  aoSalvar: (input: MovimentacaoInput) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoMovimentacaoEstoque>(tipoInicial);
  const [produtoId, setProdutoId] = useState("");
  const [estoque, setEstoque] = useState<TipoEstoque>("cheio");
  const [origem, setOrigem] = useState<"compra" | "ajuste">(
    tipoInicial === "entrada" ? "compra" : "ajuste"
  );
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const { executando, erro, executar } = useAcao();

  const produto = produtos.find((p) => p.id === produtoId);
  const estoqueEfetivo: TipoEstoque = produto?.controlaVazio ? estoque : "cheio";
  const disponivel = produto ? (estoqueEfetivo === "vazio" ? produto.vazios : produto.quantidade) : 0;

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!produtoId || Number(quantidade) <= 0) return;
    void executar(() =>
      aoSalvar({
        tipo,
        produtoId,
        quantidade: Number(quantidade),
        estoque: estoqueEfetivo,
        origem,
        observacao,
      })
    );
  }

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <select
        required
        aria-label="Produto"
        value={produtoId}
        onChange={(e) => setProdutoId(e.target.value)}
        className={classeCampo}
      >
        <option value="">Selecione o produto</option>
        {produtos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <select
          aria-label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoMovimentacaoEstoque)}
          className={classeCampo}
        >
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <select
          aria-label="Motivo"
          value={origem}
          onChange={(e) => setOrigem(e.target.value as "compra" | "ajuste")}
          className={classeCampo}
        >
          <option value="compra">Compra</option>
          <option value="ajuste">Ajuste / correção</option>
        </select>
      </div>
      {produto?.controlaVazio && (
        <select
          aria-label="Estoque"
          value={estoque}
          onChange={(e) => setEstoque(e.target.value as TipoEstoque)}
          className={classeCampo}
        >
          <option value="cheio">Botijões cheios</option>
          <option value="vazio">Vasilhames vazios</option>
        </select>
      )}
      <input
        required
        type="number"
        min="1"
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
        placeholder="Quantidade"
        aria-label="Quantidade"
        className={classeCampo}
      />
      {produto && (
        <p className="text-xs text-neutral-500">
          Em estoque agora: {disponivel} {estoqueEfetivo === "vazio" ? "vazios" : "unidades"}
        </p>
      )}
      <input
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="Observação (opcional)"
        aria-label="Observação"
        className={classeCampo}
      />
      <MensagemErro erro={erro} />
      <BotaoSalvar executando={executando} texto="Registrar" />
    </form>
  );
}

function FormTroca({
  produtos,
  aoSalvar,
}: {
  produtos: Produto[];
  aoSalvar: (input: TrocaVazioInput) => Promise<void>;
}) {
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState("");
  const { executando, erro, executar } = useAcao();
  const produto = produtos.find((p) => p.id === produtoId);

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!produtoId || Number(quantidade) <= 0) return;
    void executar(() => aoSalvar({ produtoId, quantidade: Number(quantidade) }));
  }

  if (produtos.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Nenhum produto controla vasilhame vazio. Cadastre um produto da categoria Gás.
      </p>
    );
  }

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <p className="text-sm text-neutral-600">
        Troca de vazios por cheios com a distribuidora.
      </p>
      <select
        aria-label="Produto"
        value={produtoId}
        onChange={(e) => setProdutoId(e.target.value)}
        className={classeCampo}
      >
        {produtos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome} ({p.vazios} vazios)
          </option>
        ))}
      </select>
      <input
        required
        type="number"
        min="1"
        max={produto?.vazios}
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
        placeholder="Quantidade"
        aria-label="Quantidade"
        className={classeCampo}
      />
      <MensagemErro erro={erro} />
      <BotaoSalvar executando={executando} texto="Registrar troca" />
    </form>
  );
}

function ConfirmarExclusao({
  produto,
  aoCancelar,
  aoConfirmar,
}: {
  produto: Produto;
  aoCancelar: () => void;
  aoConfirmar: () => Promise<void>;
}) {
  const { executando, erro, executar } = useAcao();

  return (
    <div className="grid gap-4">
      <p className="text-sm text-neutral-700">
        Excluir <strong>{produto.nome}</strong>?
      </p>
      <MensagemErro erro={erro} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={aoCancelar} className="rounded-md border px-4 py-2 text-sm">
          Voltar
        </button>
        <button
          type="button"
          disabled={executando}
          onClick={() => void executar(aoConfirmar)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {executando ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </div>
  );
}
