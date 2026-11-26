import type { InputHTMLAttributes } from "react";
import iconeSetaBaixo from "../assets/telaclientes/icon-filtro-seta-baixo.png";
import type { OpcaoRegiao } from "../types/FormularioCliente";

type CorRotulo = "escuro" | "verde";

interface CampoBase {
  rotulo: string;
  classe?: string;
  corRotulo?: CorRotulo;
  pequeno?: boolean;
  semArredondamento?: boolean;
}

const estilosRotulo: Record<CorRotulo, string> = {
  escuro: "text-neutral-900",
  verde: "text-verde-painel",
};

const classeCampo =
  "border border-neutral-300 bg-neutral-200 px-3 text-sm font-semibold text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-verde-painel read-only:opacity-70";

interface CampoRotuladoProps
  extends CampoBase,
    Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className"> {
  valor: string;
  aoAlterar: (valor: string) => void;
}

export function CampoRotulado({
  rotulo,
  classe = "",
  corRotulo = "escuro",
  pequeno = false,
  semArredondamento = false,
  valor,
  aoAlterar,
  ...resto
}: CampoRotuladoProps) {
  return (
    <label className={`titulo-campo flex flex-col gap-1 ${classe}`}>
      <span className={`${estilosRotulo[corRotulo]}`}>
        {rotulo}
      </span>
      <input
        {...resto}
        value={valor}
        onChange={(e) => aoAlterar(e.target.value)}
        className={`${semArredondamento ? "rounded-none" : "rounded-sm"} ${classeCampo} ${
          pequeno ? "py-1.5" : "py-2"
        }`}
      />
    </label>
  );
}

interface SelecaoRotuladaProps extends CampoBase {
  valor: string;
  aoAlterar: (valor: string) => void;
  opcoes: OpcaoRegiao[];
}

export function SelecaoRotulada({
  rotulo,
  classe = "",
  corRotulo = "escuro",
  pequeno = false,
  semArredondamento = false,
  valor,
  aoAlterar,
  opcoes,
}: SelecaoRotuladaProps) {
  // Garante que o valor atual aparece mesmo que a lista não o traga
  const lista =
    valor && !opcoes.some((opcao) => opcao.valor === valor)
      ? [{ valor, rotulo: valor }, ...opcoes]
      : opcoes;

  return (
    <label className={`titulo-campo relative flex flex-col gap-1 ${classe}`}>
      <span className={`${estilosRotulo[corRotulo]}`}>
        {rotulo}
      </span>
      <select
        value={valor}
        onChange={(e) => aoAlterar(e.target.value)}
        className={`${semArredondamento ? "rounded-none" : "rounded-sm"} ${classeCampo} appearance-none pr-8 ${
          pequeno ? "py-1.5" : "py-2"
        }`}
      >
        <option value="">Selecione</option>
        {lista.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
      <img
        src={iconeSetaBaixo}
        alt=""
        className="pointer-events-none absolute bottom-2.5 right-3 size-3 object-contain"
      />
    </label>
  );
}