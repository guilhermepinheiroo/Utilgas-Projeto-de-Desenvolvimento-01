import type { ReactNode } from "react";
import { useConsulta } from "../../hooks/UseConsulta";
import { buscarRegioes } from "../../services/Clientes";
import type { ClienteInput, EnderecoInput, StatusCliente } from "../../types/clientes";
import { formatarCentavos } from "../../utils/FormatacaoMoeda";
import { formatarTelefone } from "../../utils/FormatacaoTelefone";

const classeCampo =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-verde-painel";

export function Campo({
  rotulo,
  children,
  className = "",
}: {
  rotulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-neutral-700 ${className}`}>
      {rotulo}
      {children}
    </label>
  );
}

interface CamposClienteProps {
  valor: ClienteInput;
  aoAlterar: (valor: ClienteInput) => void;
  mostrarStatus?: boolean;
}

export function CamposCliente({ valor, aoAlterar, mostrarStatus = true }: CamposClienteProps) {
  const alterar = <K extends keyof ClienteInput>(campo: K, v: ClienteInput[K]) =>
    aoAlterar({ ...valor, [campo]: v });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Campo rotulo="Nome completo *" className="sm:col-span-2">
        <input
          required
          value={valor.nome}
          onChange={(e) => alterar("nome", e.target.value)}
          className={classeCampo}
        />
      </Campo>
      <Campo rotulo="WhatsApp *">
        <input
          required
          type="tel"
          inputMode="numeric"
          value={formatarTelefone(valor.whatsapp)}
          onChange={(e) => alterar("whatsapp", e.target.value.replace(/\D/g, ""))}
          placeholder="(53) 98812-4477"
          className={classeCampo}
        />
      </Campo>
      <Campo rotulo="CPF/CNPJ">
        <input
          inputMode="numeric"
          value={valor.cpf}
          onChange={(e) => alterar("cpf", e.target.value.replace(/\D/g, "").slice(0, 14))}
          className={classeCampo}
        />
      </Campo>
      <Campo rotulo="E-mail">
        <input
          type="email"
          value={valor.email}
          onChange={(e) => alterar("email", e.target.value)}
          className={classeCampo}
        />
      </Campo>
      {mostrarStatus && (
        <Campo rotulo="Status">
          <select
            value={valor.status}
            onChange={(e) => alterar("status", e.target.value as StatusCliente)}
            className={classeCampo}
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="inadimplente">Inadimplente</option>
          </select>
        </Campo>
      )}
      <Campo rotulo="Observações" className="sm:col-span-2">
        <textarea
          rows={2}
          value={valor.observacoes}
          onChange={(e) => alterar("observacoes", e.target.value)}
          className={`${classeCampo} resize-none`}
        />
      </Campo>
    </div>
  );
}

interface CamposEnderecoProps {
  valor: EnderecoInput;
  aoAlterar: (valor: EnderecoInput) => void;
}

export function CamposEndereco({ valor, aoAlterar }: CamposEnderecoProps) {
  const regioes = useConsulta(buscarRegioes, "regioes");
  const alterar = <K extends keyof EnderecoInput>(campo: K, v: EnderecoInput[K]) =>
    aoAlterar({ ...valor, [campo]: v });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Campo rotulo="Rua e número *" className="sm:col-span-2">
        <input
          required
          value={valor.endereco}
          onChange={(e) => alterar("endereco", e.target.value)}
          placeholder="R. Santos Dumont, 412"
          className={classeCampo}
        />
      </Campo>
      <Campo rotulo="Complemento">
        <input
          value={valor.complemento}
          onChange={(e) => alterar("complemento", e.target.value)}
          placeholder="casa, apto 201..."
          className={classeCampo}
        />
      </Campo>
      <Campo rotulo="Bairro">
        <input
          value={valor.bairro}
          onChange={(e) => alterar("bairro", e.target.value)}
          className={classeCampo}
        />
      </Campo>
      <Campo rotulo="CEP">
        <input
          inputMode="numeric"
          value={valor.cep}
          onChange={(e) => alterar("cep", e.target.value.replace(/\D/g, "").slice(0, 8))}
          className={classeCampo}
        />
      </Campo>
      <Campo rotulo="Região de entrega *">
        <select
          required
          value={valor.regiaoId}
          onChange={(e) => alterar("regiaoId", e.target.value)}
          className={classeCampo}
        >
          <option value="">Selecione</option>
          {(regioes.dados ?? []).map((regiao) => (
            <option key={regiao.id} value={regiao.id}>
              {regiao.nome} ({formatarCentavos(regiao.taxaEntregaCentavos)})
            </option>
          ))}
        </select>
      </Campo>
      {regioes.erro && <p className="text-xs text-red-600 sm:col-span-2">{regioes.erro}</p>}
    </div>
  );
}
