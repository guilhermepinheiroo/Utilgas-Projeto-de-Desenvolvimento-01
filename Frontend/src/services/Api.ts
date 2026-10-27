import { lerSessao, limparSessao, salvarSessao, type Sessao } from "../auth/sessao";

const URL_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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

const mensagensPorStatus: Record<number, string> = {
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Registro não encontrado.",
  500: "Erro interno no servidor. Tente de novo em instantes.",
};

async function lerMensagemDeErro(resposta: Response): Promise<string> {
  try {
    const dados = await resposta.json();
    const detalhe = dados?.detail ?? dados?.mensagem ?? dados?.message;

    if (typeof detalhe === "string") return detalhe;
    if (Array.isArray(detalhe) && detalhe.length > 0) {
      const primeiro = detalhe[0];
      const campo = Array.isArray(primeiro?.loc) ? primeiro.loc[primeiro.loc.length - 1] : null;
      const msg = typeof primeiro?.msg === "string" ? primeiro.msg : "dado inválido";
      return campo ? `Campo "${campo}": ${msg}` : msg;
    }
  } catch {
    // resposta sem corpo JSON
  }

  return mensagensPorStatus[resposta.status] ?? "Não foi possível concluir a operação.";
}

interface RespostaSessao {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  usuario: Sessao["usuario"];
}

export function sessaoDaResposta(dados: RespostaSessao): Sessao {
  return {
    accessToken: dados.access_token,
    refreshToken: dados.refresh_token,
    expiraEm: dados.expires_at,
    usuario: dados.usuario,
  };
}

let renovacaoEmAndamento: Promise<boolean> | null = null;

function renovarSessao(): Promise<boolean> {
  const sessao = lerSessao();
  if (!sessao?.refreshToken) return Promise.resolve(false);

  renovacaoEmAndamento ??= fetch(montarUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: sessao.refreshToken }),
  })
    .then(async (resposta) => {
      if (!resposta.ok) return false;
      salvarSessao(sessaoDaResposta(await resposta.json()));
      return true;
    })
    .catch(() => false)
    .finally(() => {
      renovacaoEmAndamento = null;
    });

  return renovacaoEmAndamento;
}

async function requisitar<T>(
  metodo: string,
  caminho: string,
  parametros?: ParametrosUrl,
  corpo?: unknown,
  podeRenovar = true
): Promise<T> {
  const sessao = lerSessao();
  const headers: Record<string, string> = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (sessao) headers.Authorization = `Bearer ${sessao.accessToken}`;

  const resposta = await fetch(montarUrl(caminho, parametros), {
    method: metodo,
    headers,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });

  if (resposta.status === 401 && sessao && !caminho.startsWith("/auth/")) {
    if (podeRenovar && (await renovarSessao())) {
      return requisitar<T>(metodo, caminho, parametros, corpo, false);
    }
    limparSessao(); // volta para a tela de login
  }

  if (!resposta.ok) throw new ErroApi(await lerMensagemDeErro(resposta), resposta.status);

  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

export const api = {
  get: <T>(caminho: string, parametros?: ParametrosUrl) =>
    requisitar<T>("GET", caminho, parametros),
  post: <T = void>(caminho: string, corpo?: unknown) =>
    requisitar<T>("POST", caminho, undefined, corpo),
  put: <T = void>(caminho: string, corpo?: unknown) =>
    requisitar<T>("PUT", caminho, undefined, corpo),
  patch: <T = void>(caminho: string, corpo?: unknown) =>
    requisitar<T>("PATCH", caminho, undefined, corpo),
  delete: <T = void>(caminho: string) => requisitar<T>("DELETE", caminho),
};

// Mensagem pronta para mostrar ao usuário, venha o erro do servidor ou da rede
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi) return erro.message;

  return "Não foi possível conectar ao servidor. Verifique se a API está rodando e tente de novo.";
}

export const paraCentavos = (reais: number | string | null | undefined): number =>
  Math.round(Number(reais ?? 0) * 100);

export const paraReais = (centavos: number): number => Math.round(centavos) / 100;
