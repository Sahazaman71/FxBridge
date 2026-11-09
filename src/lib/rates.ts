import { useSyncExternalStore } from 'react'
import { kit } from './swapKit'
import { SWAP_CHAIN, TOKENS, type TokenSymbol } from './tokens'

/* ------------------------------------------------------------------ */
/* Source 1: Circle price feed (USD price per token on Arc Testnet)    */
/* ------------------------------------------------------------------ */

export interface PriceFeed {
  usdcUsd: number
  eurcUsd: number
  /** Implied EURC per USDC price ratio: how many USDC one EURC is worth. */
  eurcInUsdc: number
  fetchedAt: number
}

export async function fetchPriceFeed(): Promise<PriceFeed> {
  const { rates } = await kit.getTokenRates({ chain: SWAP_CHAIN, tokens: ['USDC', 'EURC'] })
  const chainRates = rates[SWAP_CHAIN] ?? {}
  const usdc = chainRates[TOKENS.USDC.address.toLowerCase()]
  const eurc = chainRates[TOKENS.EURC.address.toLowerCase()]
  if (!usdc || !eurc) throw new Error('Price feed returned no rate for USDC or EURC')
  const usdcUsd = Number(usdc.priceUSD)
  const eurcUsd = Number(eurc.priceUSD)
  if (!(usdcUsd > 0) || !(eurcUsd > 0)) throw new Error('Price feed returned an invalid rate')
  return {
    usdcUsd,
    eurcUsd,
    eurcInUsdc: eurcUsd / usdcUsd,
    fetchedAt: Math.max(usdc.fetchedAt, eurc.fetchedAt),
  }
}

/* ------------------------------------------------------------------ */
/* Source 2: ECB reference rates via Frankfurter (EUR/USD, reference)  */
/* ------------------------------------------------------------------ */

const FRANKFURTER = 'https://api.frankfurter.dev/v1'

export interface EcbPoint {
  date: string
  /** USD per 1 EUR. */
  rate: number
}

export async function fetchEcbLatest(): Promise<EcbPoint> {
  const response = await fetch(`${FRANKFURTER}/latest?base=EUR&symbols=USD`)
  if (!response.ok) throw new Error(`Reference rate unavailable (${response.status})`)
  const body = (await response.json()) as { date: string; rates: { USD: number } }
  return { date: body.date, rate: body.rates.USD }
}

export async function fetchEcbHistory(days = 30): Promise<EcbPoint[]> {
  const end = new Date()
  const start = new Date(end.getTime() - days * 86_400_000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const response = await fetch(`${FRANKFURTER}/${iso(start)}..${iso(end)}?base=EUR&symbols=USD`)
  if (!response.ok) throw new Error(`Reference history unavailable (${response.status})`)
  const body = (await response.json()) as { rates: Record<string, { USD: number }> }
  return Object.entries(body.rates)
    .map(([date, value]) => ({ date, rate: value.USD }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/* ------------------------------------------------------------------ */
/* Source 3: executable quotes sampled while the app is open           */
/* ------------------------------------------------------------------ */

export interface QuoteSample {
  t: number
  pair: `${TokenSymbol}>${TokenSymbol}`
  /** Output received per 1 unit of input, after fees. */
  rate: number
}

const SAMPLE_KEY = 'fxbridge:quote-samples:v1'
const SAMPLE_EVENT = 'fxbridge:quote-samples-changed'
const MAX_SAMPLES = 600
const MIN_GAP_MS = 20_000

let sampleCache: QuoteSample[] | null = null

function readSamples(): QuoteSample[] {
  if (sampleCache) return sampleCache
  try {
    const raw = window.localStorage.getItem(SAMPLE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    sampleCache = Array.isArray(parsed) ? (parsed as QuoteSample[]) : []
  } catch {
    sampleCache = []
  }
  return sampleCache
}

export function recordQuoteSample(sample: QuoteSample) {
  if (!(sample.rate > 0) || !Number.isFinite(sample.rate)) return
  const samples = readSamples()
  const last = [...samples].reverse().find((s) => s.pair === sample.pair)
  if (last && sample.t - last.t < MIN_GAP_MS) return
  sampleCache = [...samples, sample].slice(-MAX_SAMPLES)
  try {
    window.localStorage.setItem(SAMPLE_KEY, JSON.stringify(sampleCache))
  } catch {
    // keep in-memory copy
  }
  window.dispatchEvent(new Event(SAMPLE_EVENT))
}

function subscribeSamples(listener: () => void) {
  window.addEventListener(SAMPLE_EVENT, listener)
  return () => window.removeEventListener(SAMPLE_EVENT, listener)
}

export function useQuoteSamples(): QuoteSample[] {
  return useSyncExternalStore(subscribeSamples, readSamples, readSamples)
}
