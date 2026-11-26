export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// 28411794052 -> "284.117.940-52"
// 12345678000195 -> "12.345.678/0001-95"
export function formatarCpfCnpj(valor: string): string {
  const d = soDigitos(valor).slice(0, 14);

  if (d.length <= 11) {
    let resultado = d.slice(0, 3);
    if (d.length > 3) resultado += `.${d.slice(3, 6)}`;
    if (d.length > 6) resultado += `.${d.slice(6, 9)}`;
    if (d.length > 9) resultado += `-${d.slice(9, 11)}`;
    return resultado;
  }

  let resultado = d.slice(0, 2);
  if (d.length > 2) resultado += `.${d.slice(2, 5)}`;
  if (d.length > 5) resultado += `.${d.slice(5, 8)}`;
  if (d.length > 8) resultado += `/${d.slice(8, 12)}`;
  if (d.length > 12) resultado += `-${d.slice(12, 14)}`;

  return resultado;
}

export function formatarCep(valor: string): string {
  const d = soDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function validarCpf(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const calcularDigito = (digitos: string, pesoInicial: number): number => {
    const soma = [...digitos].reduce(
      (total, digito, indice) => total + Number(digito) * (pesoInicial - indice),
      0
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    Number(d[9]) === calcularDigito(d.slice(0, 9), 10) &&
    Number(d[10]) === calcularDigito(d.slice(0, 10), 11)
  );
}

// Valida apenas se possui 14 dígitos
export function validarCnpj(valor: string): boolean {
  const d = soDigitos(valor);
  return d.length === 14;
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}