export interface EnderecoFormulario {
  chave: string; // identificador local (existe antes de salvar)
  id?: string; // id do banco, se já foi salvo
  logradouro: string;
  complemento: string;
  pontoReferencia: string;
  cep: string; // só dígitos
  bairro: string;
  regiao: string;
  principal: boolean;
}

export interface DadosFormularioCliente {
  nome: string;
  whatsapp: string; // só dígitos
  documento: string; // CPF ou CNPJ, só dígitos
  email: string;
  observacoes: string;
  enderecos: EnderecoFormulario[];
}

export interface SeloCliente {
  texto: string;
  destaque?: boolean;
}

export interface MetricaCliente {
  rotulo: string;
  valor: string;
}

export interface OpcaoRegiao {
  valor: string;
  rotulo: string;
}

export function criarEnderecoVazio(principal: boolean): EnderecoFormulario {
  return {
    chave: crypto.randomUUID(),
    logradouro: "",
    complemento: "",
    pontoReferencia: "",
    cep: "",
    bairro: "",
    regiao: "",
    principal,
  };
}

export function criarFormularioVazio(whatsapp: string): DadosFormularioCliente {
  return {
    nome: "",
    whatsapp,
    documento: "",
    email: "",
    observacoes: "",
    enderecos: [criarEnderecoVazio(true)],
  };
}