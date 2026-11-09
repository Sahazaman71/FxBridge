/** Display formatting. Money math itself lives in `@/onchain-money`. */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max })

/** Format a decimal string (e.g. "1234.5678") for display, without float parsing of the raw value beyond grouping. */
export function formatDecimalString(value: string, minFrac = 2, maxFrac = 4): string {
  if (!/^-?\d+(\.\d*)?$/.test(value)) return '0'
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [whole = '0', frac = ''] = unsigned.split('.')
  const grouped = nf(0, 0).format(BigInt(whole))
  let fracOut = frac.slice(0, maxFrac)
  while (fracOut.length > minFrac && fracOut.endsWith('0')) fracOut = fracOut.slice(0, -1)
  fracOut = fracOut.padEnd(minFrac, '0')
  return `${negative ? '-' : ''}${grouped}${fracOut ? `.${fracOut}` : ''}`
}

export function formatNumber(value: number, minFrac = 2, maxFrac = 2): string {
  if (!Number.isFinite(value)) return '-'
  return nf(minFrac, maxFrac).format(value)
}

export function formatUsd(value: number, maxFrac = 2): string {
  if (!Number.isFinite(value)) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFrac,
  }).format(value)
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return nf(4, 6).format(value)
}

export function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${nf(digits, digits).format(value)}%`
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`
}

export function timeAgo(timestampMs: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestampMs) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function formatDateTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Safe parse of a user-typed decimal for display math only (never for onchain amounts). */
export function toNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Keep only a plain decimal with at most `decimals` fraction digits. Returns null if the input is invalid. */
export function sanitizeAmountInput(raw: string, decimals: number): string | null {
  const value = raw.replace(/,/g, '')
  if (value === '') return ''
  if (!/^\d*\.?\d*$/.test(value)) return null
  const [, frac = ''] = value.split('.')
  if (frac.length > decimals) return null
  return value
}
