import type { DadosFormularioCliente } from "../types/FormularioCliente";
import { emailValido, soDigitos, validarCnpj, validarCpf } from "./Documentos";

export function validarFormularioCliente(dados: DadosFormularioCliente): string | null {
  if (dados.nome.trim().length < 2) return "Informe o nome do cliente.";

  const telefone = soDigitos(dados.whatsapp);
  if (telefone.length < 10 || telefone.length > 11) return "Informe um telefone válido com DDD.";

  const documento = soDigitos(dados.documento);
  if (documento) {
    const valido =
      documento.length === 11 ? validarCpf(documento) : documento.length === 14 && validarCnpj(documento);
    if (!valido) return "CPF ou CNPJ inválido.";
  }

  if (dados.email.trim() && !emailValido(dados.email)) return "E-mail inválido.";

  if (dados.enderecos.length === 0) return "Cadastre pelo menos um endereço.";

  for (let i = 0; i < dados.enderecos.length; i++) {
    const endereco = dados.enderecos[i];
    const prefixo = `Endereço ${i + 1}:`;

    if (!endereco.logradouro.trim()) return `${prefixo} informe a rua e o número.`;
    if (!endereco.bairro.trim()) return `${prefixo} informe o bairro.`;

    const cep = soDigitos(endereco.cep);
    if (cep && cep.length !== 8) return `${prefixo} CEP inválido.`;
  }

  if (!dados.enderecos.some((endereco) => endereco.principal)) {
    return "Marque um endereço como principal.";
  }

  return null;
}