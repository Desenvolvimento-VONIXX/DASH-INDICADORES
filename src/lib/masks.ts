export function maskCurrency(value: string) {
  // Remove qualquer caractere que não seja número
  value = value.replace(/[^\d,]/g, "");

  // Se não tiver nada digitado, já retorna '0,00'
  if (value === "") return "";

  // Adiciona ponto de milhar
  value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Junta a parte inteira e decimal com vírgula

  return value;
}

export function unmaskCurrency(value: string) {
  // Remove qualquer caractere que não seja número
  value = value.replace(/\./g, "");

  return value;
}
