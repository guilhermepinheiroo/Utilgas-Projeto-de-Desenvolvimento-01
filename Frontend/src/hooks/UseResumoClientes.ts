import { buscarResumoClientes } from "../services/Clientes";
import { useConsulta } from "./UseConsulta";

export function useResumoClientes() {
  const consulta = useConsulta(buscarResumoClientes, "resumo");
  return { resumo: consulta.dados ?? null, erro: consulta.erro, recarregar: consulta.recarregar };
}
