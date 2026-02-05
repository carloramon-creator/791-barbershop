import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Normaliza o telefone para o formato E.164 (apenas números).
 * Heurística:
 * - Se tiver 10 ou 11 dígitos, assume Brasil e adiciona 55.
 * - Caso contrário, mantém o que foi digitado (internacional).
 */
export function normalizePhone(value: string | undefined | null) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');

  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }

  return clean;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(value: string) {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");

  // Se começar com 55 e tiver o tamanho de um número BR (12 ou 13 dígitos com o 55)
  if (numbers.startsWith("55") && (numbers.length === 12 || numbers.length === 13)) {
    const local = numbers.slice(2);
    return local
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d)(\d{4})$/, "$1-$2");
  }

  // Se for internacional (mais de 11 dígitos e não caiu na regra do 55 BR)
  if (numbers.length > 11) {
    return `+${numbers.slice(0, 2)} ${numbers.slice(2)}`;
  }

  // Formato local BR (sem o 55)
  if (numbers.length <= 11 && numbers.length >= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d)(\d{4})$/, "$1-$2");
  }

  return value;
}

export function formatCPF(value: string) {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

export function isValidCNPJ(cnpj: string) {
  cnpj = cnpj.replace(/[^\d]+/g, '');

  if (cnpj.length !== 14) return false;

  // Elimina CNPJs conhecidos inválidos
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Valida DVs
  let tamanho = cnpj.length - 2
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

export function isValidCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/^(.)\1*$/)) return false;
  const res = [0, 0];
  [9, 10].forEach((j, i) => {
    let soma = 0;
    for (let k = 0; k < j; k++) soma += parseInt(cpf.charAt(k)) * (j + 1 - k);
    res[i] = (soma * 10) % 11 % 10;
  });
  return res[0] === parseInt(cpf.charAt(9)) && res[1] === parseInt(cpf.charAt(10));
}

export function formatIdentification(value: string) {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  if (numbers.length > 11) {
    // CNPJ
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .substring(0, 18);
  }
  // CPF
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .substring(0, 14);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
