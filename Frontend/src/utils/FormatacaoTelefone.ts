const CODIGO_DO_BRASIL = "55";

export function digitosDoTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  const veioComCodigoDoPais =
    digitos.startsWith(CODIGO_DO_BRASIL) &&
    (digitos.length === 13 || (digitos.length === 12 && valor.trim().startsWith("+")));
  return (veioComCodigoDoPais ? digitos.slice(CODIGO_DO_BRASIL.length) : digitos).slice(0, 11);
}

export function formatarTelefone(valor: string): string {
  const numeros = digitosDoTelefone(valor);

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

export function telefoneCompleto(valor: string): boolean {
  return valor.replace(/\D/g, "").length === 11;
}