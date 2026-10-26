const URL_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ErroApi extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

export type ParametrosUrl = Record<string, string | number | boolean | null | undefined>;

function montarUrl(caminho: string, parametros?: ParametrosUrl): string {
  const url = new URL(`${URL_BASE.replace(/\/$/, "")}${caminho}`, window.location.origin);

  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== null && valor !== undefined && valor !== "") {
      url.searchParams.set(chave, String(valor));
    }
  });

  return url.toString();
}

async function lerMensagemDeErro(resposta: Response): Promise<string> {
  try {
    const dados = await resposta.json();
    const mensagem = dados?.mensagem ?? dados?.message;
    if (typeof mensagem === "string") return mensagem;
  } catch {
    // resposta sem corpo JSON
  }

  return "Não foi possível concluir a operação.";
}

async function requisitar<T>(
  metodo: string,
  caminho: string,
  parametros?: ParametrosUrl,
  corpo?: unknown
): Promise<T> {
  // Quando existir login, o cabeçalho Authorization entra aqui, num lugar só.
  const resposta = await fetch(montarUrl(caminho, parametros), {
    method: metodo,
    headers: corpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });

  if (!resposta.ok) throw new ErroApi(await lerMensagemDeErro(resposta), resposta.status);

  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

export const api = {
  get: <T>(caminho: string, parametros?: ParametrosUrl) =>
    requisitar<T>("GET", caminho, parametros),
  post: <T = void>(caminho: string, corpo?: unknown) =>
    requisitar<T>("POST", caminho, undefined, corpo),
  patch: <T = void>(caminho: string, corpo?: unknown) =>
    requisitar<T>("PATCH", caminho, undefined, corpo),
};

// Mensagem pronta para mostrar ao usuário, venha o erro do servidor ou da rede
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi) return erro.message;

  return "Não foi possível conectar ao servidor. Verifique a conexão e tente de novo.";
}