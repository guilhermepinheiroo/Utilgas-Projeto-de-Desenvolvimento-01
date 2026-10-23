import type {
  Cliente,
  PaginaClientes,
  ParametrosBuscaClientes,
  ResumoClientes,
  StatusCliente,
} from "../types/clientes";
import { esperar } from "../utils/Simulacao";
import { normalizar } from "../utils/Texto";

const nomes = [
  "Ana Paula", "Carlos Henrique", "Mariana", "Roberto", "Juliana",
  "Fernanda", "Luciano", "Patrícia", "Marcos", "Camila",
  "Rafael", "Beatriz", "Thiago", "Larissa", "Eduardo",
];

const sobrenomes = [
  "Silva", "Souza", "Costa", "Oliveira", "Ferreira", "Mendes", "Lima",
  "Duarte", "Alves", "Barbosa", "Pereira", "Rodrigues", "Martins", "Gomes",
  "Ribeiro", "Carvalho", "Almeida", "Nunes", "Teixeira",
];

const ruas = [
  "Rua das Flores", "Av. Brasil", "Rua Sete de Setembro", "Rua João Pinheiro",
  "Av. Andrade Neves", "Rua Sacramento", "Rua General Osório",
];

function dataParaIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function diasAtras(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return dataParaIso(data);
}

function statusDoIndice(indice: number): StatusCliente {
  if (indice % 25 === 0) return "inadimplente";
  if (indice % 17 === 3) return "inativo";
  return "ativo";
}

function gerarClientes(quantidade: number): Cliente[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const numero = String((i * 7919 + 12345678) % 100000000).padStart(8, "0");

    const primeiroSobrenome = sobrenomes[i % 19];
    let segundoSobrenome = sobrenomes[(i + 5) % 17];
    if (segundoSobrenome === primeiroSobrenome) segundoSobrenome = sobrenomes[18];

    return {
      id: `cliente-${i + 1}`,
      nome: `${nomes[i % nomes.length]} ${primeiroSobrenome} ${segundoSobrenome}`,
      whatsapp: `539${numero}`,
      endereco: `${ruas[i % ruas.length]}, ${100 + ((i * 37) % 900)}`,
      ultimaCompra: i % 40 === 7 ? null : diasAtras(((i * 7) % 90) + 1),
      status: statusDoIndice(i),
      cadastradoEm: diasAtras(i),
    };
  });
}

// Base simulada. Com o backend, isso vira o banco de dados.
const clientes: Cliente[] = gerarClientes(1248);

export async function buscarClientes({
  pagina,
  tamanhoPagina,
  busca,
  status,
}: ParametrosBuscaClientes): Promise<PaginaClientes> {
  await esperar();

  const termo = normalizar(busca.trim());
  const termoNumerico = busca.replace(/\D/g, "");

  const filtrados = clientes
    .filter((cliente) => status === "todos" || cliente.status === status)
    .filter((cliente) => {
      if (!termo) return true;

      return (
        normalizar(cliente.nome).includes(termo) ||
        normalizar(cliente.endereco).includes(termo) ||
        (termoNumerico.length > 0 && cliente.whatsapp.includes(termoNumerico))
      );
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const inicio = (pagina - 1) * tamanhoPagina;

  return {
    itens: filtrados.slice(inicio, inicio + tamanhoPagina),
    total: filtrados.length,
  };
}

export async function buscarResumoClientes(): Promise<ResumoClientes> {
  await esperar();

  const hoje = new Date();
  const novosNoMes = clientes.filter((cliente) => {
    const [ano, mes] = cliente.cadastradoEm.split("-").map(Number);
    return ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  }).length;

  // Os totais saem da base; as variações são fixas porque dependem de histórico
  return {
    total: { valor: clientes.length, variacao: 12 },
    novosNoMes: { valor: novosNoMes, variacao: 5.3 },
    ativos: { valor: clientes.filter((c) => c.status === "ativo").length, variacao: 2.1 },
    inadimplentes: {
      valor: clientes.filter((c) => c.status === "inadimplente").length,
      variacao: -1.4,
    },
  };
}