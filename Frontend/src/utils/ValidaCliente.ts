import type { ClienteInput, EnderecoInput } from "../types/clientes";

export const clienteVazio: ClienteInput = {
  nome: "",
  whatsapp: "",
  cpf: "",
  email: "",
  observacoes: "",
  status: "ativo",
};

export const enderecoVazio: EnderecoInput = {
  endereco: "",
  complemento: "",
  cep: "",
  bairro: "",
  regiaoId: "",
  principal: true,
};

export function clienteValido(c: ClienteInput): string | null {
  if (!c.nome.trim()) return "Informe o nome do cliente.";
  const digitos = c.whatsapp.replace(/\D/g, "");
  if (digitos.length < 10) return "Informe o WhatsApp com DDD.";
  return null;
}

export function enderecoValido(e: EnderecoInput): string | null {
  if (!e.endereco.trim()) return "Informe a rua e o número.";
  if (!e.regiaoId) return "Escolha a região de entrega (define a taxa).";
  return null;
}
