import { AppKit, type SwapEstimate, type SwapResult } from '@circle-fin/app-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import type { EIP1193Provider } from 'viem'
import { SWAP_CHAIN, type TokenSymbol } from './tokens'

/** Keyless browser swaps: no API key or secret is ever used in the browser. */
export const kit = new AppKit()

export type SwapAdapter = Awaited<ReturnType<typeof createViemAdapterFromProvider>>

export interface SwapRequest {
  tokenIn: TokenSymbol
  tokenOut: TokenSymbol
  amountIn: string
  slippageBps: number
}

/** Build an adapter from the connected wallet's own provider. The wallet signs; FXBridge never sees keys. */
export async function createAdapter(connector: { getProvider(): Promise<unknown> }): Promise<SwapAdapter> {
  const provider = (await connector.getProvider()) as EIP1193Provider
  return createViemAdapterFromProvider({ provider })
}

export function estimateSwap(adapter: SwapAdapter, request: SwapRequest): Promise<SwapEstimate> {
  return kit.estimateSwap({
    from: { adapter, chain: SWAP_CHAIN },
    tokenIn: request.tokenIn,
    tokenOut: request.tokenOut,
    amountIn: request.amountIn,
    config: { slippageBps: request.slippageBps },
  })
}

/** Moves funds. Call only from a user click on the Swap button, never from an effect. */
export function executeSwap(adapter: SwapAdapter, request: SwapRequest): Promise<SwapResult> {
  return kit.swap({
    from: { adapter, chain: SWAP_CHAIN },
    tokenIn: request.tokenIn,
    tokenOut: request.tokenOut,
    amountIn: request.amountIn,
    config: { slippageBps: request.slippageBps },
  })
}

export type { SwapEstimate, SwapResult }

export type SwapErrorKind =
  | 'rejected'
  | 'insufficient_balance'
  | 'insufficient_gas'
  | 'no_route'
  | 'network'
  | 'reverted'
  | 'unknown'

export interface ParsedSwapError {
  kind: SwapErrorKind
  message: string
}

function collectMessage(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message)
      current = (current as Error & { cause?: unknown }).cause
    } else if (typeof current === 'string') {
      parts.push(current)
      break
    } else {
      break
    }
  }
  return parts.join(' | ').toLowerCase()
}

/** Turn SDK and wallet errors into plain messages. Raw errors are never shown to users. */
export function parseSwapError(error: unknown): ParsedSwapError {
  const text = collectMessage(error)
  const code = (error as { code?: number } | null)?.code
  if (code === 4001 || text.includes('user rejected') || text.includes('user denied') || text.includes('rejected the request')) {
    return { kind: 'rejected', message: 'Signature cancelled. Nothing was sent.' }
  }
  if (text.includes('insufficient funds for gas') || text.includes('gas required exceeds') || text.includes('insufficient gas')) {
    return { kind: 'insufficient_gas', message: 'Not enough USDC to cover network fees. Get testnet USDC and try again.' }
  }
  if (text.includes('insufficient') || text.includes('exceeds balance') || text.includes('transfer amount exceeds')) {
    return { kind: 'insufficient_balance', message: 'Your balance is too low for this swap.' }
  }
  if (text.includes('no route') || text.includes('no available quotes') || text.includes('no quote') || text.includes('route not found')) {
    return { kind: 'no_route', message: 'No liquidity route is available for this pair and amount right now. Try a smaller amount.' }
  }
  if (text.includes('slippage') || text.includes('stop limit') || text.includes('minimum') || text.includes('reverted')) {
    return { kind: 'reverted', message: 'The price moved beyond your slippage limit, so the swap did not complete. Review a fresh quote and retry.' }
  }
  if (text.includes('network') || text.includes('timeout') || text.includes('fetch') || text.includes('http request failed') || text.includes('rate limit')) {
    return { kind: 'network', message: 'Network issue while contacting the swap service. Check your connection and retry.' }
  }
  return { kind: 'unknown', message: 'The swap could not be completed. Please review the quote and try again.' }
}
