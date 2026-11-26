import { ArrowRight, Check, X } from "lucide-react";
import { Dialogo } from "../Dialogo";
import type { BandeiraCartao } from "../../types/Vendas";
import iconeAmex from "../../assets/icon-bandeira-amex.png";
import iconeBanrisul from "../../assets/icon-bandeira-banrisul.png";
import iconeElo from "../../assets/icon-bandeira-elo.png";
import iconeHipercard from "../../assets/icon-bandeira-hiper.png";
import iconeMastercard from "../../assets/icon-bandeira-mastercard.png";
import iconeVisa from "../../assets/icon-bandeira-visa.png";

const bandeiras: BandeiraCartao[] = [
  "Mastercard",
  "Visa",
  "Elo",
  "Hipercard",
  "Amex",
  "Banrisul",
];

const iconesBandeiras: Record<BandeiraCartao, string> = {
  Mastercard: iconeMastercard,
  Visa: iconeVisa,
  Elo: iconeElo,
  Hipercard: iconeHipercard,
  Amex: iconeAmex,
  Banrisul: iconeBanrisul,
};

interface ModalBandeiraProps {
  aberto: boolean;
  selecionada: BandeiraCartao | null;
  aoSelecionar: (bandeira: BandeiraCartao) => void;
  aoFechar: () => void;
  aoConfirmar: () => void;
}

export function ModalBandeira({
  aberto,
  selecionada,
  aoSelecionar,
  aoFechar,
  aoConfirmar,
}: ModalBandeiraProps) {
  return (
    <Dialogo
      aberto={aberto}
      titulo="Maquininha na entrega"
      aoFechar={aoFechar}
      semCabecalho
      classeLargura="max-w-[640px]"
      classeBackdrop="backdrop:bg-black/70"
      classePainel="rounded-2xl bg-transparent shadow-2xl"
    >
      <section className="relative max-h-[calc(100dvh-32px)] min-h-[min(480px,calc(100dvh-32px))] overflow-y-auto rounded-2xl bg-[#214532] px-4 py-7 text-white sm:px-7 sm:py-8">
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar seleção de bandeira"
          className="absolute right-4 top-3 rounded p-1 text-neutral-300 transition-colors hover:text-white sm:right-5 sm:top-4"
        >
          <X size={21} aria-hidden />
        </button>

        <h2 className="border-b border-[#1b3d2c] pb-2 text-center text-2xl font-semibold sm:text-3xl">
          Maquininha na entrega
        </h2>
        <div className="mt-5">
          <h3 className="text-lg font-bold sm:text-xl">Qual a bandeira do cartão?</h3>
          <p className="mt-1 text-xs text-[#aeb9b6] sm:text-sm">
            Selecione a bandeira para enviarmos a maquininha
          </p>
        </div>

        <fieldset className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <legend className="sr-only">Bandeira do cartão</legend>
          {bandeiras.map((bandeira) => {
            const ativa = selecionada === bandeira;
            return (
              <label
                key={bandeira}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-1 rounded-xl border-2 px-2 text-left transition-colors focus-within:ring-2 focus-within:ring-emerald-400 sm:gap-2 sm:px-3 ${
                  ativa
                    ? "border-emerald-500 bg-[#252732]"
                    : "border-transparent bg-[#252732] hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="bandeira-cartao"
                  value={bandeira}
                  checked={ativa}
                  onChange={() => aoSelecionar(bandeira)}
                  className="sr-only"
                />
                <span className="flex min-w-0 items-center gap-1 sm:gap-2">
                  <img
                    src={iconesBandeiras[bandeira]}
                    alt=""
                    className="h-5 w-8 shrink-0 object-contain sm:h-6 sm:w-9"
                  />
                  <span className="truncate text-[10px] font-semibold sm:text-sm">{bandeira}</span>
                </span>
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full border sm:size-5 ${
                    ativa
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-500 text-transparent"
                  }`}
                >
                  {ativa && <Check className="size-3 sm:size-3.5" aria-hidden />}
                </span>
              </label>
            );
          })}
        </fieldset>

        <button
          type="button"
          onClick={aoConfirmar}
          disabled={!selecionada}
          className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#08b987] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#06a779] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
        >
          Confirmar Bandeira
          <ArrowRight size={19} aria-hidden />
        </button>
      </section>
    </Dialogo>
  );
}