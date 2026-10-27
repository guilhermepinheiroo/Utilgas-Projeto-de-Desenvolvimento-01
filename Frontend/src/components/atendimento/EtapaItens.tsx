import { useMemo, useState } from "react";
import { iconeDaCategoria } from "../../constants/IconesEstoque";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">O que o cliente vai levar?</h2>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto"
          aria-label="Buscar produto"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
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

      <ul className={`divide-y divide-neutral-200 rounded-lg border border-neutral-200 ${carregando ? "opacity-50" : ""}`}>
        {filtrados.map((produto) => {
          const quantidade = quantidadeDe(produto);
          const item = itens.find((i) => i.produto.id === produto.id);
          return (
            <li key={produto.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <img src={iconeDaCategoria(produto.categoria)} alt="" className="size-7 object-contain" />
              <div className="min-w-40 flex-1 leading-tight">
                <p className="text-sm font-semibold">{produto.nome}</p>
                <p className="text-[11px] text-neutral-500">
                  {formatarCentavos(produto.precoCentavos)} ·{" "}
                  <span className={produto.quantidade === 0 ? "text-red-600" : ""}>
                    {produto.quantidade === 0 ? "sem estoque" : `${produto.quantidade} em estoque`}
                  </span>
                </p>
              </div>

              {item && (
                <label className="flex items-center gap-1 text-[11px] text-neutral-600">
                  Desconto R$
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={item.descontoCentavos ? item.descontoCentavos / 100 : ""}
                    onChange={(e) => alterarDesconto(produto, e.target.value)}
                    className="w-20 rounded border border-neutral-300 px-1.5 py-1 text-xs"
                  />
                </label>
              )}

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => alterarQuantidade(produto, quantidade - 1)}
                  disabled={quantidade === 0}
                  aria-label={`Diminuir ${produto.nome}`}
                  className="size-7 rounded bg-neutral-100 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold">{quantidade}</span>
                <button
                  type="button"
                  onClick={() => alterarQuantidade(produto, quantidade + 1)}
                  disabled={quantidade >= produto.quantidade}
                  aria-label={`Aumentar ${produto.nome}`}
                  className="size-7 rounded bg-sidebar text-white disabled:opacity-40"
                >
                  +
                </button>
              </div>

              {item && (
                <span className="w-20 text-right text-sm font-medium">
                  {formatarCentavos(subtotalDoItem(item))}
                </span>
              )}
            </li>
          );
        })}
        {!carregando && filtrados.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-neutral-500">Nenhum produto encontrado.</li>
        )}
      </ul>
    </div>
  );
}
