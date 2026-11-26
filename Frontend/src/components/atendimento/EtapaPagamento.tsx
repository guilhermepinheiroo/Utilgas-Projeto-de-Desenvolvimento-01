import { useState } from "react";
import type { BandeiraCartao, FormaPagamento } from "../../types/Vendas";
import { ModalBandeira } from "./ModalBandeira";

interface EtapaPagamentoProps {
  pagamento: FormaPagamento;
  temBotijaoP13: boolean;
  aoAlterarPagamento: (forma: FormaPagamento) => void;
  bandeira: BandeiraCartao | null;
  aoAlterarBandeira: (bandeira: BandeiraCartao | null) => void;
  observacao: string;
  aoAlterarObservacao: (texto: string) => void;
}

export function EtapaPagamento({
  pagamento,
  temBotijaoP13,
  aoAlterarPagamento,
  bandeira,
  aoAlterarBandeira,
  observacao,
  aoAlterarObservacao,
}: EtapaPagamentoProps) {
  const pagamentoCartao = pagamento === "credito" || pagamento === "debito";
  const [mostrarTiposCartao, setMostrarTiposCartao] = useState(pagamentoCartao);
  const [modalBandeiraAberto, setModalBandeiraAberto] = useState(false);
  const [formaCartaoPendente, setFormaCartaoPendente] = useState<"credito" | "debito" | null>(
    null
  );
  const [bandeiraPendente, setBandeiraPendente] = useState<BandeiraCartao | null>(null);

  function selecionarPagamento(forma: FormaPagamento) {
    aoAlterarPagamento(forma);
    aoAlterarBandeira(null);
    setMostrarTiposCartao(false);
  }

  function abrirSelecaoBandeira(forma: "credito" | "debito") {
    setFormaCartaoPendente(forma);
    setBandeiraPendente(null);
    setModalBandeiraAberto(true);
  }

  function fecharSelecaoBandeira() {
    setModalBandeiraAberto(false);
    setFormaCartaoPendente(null);
    setBandeiraPendente(null);
  }

  function confirmarBandeira() {
    if (!formaCartaoPendente || !bandeiraPendente) return;
    aoAlterarPagamento(formaCartaoPendente);
    aoAlterarBandeira(bandeiraPendente);
    fecharSelecaoBandeira();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="titulo-campo mb-2 text-neutral-800">
            Forma de pagamento
          </legend>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            <button
              type="button"
              aria-pressed={pagamento === "pix"}
              onClick={() => selecionarPagamento("pix")}
              className={`min-h-8 border px-2 text-xs ${
                pagamento === "pix"
                  ? "border-sidebar bg-sidebar text-white"
                  : "border-neutral-300 bg-white text-neutral-900"
              }`}
            >
              Pix
            </button>
            <button
              type="button"
              aria-pressed={pagamento === "dinheiro"}
              onClick={() => selecionarPagamento("dinheiro")}
              className={`min-h-8 border px-2 text-xs ${
                pagamento === "dinheiro"
                  ? "border-sidebar bg-sidebar text-white"
                  : "border-neutral-300 bg-white text-neutral-900"
              }`}
            >
              Dinheiro
            </button>
            <button
              type="button"
              aria-pressed={pagamentoCartao}
              aria-expanded={mostrarTiposCartao}
              onClick={() => setMostrarTiposCartao((atual) => !atual)}
              className={`min-h-8 border px-2 text-xs ${
                pagamentoCartao || mostrarTiposCartao
                  ? "border-sidebar bg-sidebar text-white"
                  : "border-neutral-300 bg-white text-neutral-900"
              }`}
            >
              Cartão
            </button>
            <button
              type="button"
              aria-pressed={pagamento === "gas_do_povo"}
              disabled={!temBotijaoP13}
              onClick={() => selecionarPagamento("gas_do_povo")}
              className={`min-h-8 border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                pagamento === "gas_do_povo"
                  ? "border-sidebar bg-sidebar text-white"
                  : "border-neutral-300 bg-white text-neutral-900"
              }`}
            >
              Gás do Povo
            </button>
          </div>
          {!temBotijaoP13 && (
            <p className="mt-1 text-[10px] text-neutral-500">
              Adicione um botijão P13 para habilitar o Gás do Povo.
            </p>
          )}

          {mostrarTiposCartao && (
            <div className="mt-1 grid grid-cols-2 gap-1" aria-label="Tipo de cartão">
              {([
                ["credito", "Crédito"],
                ["debito", "Débito"],
              ] as const).map(([forma, rotulo]) => (
                <button
                  key={forma}
                  type="button"
                  aria-pressed={pagamento === forma}
                  onClick={() => abrirSelecaoBandeira(forma)}
                  className={`min-h-7 border px-2 text-[10px] ${
                    pagamento === forma
                      ? "border-sidebar bg-[#dce7df] text-sidebar"
                      : "border-neutral-300 bg-white text-neutral-700"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        {pagamento === "gas_do_povo" && (
          <p role="status" className="border border-[#8eaa96] bg-[#dce7df] px-3 py-2 text-xs text-sidebar">
            Botijões P13 ficam zerados; outros botijões, água, acessórios e taxa de entrega continuam cobrados.
          </p>
        )}

        {pagamentoCartao && bandeira && (
          <p
            role="status"
            className="border border-[#8eaa96] bg-[#dce7df] px-3 py-2 text-xs font-semibold text-sidebar"
          >
            Levar máquina para cartão {bandeira}
          </p>
        )}

        <label className="flex flex-col gap-1 text-[10px] font-medium text-neutral-800">
          Observação para o entregador
          <input
            type="text"
            maxLength={300}
            value={observacao}
            onChange={(evento) => aoAlterarObservacao(evento.target.value)}
            placeholder="Ex.: portão azul, chamar no interfone"
            className="h-[30px] border border-neutral-300 bg-[#f3f3f3] px-2 text-[10px] font-normal text-neutral-900 placeholder:text-neutral-400"
          />
        </label>
      </div>

      <ModalBandeira
        aberto={modalBandeiraAberto}
        selecionada={bandeiraPendente}
        aoSelecionar={setBandeiraPendente}
        aoFechar={fecharSelecaoBandeira}
        aoConfirmar={confirmarBandeira}
      />
    </>
  );
}
