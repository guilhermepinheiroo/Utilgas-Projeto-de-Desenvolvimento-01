import iconeSetaVerde from "../../../assets/icon-seta-verde.png";
import iconeSetaVermelha from "../../../assets/icon-seta-vermelha.png";

export function VariacaoMensal({ percentual }: { percentual: number }) {
  const positiva = percentual >= 0;

  return (
    <p
      className={`flex items-center gap-1 text-xs font-medium ${
        positiva ? "text-green-400" : "text-red-300"
      }`}
    >
      <img
        src={positiva ? iconeSetaVerde : iconeSetaVermelha}
        alt=""
        className="size-3 object-contain"
      />
      {Math.abs(percentual)}% a {positiva ? "mais" : "menos"} nesse mês
    </p>
  );
}