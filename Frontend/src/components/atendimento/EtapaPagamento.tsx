import type { Endereco } from "../../types/clientes";
import type { FormaPagamento } from "../../types/Vendas";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { subtotalDoItem, type ItemPedido } from "./tipos";

import iconeCartao from "../../assets/icon-cartao.png";
import iconeDinheiro from "../../assets/telavendas/icon-dinheiro-vivo.png";
import iconePix from "../../assets/telavendas/icon-pix.png";

const formas: Array<{ id: FormaPagamento; nome: string; icone: string }> = [
  { id: "pix", nome: "PIX", icone: iconePix },
  { id: "dinheiro", nome: "Dinheiro", icone: iconeDinheiro },
  { id: "credito", nome: "Cartão de Crédito", icone: iconeCartao },
  { id: "debito", nome: "Cartão de Débito", icone: iconeCartao },
];

interface EtapaPagamentoProps {
  itens: ItemPedido[];
  endereco: Endereco | null;
  pagamento: FormaPagamento;
  aoAlterarPagamento: (forma: FormaPagamento) => void;
  observacao: string;
  aoAlterarObservacao: (texto: string) => void;
}

export function EtapaPagamento({
  itens,
  endereco,
  pagamento,
  aoAlterarPagamento,
  observacao,
  aoAlterarObservacao,
}: EtapaPagamentoProps) {
  const bruto = itens.reduce((t, i) => t + i.produto.precoCentavos * i.quantidade, 0);
  const desconto = itens.reduce((t, i) => t + i.descontoCentavos, 0);
  const taxa = endereco?.taxaEntregaCentavos ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-base font-semibold">Forma de pagamento</legend>
          <div className="grid grid-cols-2 gap-2">
            {formas.map((forma) => (
              <label
                key={forma.id}
                className={`relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-xs ${
                  pagamento === forma.id ? "border-sidebar bg-[#f5faf7]" : "border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="pagamento-atendimento"
                  checked={pagamento === forma.id}
                  onChange={() => aoAlterarPagamento(forma.id)}
                  className="absolute right-2 top-2 accent-sidebar"
                />
                <img src={forma.icone} alt="" className="size-4 object-contain" />
                {forma.nome}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Observação para o entregador
          <textarea
            rows={3}
            maxLength={300}
            value={observacao}
            onChange={(e) => aoAlterarObservacao(e.target.value)}
            placeholder="Ex.: troco para R$ 200"
            className="resize-none rounded-md border border-neutral-300 p-2 text-sm font-normal"
          />
        </label>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <h3 className="mb-3 font-semibold">Resumo do pedido</h3>
        <ul className="mb-3 space-y-1">
          {itens.map((item) => (
            <li key={item.produto.id} className="flex justify-between gap-2">
              <span>
                {item.quantidade}× {item.produto.nome}
              </span>
              <span>{formatarCentavos(subtotalDoItem(item))}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-neutral-200 pt-2 text-xs">
          <div className="flex justify-between">
            <dt>Produtos</dt>
            <dd>{formatarCentavos(bruto)}</dd>
          </div>
          {desconto > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Desconto</dt>
              <dd>− {formatarCentavos(desconto)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de entrega {endereco?.regiaoNome ? `(${endereco.regiaoNome})` : ""}</dt>
            <dd>{formatarCentavos(taxa)}</dd>
          </div>
        </dl>
        <p className="mt-3 flex justify-between rounded-md bg-[#d2e4da] px-3 py-2 font-bold">
          <span>Total</span>
          <span>{formatarCentavos(bruto - desconto + taxa)}</span>
        </p>
        {endereco && (
          <p className="mt-3 text-xs text-neutral-600">
            Entregar em: {endereco.endereco}
            {endereco.complemento && ` (${endereco.complemento})`}
            {endereco.bairro && ` - ${endereco.bairro}`}
          </p>
        )}
      </section>
    </div>
  );
}
