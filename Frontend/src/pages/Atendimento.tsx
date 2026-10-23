import { useState } from "react";
import { CampoTelefone } from "../components/BuscaTelefone";
import { telefoneCompleto } from "../utils/FormatacaoTelefone";

export function Atendimento() {
  const [telefone, setTelefone] = useState("");

  function iniciarAtendimento() {
    console.log("Iniciar atendimento para:", telefone);
  }

  return (
    <section className="flex h-full min-h-screen flex-col items-center justify-center gap-8 px-6">
      <CampoTelefone valor={telefone} aoAlterar={setTelefone} />

      <button
        type="button"
        onClick={iniciarAtendimento}
        disabled={!telefoneCompleto(telefone)}
        className="cursor-pointer rounded-md bg-neutral-200 px-8 py-2.5 text-sm transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Iniciar Atendimento
      </button>
    </section>
  );
}