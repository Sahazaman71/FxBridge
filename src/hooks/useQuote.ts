import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { Amount } from '@/onchain-money'
import { createAdapter, estimateSwap, parseSwapError, type ParsedSwapError, type SwapEstimate } from '@/lib/swapKit'
import { recordQuoteSample } from '@/lib/rates'
import { ARC_CHAIN_ID, TOKENS, type TokenSymbol } from '@/lib/tokens'

export const QUOTE_REFRESH_MS = 15_000

export interface QuoteFee {
  type: string
  token: string
  amount: string
}

export interface DerivedQuote {
  /** Estimated output as a decimal string. */
  output: string
  /** Output per 1 unit of input after fees (effective rate). */
  rate: number
  /** Worst-case output at the chosen slippage, as a decimal string. */
  minReceived: string
  fees: QuoteFee[]
  provider: string | null
}

/** Parse a user-typed amount to a positive Amount, or null when empty, zero, or invalid. */
export function parsePositiveAmount(value: string, symbol: TokenSymbol): Amount | null {
  if (!value || value === '.') return null
  try {
    const amount = Amount.parse(value, TOKENS[symbol].decimals)
    return amount.isPositive() ? amount : null
  } catch {
    return null
  }
}

export function deriveQuote(estimate: SwapEstimate, amountIn: string, slippageBps: number): DerivedQuote | null {
  const out = estimate.estimatedOutput
  const outToken = TOKENS[estimate.tokenOut as TokenSymbol]
  if (!outToken) return null
  let outAmount: Amount
  try {
    outAmount = Amount.parse(out.amount, outToken.decimals)
  } catch {
    return null
  }
  const minRaw = (outAmount.raw * BigInt(10_000 - slippageBps)) / 10_000n
  const minReceived = Amount.fromRaw(minRaw, outToken.decimals).toString()
  const input = Number(amountIn)
  const rate = input > 0 ? Number(out.amount) / input : 0
  const fees: QuoteFee[] = (estimate.fees ?? [])
    .filter((fee) => fee.amount !== null && Number(fee.amount) > 0)
    .map((fee) => ({ type: fee.type, token: fee.token, amount: fee.amount as string }))
  return {
    output: out.amount,
    rate,
    minReceived,
    fees,
    provider: estimate.route?.provider ?? null,
  }
}

interface UseQuoteParams {
  tokenIn: TokenSymbol
  tokenOut: TokenSymbol
  amountIn: string
  slippageBps: number
  /** Pause refreshing while a swap is being submitted. */
  paused?: boolean
}

/**
 * Live executable quote from the swap service. Requires a connected wallet on
 * Arc Testnet because the quote is built for the wallet's own address.
 */
export function useQuote({ tokenIn, tokenOut, amountIn, slippageBps, paused }: UseQuoteParams) {
  const { address, connector, chainId, isConnected } = useAccount()
  const parsed = useMemo(() => parsePositiveAmount(amountIn, tokenIn), [amountIn, tokenIn])
  const enabled = Boolean(isConnected && connector && address && chainId === ARC_CHAIN_ID && parsed && !paused)

  const query = useQuery<SwapEstimate, Error>({
    queryKey: ['swap-quote', address, tokenIn, tokenOut, amountIn, slippageBps],
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 30_000,
    refetchInterval: enabled ? QUOTE_REFRESH_MS : false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!connector) throw new Error('Wallet not connected')
      const adapter = await createAdapter(connector)
      return estimateSwap(adapter, { tokenIn, tokenOut, amountIn, slippageBps })
    },
  })

  const derived = useMemo(
    () => (query.data ? deriveQuote(query.data, amountIn, slippageBps) : null),
    [query.data, amountIn, slippageBps],
  )

  // Sample the executable rate so Markets and Analytics can chart real quotes.
  useEffect(() => {
    if (derived && query.dataUpdatedAt) {
      recordQuoteSample({ t: query.dataUpdatedAt, pair: `${tokenIn}>${tokenOut}`, rate: derived.rate })
    }
  }, [derived, query.dataUpdatedAt, tokenIn, tokenOut])

  const error: ParsedSwapError | null = query.isError ? parseSwapError(query.error) : null

  return {
    enabled,
    estimate: query.data ?? null,
    quote: derived,
    isFetching: query.isFetching,
    isInitialLoading: query.isFetching && !query.data,
    error,
    updatedAt: query.dataUpdatedAt || null,
    refetch: query.refetch,
    quotedFor: address ?? null,
  }
}
