export const CURRENCIES = [
  'USD',
  'SGD',
  'MYR',
  'EUR',
  'GBP',
  'AUD',
  'HKD',
  'TWD',
  'JPY',
  'THB',
  'IDR',
  'PHP',
] as const

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
