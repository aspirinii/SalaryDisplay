export const won = (n: number, digits = 0) =>
  '₩' + n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
