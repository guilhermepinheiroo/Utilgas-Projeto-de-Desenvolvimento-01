import { useEffect, useState, type FormEvent } from "react";
import { mensagemDeErro } from "../../services/Api";
import {
  adicionarEndereco,
  atualizarCliente,
  atualizarEndereco,
  criarCliente,
  obterCliente,
} from "../../services/Clientes";
import type { ClienteDetalhado, ClienteInput, EnderecoInput } from "../../types/clientes";
import {
  clienteValido,
  clienteVazio,
  enderecoValido,
  enderecoVazio,
} from "../../utils/ValidaCliente";
import { Dialogo } from "../Dialogo";
import { CamposCliente, CamposEndereco } from "./FormCliente";

interface ModalClienteProps {
  aberto: boolean;
  clienteId: string | null; // null = novo cliente
  whatsappInicial?: string;
  aoFechar: () => void;
  aoSalvar: (cliente: ClienteDetalhado) => void;
}

function paraInput(c: ClienteDetalhado): ClienteInput {
  return {
    nome: c.nome,
    whatsapp: c.whatsapp,
    cpf: c.cpf ?? "",
    email: c.email ?? "",
    observacoes: c.observacoes ?? "",
    status: c.status,
  };
}

function Formulario({ clienteId, whatsappInicial, aoFechar, aoSalvar }: Omit<ModalClienteProps, "aberto">) {
  const [cliente, setCliente] = useState<ClienteInput>({
    ...clienteVazio,
    whatsapp: whatsappInicial?.replace(/\D/g, "") ?? "",
  });
  const [endereco, setEndereco] = useState<EnderecoInput>(enderecoVazio);
  const [enderecoOriginal, setEnderecoOriginal] = useState<{ id: string; valor: string } | null>(
    null
  );
  const [carregando, setCarregando] = useState(clienteId !== null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) return;
    let cancelado = false;

    obterCliente(clienteId)
      .then((c) => {
        if (cancelado) return;
        setCliente(paraInput(c));
        const principal = c.enderecos.find((e) => e.principal) ?? c.enderecos[0];
        if (principal) {
          const valor: EnderecoInput = {
            endereco: principal.endereco,
            complemento: principal.complemento ?? "",
            cep: principal.cep ?? "",
            bairro: principal.bairro ?? "",
            regiaoId: principal.regiaoId ?? "",
            principal: true,
          };
          setEndereco(valor);
          setEnderecoOriginal({ id: principal.id, valor: JSON.stringify(valor) });
        }
      })
      .catch((e) => !cancelado && setErro(mensagemDeErro(e)))
      .finally(() => !cancelado && setCarregando(false));

    return () => {
      cancelado = true;
    };
  }, [clienteId]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problema = clienteValido(cliente) ?? enderecoValido(endereco);
    if (problema) {
      setErro(problema);
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      if (!clienteId) {
        aoSalvar(await criarCliente(cliente, endereco));
        return;
      }

      await atualizarCliente(clienteId, cliente);
      if (!enderecoOriginal) {
        await adicionarEndereco(clienteId, endereco);
      } else if (enderecoOriginal.valor !== JSON.stringify(endereco)) {
        await atualizarEndereco(clienteId, enderecoOriginal.id, endereco);
      }
      aoSalvar(await obterCliente(clienteId));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="py-8 text-center text-sm text-neutral-500">Carregando...</p>;

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Dados do cliente</h3>
        <CamposCliente valor={cliente} aoAlterar={setCliente} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Endereço principal</h3>
        <CamposEndereco valor={endereco} aoAlterar={setEndereco} />
      </section>

      {erro && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={aoFechar} className="rounded-md border px-4 py-2 text-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {salvando ? "Salvando..." : clienteId ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}

export function ModalCliente({ aberto, ...props }: ModalClienteProps) {
  return (
    <Dialogo
      aberto={aberto}
      titulo={props.clienteId ? "Editar cliente" : "Novo cliente"}
      aoFechar={props.aoFechar}
      largura="larga"
    >
      <Formulario key={props.clienteId ?? "novo"} {...props} />
    </Dialogo>
  );
}
