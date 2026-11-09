import { useSyncExternalStore } from 'react'
import { erc20Abi, getAddress, parseEventLogs } from 'viem'
import { Amount, gasTokenDecimalsFor, gasTokenToUsdc } from '@/onchain-money'
import { publicClient } from './chain'
import { ARC_CHAIN_ID, TOKENS, type TokenSymbol } from './tokens'

export type SwapStatus = 'pending' | 'confirmed' | 'failed'

export interface SwapFeeRecord {
  type: string
  token: string
  amount: string
}

export interface SwapRecord {
  txHash: `0x${string}`
  wallet: `0x${string}`
  tokenIn: TokenSymbol
  tokenOut: TokenSymbol
  /** Input amount as a decimal string. Taken from the onchain transfer when verified. */
  amountIn: string
  /** Received amount as a decimal string. Null until verified onchain. */
  amountOut: string | null
  estimatedOut: string
  minReceived: string
  slippageBps: number
  fees: SwapFeeRecord[]
  /** Network fee actually paid, in USDC (ERC-20 view). Null until verified. */
  gasFeeUsdc: string | null
  provider: string | null
  status: SwapStatus
  /** True once the receipt was read from the chain. */
  verified: boolean
  blockNumber: string | null
  timestamp: number
}

const STORAGE_KEY = 'fxbridge:swaps:v1'
const CHANGE_EVENT = 'fxbridge:swaps-changed'

let cache: SwapRecord[] | null = null

function read(): SwapRecord[] {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cache = Array.isArray(parsed) ? (parsed as SwapRecord[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(records: SwapRecord[]) {
  cache = records
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Storage can be unavailable (private mode); the in-memory copy still serves this session.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null
      listener()
    }
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function upsertRecord(record: SwapRecord) {
  const records = read()
  const index = records.findIndex((r) => r.txHash.toLowerCase() === record.txHash.toLowerCase())
  const next = index === -1 ? [record, ...records] : records.map((r, i) => (i === index ? record : r))
  write(next.sort((a, b) => b.timestamp - a.timestamp))
}

/** All records saved in this browser. Filter by wallet in the caller. */
export function useAllSwapRecords(): SwapRecord[] {
  return useSyncExternalStore(subscribe, read, read)
}

export function useSwapRecords(wallet: string | undefined): SwapRecord[] {
  const all = useAllSwapRecords()
  if (!wallet) return []
  const lower = wallet.toLowerCase()
  return all.filter((r) => r.wallet.toLowerCase() === lower)
}

export interface Verification {
  status: SwapStatus
  blockNumber: bigint
  amountIn: string | null
  amountOut: string | null
  gasFeeUsdc: string | null
}

/**
 * Read the receipt from Arc and confirm what actually moved. Returns null when the
 * transaction is not yet found, so callers can keep it pending instead of guessing.
 */
export async function verifySwapOnchain(record: Pick<SwapRecord, 'txHash' | 'wallet' | 'tokenIn' | 'tokenOut'>): Promise<Verification | null> {
  let receipt
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: record.txHash })
  } catch {
    return null
  }

  const wallet = getAddress(record.wallet)
  const tokenIn = TOKENS[record.tokenIn]
  const tokenOut = TOKENS[record.tokenOut]
  const transfers = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs })

  let sent = 0n
  let received = 0n
  for (const log of transfers) {
    if (log.args.from === wallet && getAddress(log.address) === getAddress(tokenIn.address)) sent += log.args.value
    if (log.args.to === wallet && getAddress(log.address) === getAddress(tokenOut.address)) received += log.args.value
  }

  const gasNative = Amount.fromRaw(receipt.gasUsed * receipt.effectiveGasPrice, gasTokenDecimalsFor(ARC_CHAIN_ID))
  const gasFeeUsdc = gasTokenToUsdc(ARC_CHAIN_ID, gasNative, 'trunc')

  const success = receipt.status === 'success'
  return {
    status: success ? 'confirmed' : 'failed',
    blockNumber: receipt.blockNumber,
    amountIn: success && sent > 0n ? Amount.fromRaw(sent, tokenIn.decimals).toString() : null,
    amountOut: success && received > 0n ? Amount.fromRaw(received, tokenOut.decimals).toString() : null,
    gasFeeUsdc: gasFeeUsdc.toString(),
  }
}

export function applyVerification(record: SwapRecord, v: Verification): SwapRecord {
  return {
    ...record,
    status: v.status,
    verified: true,
    blockNumber: v.blockNumber.toString(),
    amountIn: v.amountIn ?? record.amountIn,
    amountOut: v.amountOut ?? record.amountOut,
    gasFeeUsdc: v.gasFeeUsdc,
  }
}

/** Re-check every unverified record. Safe to call on load. */
export async function reverifyPending(records: SwapRecord[]) {
  for (const record of records) {
    if (record.verified) continue
    const v = await verifySwapOnchain(record)
    if (v) upsertRecord(applyVerification(record, v))
  }
}
