export interface UsuarioLogado {
  id: string;
  nome: string;
  papel: "admin" | "operador" | string;
}

export interface Sessao {
  accessToken: string;
  refreshToken: string;
  expiraEm: number | null; // segundos desde 1970 (formato do Supabase)
  usuario: UsuarioLogado;
}

const CHAVE = "utilgas.sessao";

type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();

function lerDoStorage(): Sessao | null {
  try {
    const texto = window.localStorage.getItem(CHAVE);
    return texto ? (JSON.parse(texto) as Sessao) : null;
  } catch {
    return null;
  }
}

let atual: Sessao | null = lerDoStorage();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function lerSessao(): Sessao | null {
  return atual;
}

export function salvarSessao(sessao: Sessao) {
  atual = sessao;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(sessao));
  } catch {
    // storage bloqueado
  }
  avisar();
}

export function limparSessao() {
  if (atual === null) return;
  atual = null;
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
  avisar();
}

export function assinarSessao(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

window.addEventListener("storage", (evento) => {
  if (evento.key !== CHAVE) return;
  atual = lerDoStorage();
  avisar();
});
