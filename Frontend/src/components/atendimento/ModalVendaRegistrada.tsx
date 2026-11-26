import type { Endereco, ClienteDetalhado } from "../../types/clientes";
import type { VendaRegistrada } from "../../types/Vendas";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { Dialogo } from "../Dialogo";

interface ModalVendaRegistradaProps {
  venda: VendaRegistrada | null;
  cliente: ClienteDetalhado;
  endereco: Endereco | null;
  aoNovoAtendimento: () => void;
  aoVerEntregas: () => void;
}

function resumoFrequencia(venda: VendaRegistrada) {
  const frequencia = venda.frequencia;
  if (!frequencia) return null;

  const media =
    frequencia.novaDias === null
      ? "Ainda não há histórico suficiente para calcular a frequência média."
      : frequencia.anteriorDias === null
        ? `Frequência média recalculada: ${frequencia.novaDias} dias entre compras.`
        : `Frequência média recalculada: ${frequencia.anteriorDias} → ${frequencia.novaDias} dias entre compras.`;

  const recompra =
    frequencia.recompraPrevistaEmDias === null
      ? "Ainda não há histórico suficiente para prever a próxima compra."
      : `Recompra prevista em ${frequencia.recompraPrevistaEmDias} dias${
          frequencia.dentroDaJanelaDeContato === null
            ? "."
            : frequencia.dentroDaJanelaDeContato
              ? ": dentro da janela de contato."
              : ": fora da janela de contato, aguarda a próxima venda."
        }`;

  return { media, recompra };
}

export function ModalVendaRegistrada({
  venda,
  cliente,
  endereco,
  aoNovoAtendimento,
  aoVerEntregas,
}: ModalVendaRegistradaProps) {
  const frequencia = venda ? resumoFrequencia(venda) : null;
  const formaPagamento =
    venda?.pagamento === "credito" || venda?.pagamento === "debito"
      ? "Cartão"
      : venda?.pagamento === "pix"
        ? "Pix"
        : venda?.pagamento === "gas_do_povo"
          ? "Gás do Povo"
          : "Dinheiro";
  const enderecoTexto = endereco
    ? [endereco.endereco, endereco.bairro]
        .filter(Boolean)
        .join(" — ")
    : "Endereço não informado";

  return (
    <Dialogo
      aberto={venda !== null}
      titulo="Venda registrada"
      aoFechar={aoNovoAtendimento}
      semCabecalho
      classeLargura="max-w-[655px]"
      classePainel="rounded-lg bg-white shadow-xl"
      classeBackdrop="backdrop:bg-black/50"
    >
      {venda && (
        <div className="flex min-h-[min(530px,80vh)] flex-col p-5 text-neutral-500 sm:p-7">
          <p className="titulo-secao uppercase tracking-[0.13em] text-[#315d41]">
            Venda registrada
          </p>

          <h2 className="titulo-pedido mt-5 leading-tight text-neutral-800">
            Pedido #{venda.numero} · {formatarCentavos(venda.totalCentavos)}
          </h2>
          <p className="informacao-secundaria mt-3 text-neutral-500">
            {venda.cliente?.nome ?? cliente.nome} · {formaPagamento} · {enderecoTexto}
          </p>

          <div className="mt-3 border-t border-neutral-300" />

          {frequencia && (
            <section className="py-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.13em] text-[#315d41]">
                Recálculo de frequência
              </h3>
              <p className="informacao-secundaria mt-2 leading-5 text-neutral-500">
                {frequencia.media}
              </p>
              <p className="informacao-secundaria mt-2 leading-5 text-neutral-500">
                {frequencia.recompra}
              </p>
            </section>
          )}

          <div className="border-t border-neutral-300" />

          {venda.entrega && (
            <section className="py-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.13em] text-[#315d41]">
                Entrega
              </h3>
              <p className="informacao-secundaria mt-2 leading-5 text-neutral-500">
                Entrega #{venda.entrega.id} criada com status {venda.entrega.status}
                {venda.entrega.regiao ? `, região ${venda.entrega.regiao}` : ""}
                {venda.entrega.entregadorId
                  ? ", entregador atribuído."
                  : ", aguardando atribuição de entregador."}
              </p>
            </section>
          )}

          <footer className="mt-auto flex justify-end pt-5">
            {venda.entrega && (
              <button
                type="button"
                onClick={aoVerEntregas}
                className="bg-[#4b7957] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sidebar"
              >
                Ir para Entregas
              </button>
            )}
          </footer>
        </div>
      )}
    </Dialogo>
  );
}
