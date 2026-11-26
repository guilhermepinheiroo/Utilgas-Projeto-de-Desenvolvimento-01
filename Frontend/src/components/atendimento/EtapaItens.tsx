import { useMemo, useState } from "react";
import { useProdutos } from "../../hooks/UseProdutos";
import type { Produto } from "../../types/Produtos";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { normalizar } from "../../utils/Texto";
import { subtotalDoItem, type ItemPedido } from "./tipos";

interface EtapaItensProps {
  itens: ItemPedido[];
  aoAlterar: (itens: ItemPedido[]) => void;
}

export function EtapaItens({ itens, aoAlterar }: EtapaItensProps) {
  const { produtos, carregando, erro, recarregar } = useProdutos();
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return produtos.filter((p) => !termo || normalizar(p.nome).includes(termo));
  }, [produtos, busca]);

  function quantidadeDe(produto: Produto) {
    return itens.find((i) => i.produto.id === produto.id)?.quantidade ?? 0;
  }

  function alterarQuantidade(produto: Produto, quantidade: number) {
    const limitada = Math.max(0, Math.min(quantidade, produto.quantidade));
    const existe = itens.some((i) => i.produto.id === produto.id);
    if (limitada === 0) {
      aoAlterar(itens.filter((i) => i.produto.id !== produto.id));
    } else if (existe) {
      aoAlterar(
        itens.map((i) =>
          i.produto.id === produto.id
            ? {
                ...i,
                quantidade: limitada,
                descontoCentavos: Math.min(i.descontoCentavos, produto.precoCentavos * limitada),
              }
            : i
        )
      );
    } else {
      aoAlterar([...itens, { produto, quantidade: limitada, descontoCentavos: 0 }]);
    }
  }

  function alterarDesconto(produto: Produto, reais: string) {
    const centavos = Math.round(Number(reais.replace(",", ".")) * 100) || 0;
    aoAlterar(
      itens.map((i) =>
        i.produto.id === produto.id
          ? {
              ...i,
              descontoCentavos: Math.min(Math.max(0, centavos), produto.precoCentavos * i.quantidade),
            }
          : i
      )
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-sidebar px-3 py-2 text-white">
        <h2 className="text-base font-semibold">Itens do Pedido</h2>
        <span className="informacao-secundaria text-white/60">toque no produto para adicionar</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto"
          aria-label="Buscar produto"
          className="w-28 border border-white/40 bg-white/10 px-2 py-1 text-[9px] text-white placeholder:text-white/60"
        />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}{" "}
          <button type="button" onClick={recarregar} className="underline">
            Tentar de novo
          </button>
        </p>
      )}

      <ul className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${carregando ? "opacity-50" : ""}`}>
        {filtrados.map((produto) => {
          const quantidade = quantidadeDe(produto);
          return (
            <li key={produto.id}>
              <button
                type="button"
                onClick={() => alterarQuantidade(produto, quantidade + 1)}
                disabled={quantidade >= produto.quantidade || carregando}
                aria-label={`Adicionar ${produto.nome}`}
                className={`flex min-h-9 w-full flex-col items-start justify-center border px-2 py-1.5 text-left transition-colors ${
                  quantidade > 0 ? "border-sidebar bg-[#f5faf7]" : "border-neutral-300 bg-white"
                } disabled:cursor-not-allowed disabled:opacity-50 hover:border-sidebar`}
              >
                <span className="text-sm font-medium leading-tight">{produto.nome}</span>
                <span className="informacao-secundaria mt-1 text-neutral-400">
                  {formatarCentavos(produto.precoCentavos)}
                  {produto.quantidade === 0 && " · sem estoque"}
                </span>
              </button>
            </li>
          );
        })}
        {!carregando && filtrados.length === 0 && (
          <li className="col-span-full py-3 text-sm text-neutral-500">Nenhum produto encontrado.</li>
        )}
      </ul>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[9px]">
          <thead>
            <tr className="border-b border-neutral-400 text-left uppercase text-neutral-400">
              <th className="py-2 font-normal">Item</th>
              <th className="py-2 text-center font-normal">Qnd.</th>
              <th className="py-2 text-right font-normal">Unitário</th>
              <th className="py-2 text-right font-normal">Subtotal</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.produto.id} className="group border-b border-neutral-300">
                <td className="relative py-2 pr-4">
                  <span>{item.produto.nome}</span>
                  {item.descontoCentavos > 0 && (
                    <span className="ml-1 text-neutral-400">
                      (−{formatarCentavos(item.descontoCentavos)})
                    </span>
                  )}
                  <details className="absolute right-0 top-1">
                    <summary className="w-fit cursor-pointer text-[8px] text-transparent group-hover:text-neutral-400 group-focus-within:text-neutral-400">
                      desconto
                    </summary>
                    <label className="absolute left-0 top-full z-10 flex items-center gap-1 bg-white p-1 text-neutral-500 shadow">
                      R$
                      <input
                        type="number"
                        min="0"
                        max={(item.produto.precoCentavos * item.quantidade) / 100}
                        step="0.01"
                        value={item.descontoCentavos ? item.descontoCentavos / 100 : ""}
                        onChange={(evento) => alterarDesconto(item.produto, evento.target.value)}
                        className="w-20 rounded border border-neutral-300 px-1 py-0.5"
                        aria-label={`Desconto para ${item.produto.nome}`}
                      />
                    </label>
                  </details>
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(item.produto, item.quantidade - 1)}
                      aria-label={`Diminuir ${item.produto.nome}`}
                      className="flex size-4 items-center justify-center border border-neutral-300"
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(item.produto, item.quantidade + 1)}
                      disabled={item.quantidade >= item.produto.quantidade}
                      aria-label={`Aumentar ${item.produto.nome}`}
                      className="flex size-4 items-center justify-center border border-neutral-300 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="py-2 text-right">{formatarCentavos(item.produto.precoCentavos)}</td>
                <td className="py-2 text-right">{formatarCentavos(subtotalDoItem(item))}</td>
                <td className="py-2 pl-3 text-right">
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(item.produto, 0)}
                    className="text-[8px] text-sidebar hover:underline"
                  >
                    remover
                  </button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={5} className="h-16 py-3 text-neutral-400">
                  Selecione um produto para adicionar ao pedido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
