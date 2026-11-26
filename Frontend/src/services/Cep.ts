export interface EnderecoPorCep {
  logradouro: string;
  bairro: string;
}

export async function buscarCep(cep: string): Promise<EnderecoPorCep | null> {
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    if (dados.erro) return null;

    return { logradouro: dados.logradouro ?? "", bairro: dados.bairro ?? "" };
  } catch {
    return null;
  }
}