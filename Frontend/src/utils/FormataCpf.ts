function soDigitos(cpf: string): string {
  return cpf.replace(/\D/g, "").padStart(11, "0").slice(0, 11);
}

// 95465394369 -> "954.653.943-69"
export function formatarCpf(cpf: string): string {
  const d = soDigitos(cpf);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// 95465394369 -> "954.***.***-69" (para listas, o completo fica só no detalhe)
export function mascararCpf(cpf: string): string {
  const d = soDigitos(cpf);
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}