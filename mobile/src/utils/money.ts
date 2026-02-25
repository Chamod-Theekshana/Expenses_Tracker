export function formatMoney(n: number) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}₨.${abs.toFixed(2)}`;
}
