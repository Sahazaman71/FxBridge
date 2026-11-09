import { useCallback, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import {
  applyVerification,
  upsertRecord,
  verifySwapOnchain,
  type SwapRecord,
} from '@/lib/history'
import { createAdapter, executeSwap, parseSwapError, type ParsedSwapError, type SwapRequest } from '@/lib/swapKit'
import { ARC_CHAIN_ID } from '@/lib/tokens'
import type { DerivedQuote } from './useQuote'

export type SwapPhase = 'idle' | 'switching' | 'submitting' | 'verifying' | 'confirmed' | 'failed' | 'error'

export interface SwapState {
  phase: SwapPhase
  record: SwapRecord | null
  error: ParsedSwapError | null
}

const IDLE: SwapState = { phase: 'idle', record: null, error: null }
const VERIFY_ATTEMPTS = 8
const VERIFY_DELAY_MS = 2_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Swap state machine. `submit` is the only function that moves funds and must be
 * called from the user's click on the Swap button, never from an effect.
 */
export function useSwap() {
  const { address, connector, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [state, setState] = useState<SwapState>(IDLE)

  const reset = useCallback(() => setState(IDLE), [])

  const switchToArc = useCallback(async () => {
    setState({ phase: 'switching', record: null, error: null })
    try {
      await switchChainAsync({ chainId: ARC_CHAIN_ID })
      setState(IDLE)
    } catch (error) {
      setState({ phase: 'error', record: null, error: parseSwapError(error) })
    }
  }, [switchChainAsync])

  const submit = useCallback(
    async (request: SwapRequest, quote: DerivedQuote, quotedFor: string | null) => {
      if (!address || !connector) return
      if (quotedFor && quotedFor.toLowerCase() !== address.toLowerCase()) {
        setState({
          phase: 'error',
          record: null,
          error: { kind: 'unknown', message: 'The connected account changed after this quote. Review a fresh quote and try again.' },
        })
        return
      }
      try {
        if (chainId !== ARC_CHAIN_ID) {
          setState({ phase: 'switching', record: null, error: null })
          await switchChainAsync({ chainId: ARC_CHAIN_ID })
        }
        setState({ phase: 'submitting', record: null, error: null })
        const adapter = await createAdapter(connector)
        const result = await executeSwap(adapter, request)

        const base: SwapRecord = {
          txHash: result.txHash as `0x${string}`,
          wallet: address,
          tokenIn: request.tokenIn,
          tokenOut: request.tokenOut,
          amountIn: request.amountIn,
          amountOut: result.amountOut ?? null,
          estimatedOut: quote.output,
          minReceived: quote.minReceived,
          slippageBps: request.slippageBps,
          fees: (result.fees ?? [])
            .filter((fee) => fee.amount !== null)
            .map((fee) => ({ type: fee.type, token: fee.token, amount: fee.amount as string })),
          gasFeeUsdc: null,
          provider: result.route?.provider ?? quote.provider,
          status: 'pending',
          verified: false,
          blockNumber: null,
          timestamp: Date.now(),
        }
        upsertRecord(base)
        setState({ phase: 'verifying', record: base, error: null })

        // Only an onchain receipt can mark the swap confirmed.
        for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt += 1) {
          const verification = await verifySwapOnchain(base)
          if (verification) {
            const final = applyVerification(base, verification)
            upsertRecord(final)
            setState({ phase: final.status === 'confirmed' ? 'confirmed' : 'failed', record: final, error: null })
            return
          }
          await sleep(VERIFY_DELAY_MS)
        }
        // Receipt not visible yet: the record stays pending and is re-checked from the Transactions page.
        setState({ phase: 'verifying', record: base, error: null })
      } catch (error) {
        const parsed = parseSwapError(error)
        setState(parsed.kind === 'rejected' ? IDLE : { phase: 'error', record: null, error: parsed })
      }
    },
    [address, connector, chainId, switchChainAsync],
  )

  return { state, submit, reset, switchToArc, busy: ['switching', 'submitting', 'verifying'].includes(state.phase) }
}
