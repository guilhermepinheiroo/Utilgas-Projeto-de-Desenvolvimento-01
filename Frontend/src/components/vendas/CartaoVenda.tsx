import { Avatar } from "../clientes/Avatar";
import { Selo } from "../Selo";
import {
  corPorStatusVenda,
  iconePorPagamento,
  rotulosOrigem,
  rotulosPagamento,
  rotulosStatusVenda,
} from "../../constants/Vendas";
import { iconePorProduto } from "../../constants/IconesEstoque";
import { catalogoProdutos } from "../../constants/ProdutosEstoque";
import type { RegistroVenda } from "../../types/Vendas";
import { mascararCpf } from "../../utils/FormataCpf";
import { formatarDataHora } from "../../utils/FormataData";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";

import iconeCalendario from "../../assets/telavendas/icon-calendario.png";
import iconeSetaDireita from "../../assets/telaclientes/icon-pag-dir.png";

interface CartaoVendaProps {
  venda: RegistroVenda;
  aoVerDetalhes: (venda: RegistroVenda) => void;
}

export function CartaoVenda({ venda, aoVerDetalhes }: CartaoVendaProps) {
  const nomeCliente = venda.cliente?.nome ?? "Cliente Indefinido";
  const { data, hora } = formatarDataHora(venda.dataHora);
  const iconePagamento = iconePorPagamento[venda.pagamento];
  const cancelada = venda.status === "cancelado";

  return (
    <li>
      <article className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-0">
        <div className="flex items-center gap-3 md:pr-4">
          <Avatar nome={nomeCliente} />
          <div className="flex min-w-0 flex-col items-start gap-1 leading-tight">
            <span title={nomeCliente} className="max-w-full truncate text-sm font-bold text-neutral-900">
              {nomeCliente}
            </span>
            <span className="text-[11px] text-verde-painel">
              {venda.cliente?.cpf ? `CPF ${mascararCpf(venda.cliente.cpf)}` : "CPF não informado"}
            </span>
            <Selo cor="escuro">{rotulosOrigem[venda.origem]}</Selo>
          </div>
        </div>

        <ul className="flex flex-col gap-2 md:border-l md:border-neutral-300 md:px-4">
          {venda.itens.map((item) => {
            const produto = catalogoProdutos[item.produtoId];
            const icone = produto.tipoIcone ? iconePorProduto[produto.tipoIcone] : undefined;

            return (
              <li key={item.produtoId} className="flex items-center gap-2 text-xs text-neutral-800">
                {icone ? (
                  <img src={icone} alt="" className="size-5 shrink-0 object-contain" />
                ) : (
                  <span className="size-5 shrink-0" aria-hidden />
                )}
                {item.quantidade > 1 && <span className="font-semibold">{item.quantidade}×</span>}
                <span>{produto.descricao}</span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2 md:border-l md:border-neutral-300 md:px-4">
          <div className="flex items-center gap-2">
            <img src={iconeCalendario} alt="" className="size-5 shrink-0 object-contain" />
            <span className="text-[11px] leading-tight text-neutral-800">
              {data}
              <br />
              {hora}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-800">
            {iconePagamento && (
              <img src={iconePagamento} alt="" className="size-4 shrink-0 object-contain" />
            )}
            <span>{rotulosPagamento[venda.pagamento]}</span>
            <Selo cor={corPorStatusVenda[venda.status]}>{rotulosStatusVenda[venda.status]}</Selo>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 md:border-l md:border-neutral-300 md:pl-4">
          <span
            className={`text-xl font-bold ${
              cancelada ? "text-neutral-400 line-through" : "text-verde-painel"
            }`}
          >
            {formatarCentavos(venda.totalCentavos)}
          </span>

          <button
            type="button"
            onClick={() => aoVerDetalhes(venda)}
            aria-label={`Ver detalhes da venda de ${nomeCliente}`}
            className="rounded-md p-2 transition-colors hover:bg-neutral-100"
          >
            <img src={iconeSetaDireita} alt="" className="size-4 object-contain" />
          </button>
        </div>
      </article>
    </li>
  );
}