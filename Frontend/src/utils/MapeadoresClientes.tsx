import type { ClienteDetalhado, ClienteInput, EnderecoInput } from "../types/clientes";
import {
  criarEnderecoVazio,
  criarFormularioVazio,
  type DadosFormularioCliente,
  type EnderecoFormulario,
  type MetricaCliente,
  type SeloCliente,
} from "../types/FormularioCliente";
import {
  adicionarEndereco,
  atualizarCliente,
  atualizarEndereco,
  criarCliente,
  obterCliente,
  removerEndereco,
} from "../services/Clientes";
import { soDigitos } from "./Documentos";
import { formatarDataCurta } from "./FormataData";

export function formularioVazio(whatsapp: string): DadosFormularioCliente {
  return criarFormularioVazio(whatsapp);
}

// ClienteDetalhado (API) -> formato do formulário
export function clienteParaFormulario(cliente: ClienteDetalhado): DadosFormularioCliente {
  const enderecos = cliente.enderecos.map((endereco) => ({
    chave: endereco.id,
    id: endereco.id,
    logradouro: endereco.endereco,
    complemento: endereco.complemento ?? "",
    pontoReferencia: endereco.pontoReferencia ?? "",
    cep: soDigitos(endereco.cep ?? ""),
    bairro: endereco.bairro ?? "",
    regiao: endereco.regiaoId ?? "",
    principal: endereco.principal,
  }));

  return {
    nome: cliente.nome,
    whatsapp: soDigitos(cliente.whatsapp),
    documento: soDigitos(cliente.cpf ?? ""),
    email: cliente.email ?? "",
    observacoes: cliente.observacoes ?? "",
    enderecos: enderecos.length > 0 ? enderecos : [criarEnderecoVazio(true)],
  };
}

// Título grande, selos e métricas do modal "Cliente localizado"
export function resumoDoCliente(cliente: ClienteDetalhado): {
  titulo: string;
  selos: SeloCliente[];
  metricas: MetricaCliente[];
} {
  const status = {
    ativo: "Ativo",
    inativo: "Inativo",
    inadimplente: "Inadimplente",
  }[cliente.status];
  const indicadores = cliente.indicadores;

  return {
    titulo: cliente.nome,
    selos: [
      { texto: status, destaque: cliente.status !== "ativo" },
      {
        texto: `${cliente.enderecos.length} ${
          cliente.enderecos.length === 1 ? "endereço" : "endereços"
        }`,
      },
    ],
    metricas: [
      { rotulo: "Pedidos", valor: String(indicadores?.totalPedidos ?? 0) },
      {
        rotulo: "Última compra",
        valor: indicadores?.ultimaCompra ? formatarDataCurta(indicadores.ultimaCompra) : "Sem compras",
      },
      {
        rotulo: "Frequência média",
        valor:
          indicadores?.frequenciaMediaDias !== null &&
          indicadores?.frequenciaMediaDias !== undefined
            ? `${indicadores.frequenciaMediaDias} dias`
            : "—",
      },
      {
        rotulo: "Recompra prevista",
        valor:
          indicadores?.recompraPrevistaEmDias !== null &&
          indicadores?.recompraPrevistaEmDias !== undefined
            ? `${indicadores.recompraPrevistaEmDias} dias`
            : "—",
      },
    ],
  };
}

// Cria (existente = null) ou atualiza o cliente e devolve a versão salva
export async function salvarCliente(
  dados: DadosFormularioCliente,
  existente: ClienteDetalhado | null
): Promise<ClienteDetalhado> {
  const input: ClienteInput = {
    nome: dados.nome.trim(),
    whatsapp: soDigitos(dados.whatsapp),
    cpf: soDigitos(dados.documento),
    email: dados.email.trim(),
    observacoes: dados.observacoes.trim(),
    status: existente?.status ?? "ativo",
  };
  const enderecos = dados.enderecos.map((endereco) => ({
    id: endereco.id,
    input: enderecoParaInput(endereco),
  }));

  if (!existente) return criarCliente(input, enderecos.map(({ input: endereco }) => endereco));

  await atualizarCliente(existente.id, input);

  const manterIds = new Set(enderecos.flatMap(({ id }) => (id ? [id] : [])));
  for (const endereco of existente.enderecos) {
    if (!manterIds.has(endereco.id)) await removerEndereco(existente.id, endereco.id);
  }

  for (let i = 0; i < dados.enderecos.length; i++) {
    const enderecoFormulario = dados.enderecos[i];
    const enderecoInput = enderecos[i].input;
    if (enderecoFormulario.id) {
      await atualizarEndereco(existente.id, enderecoFormulario.id, enderecoInput);
    } else {
      await adicionarEndereco(existente.id, enderecoInput);
    }
  }

  return obterCliente(existente.id);
}

function enderecoParaInput(endereco: EnderecoFormulario): EnderecoInput {
  return {
    endereco: endereco.logradouro.trim(),
    complemento: endereco.complemento.trim(),
    pontoReferencia: endereco.pontoReferencia.trim(),
    cep: soDigitos(endereco.cep),
    bairro: endereco.bairro.trim(),
    regiaoId: endereco.regiao,
    principal: endereco.principal,
  };
}