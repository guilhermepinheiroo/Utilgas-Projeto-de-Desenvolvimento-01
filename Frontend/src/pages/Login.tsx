import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { mensagemDeErro } from "../services/Api";

export function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!email.trim() || !senha) return;

    setEnviando(true);
    setErro(null);
    try {
      await entrar(email.trim(), senha);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <form
        onSubmit={enviar}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-8 shadow-xl"
      >
        <img src="/images/logo.png" alt="UtilGás" className="mx-auto mb-2 h-12 w-auto" />
        <h1 className="text-center text-lg font-bold text-neutral-900">Entrar no sistema</h1>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          E-mail
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-verde-painel"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-verde-painel"
          />
        </label>

        {erro && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-sidebar py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sidebar-ativo disabled:opacity-60"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
