import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import { ArrowDownUp, Loader2, RefreshCw } from 'lucide-react'
import { Amount } from '@/onchain-money'
import { useBalances } from '@/hooks/useBalances'
import { usePriceFeed } from '@/hooks/useMarketData'
import { parsePositiveAmount, useQuote } from '@/hooks/useQuote'
import { useSwap } from '@/hooks/useSwap'
import { formatDecimalString, formatNumber, sanitizeAmountInput } from '@/lib/format'
import { AnimatedNumber } from '@/components/ui/motion'
import { ARC_CHAIN_ID, DEFAULT_SLIPPAGE_BPS, LARGE_AMOUNT_WARNING, TOKENS, otherToken, type TokenSymbol } from '@/lib/tokens'
import { GlassCard, Skeleton, TokenIcon } from '@/components/ui/primitives'
import { ReviewPanel } from './ReviewPanel'
import { SlippageSettings } from './SlippageSettings'
import { TxStatus } from './TxStatus'

const formatOutput = (value: number) => formatNumber(value, 2, 6)

/** USDC kept back when using Max so the wallet can still pay Arc network fees. */
const GAS_RESERVE = '0.10'

export function SwapCard({ initialFrom = 'USDC' }: { initialFrom?: TokenSymbol }) {
  const { isConnected, chainId } = useAccount()
  const { setOpen } = useModal()
  const [tokenIn, setTokenIn] = useState<TokenSymbol>(initialFrom)
  const [amount, setAmount] = useState('')
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS)
  const tokenOut = otherToken(tokenIn)

  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useBalances()
  const feed = usePriceFeed()
  const swap = useSwap()
  const phase = swap.state.phase
  const showStatus = phase !== 'idle'
  const inFlight = phase === 'switching' || phase === 'submitting' || phase === 'verifying'
  const finished = phase === 'confirmed' || phase === 'failed'

  const quoteState = useQuote({ tokenIn, tokenOut, amountIn: amount, slippageBps, paused: inFlight || finished })

  useEffect(() => {
    if (finished) void refetchBalances()
  }, [finished, refetchBalances])

  const parsed = useMemo(() => parsePositiveAmount(amount, tokenIn), [amount, tokenIn])
  const balanceIn = balances[tokenIn]
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID
  const insufficient = Boolean(parsed && balanceIn && parsed.gt(balanceIn.amount))

  const feedRate = useMemo(() => {
    if (!feed.data) return null
    return tokenIn === 'USDC' ? feed.data.usdcUsd / feed.data.eurcUsd : feed.data.eurcUsd / feed.data.usdcUsd
  }, [feed.data, tokenIn])

  const warnings = useMemo(() => {
    const list: string[] = []
    if (slippageBps > 100) list.push('Your slippage tolerance is above 1%. The swap may fill at a noticeably worse price.')
    if (parsed && Number(amount) >= LARGE_AMOUNT_WARNING) list.push(`This is a large amount (${formatDecimalString(amount, 0, 2)} ${tokenIn}). Consider swapping in smaller parts.`)
    if (quoteState.quote && feedRate) {
      const deviation = ((quoteState.quote.rate - feedRate) / feedRate) * 100
      if (deviation < -1) list.push(`This quote is ${Math.abs(deviation).toFixed(2)}% worse than the Circle price feed. Check fees and try a different amount.`)
      if (deviation > 1) {
        list.push(
          `This quote is ${deviation.toFixed(2)}% above the Circle price feed. Testnet liquidity is thin and can be priced far from the market, so treat this rate as a testnet quirk, not a market rate.`,
        )
      }
    }
    if (tokenIn === 'USDC' && parsed && balanceIn && !insufficient) {
      const reserve = Amount.parse(GAS_RESERVE, TOKENS.USDC.decimals)
      if (balanceIn.amount.sub(parsed).lt(reserve)) list.push('This leaves under 0.10 USDC for network fees. Arc fees are paid in USDC, so keep a small amount.')
    }
    return list
  }, [slippageBps, parsed, amount, tokenIn, quoteState.quote, feedRate, balanceIn, insufficient])

  const flip = () => {
    setTokenIn(tokenOut)
    setAmount('')
    swap.reset()
  }

  const setMax = () => {
    if (!balanceIn) return
    if (tokenIn === 'USDC') {
      const reserve = Amount.parse(GAS_RESERVE, TOKENS.USDC.decimals)
      const usable = balanceIn.amount.gt(reserve) ? balanceIn.amount.sub(reserve) : Amount.zero(TOKENS.USDC.decimals)
      setAmount(usable.isPositive() ? usable.toString() : '')
    } else {
      setAmount(balanceIn.value)
    }
  }

  const onAmountChange = (raw: string) => {
    const next = sanitizeAmountInput(raw, TOKENS[tokenIn].decimals)
    if (next !== null) setAmount(next)
  }

  const reset = () => {
    swap.reset()
    setAmount('')
  }

  const canSwap = Boolean(quoteState.quote && quoteState.estimate && parsed && !insufficient && !quoteState.error && !inFlight)

  // CTA state, in the order a user hits them.
  let ctaLabel = `Swap ${amount || ''} ${tokenIn} for ${tokenOut}`.replace(/\s+/g, ' ')
  let ctaAction: (() => void) | null = null
  let ctaDisabled = true
  let ctaLoading = false

  if (!isConnected) {
    ctaLabel = 'Connect wallet'
    ctaAction = () => setOpen(true)
    ctaDisabled = false
  } else if (wrongChain) {
    ctaLabel = 'Switch to Arc Testnet'
    ctaAction = () => void swap.switchToArc()
    ctaDisabled = false
  } else if (!parsed) {
    ctaLabel = 'Enter an amount'
  } else if (insufficient) {
    ctaLabel = `Insufficient ${tokenIn} balance`
  } else if (quoteState.isInitialLoading) {
    ctaLabel = 'Fetching quote'
    ctaLoading = true
  } else if (quoteState.error) {
    ctaLabel = 'Quote unavailable'
  } else if (canSwap && quoteState.quote && quoteState.estimate) {
    const { quote, quotedFor } = quoteState
    ctaDisabled = false
    ctaAction = () => void swap.submit({ tokenIn, tokenOut, amountIn: amount, slippageBps }, quote, quotedFor)
  }

  return (
    <GlassCard className="relative p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="display text-xl font-semibold text-[var(--ink)]">Exchange</h2>
          <p className="text-xs text-[var(--subtle)]">USDC and EURC on Arc Testnet</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void quoteState.refetch()}
            disabled={!quoteState.enabled || quoteState.isFetching}
            aria-label="Refresh quote"
            className="flex size-11 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white/8 hover:text-[var(--ink)] disabled:opacity-40"
          >
            <RefreshCw className={quoteState.isFetching ? 'size-4 animate-spin' : 'size-4'} />
          </button>
          <SlippageSettings value={slippageBps} onChange={setSlippageBps} disabled={inFlight} />
        </div>
      </div>

      {/* From */}
      <div className="glass-inner rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">You pay</span>
          <button
            onClick={setMax}
            disabled={!balanceIn || inFlight}
            className="min-h-6 text-xs font-semibold tabular-nums text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:text-[var(--subtle)]"
          >
            {balancesLoading ? 'Loading balance' : balanceIn ? `Balance ${formatDecimalString(balanceIn.value, 2, 4)} · Max` : 'Balance unavailable'}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            disabled={inFlight}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            aria-label={`Amount of ${tokenIn} to pay`}
            className="display min-w-0 flex-1 bg-transparent text-4xl font-semibold tabular-nums text-[var(--ink)] outline-none placeholder:text-white/20"
          />
          <TokenChip symbol={tokenIn} />
        </div>
      </div>

      <div className="relative z-10 -my-3 flex justify-center">
        <button
          onClick={flip}
          disabled={inFlight}
          aria-label="Swap direction"
          className="flex size-11 items-center justify-center rounded-full border border-white/14 bg-[#0d1b2f] text-[var(--accent)] shadow-lg transition hover:rotate-180 hover:bg-[#14253d] active:scale-95 disabled:opacity-40"
          style={{ transitionDuration: '300ms' }}
        >
          <ArrowDownUp className="size-4" />
        </button>
      </div>

      {/* To */}
      <div className="glass-inner rounded-2xl p-4 pt-5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">You receive (estimated)</span>
          <span className="text-xs tabular-nums text-[var(--subtle)]">
            {balances[tokenOut] ? `Balance ${formatDecimalString(balances[tokenOut].value, 2, 4)}` : ''}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="display min-w-0 flex-1 truncate text-4xl font-semibold tabular-nums">
            {quoteState.isInitialLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : quoteState.quote ? (
              <AnimatedNumber
                className="text-[var(--ink)]"
                value={Number(quoteState.quote.output)}
                format={formatOutput}
                finalText={formatDecimalString(quoteState.quote.output, 2, 6)}
              />
            ) : (
              <span className="text-white/20">0.00</span>
            )}
          </div>
          <TokenChip symbol={tokenOut} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isConnected && !wrongChain && parsed && quoteState.error ? (
          <div className="rounded-xl bg-rose-400/10 p-3 text-sm text-[var(--danger)]">
            {quoteState.error.message}
            <button onClick={() => void quoteState.refetch()} className="ml-2 font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        ) : null}

        {quoteState.quote && parsed && !showStatus ? (
          <ReviewPanel
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            amountIn={amount}
            quote={quoteState.quote}
            slippageBps={slippageBps}
            feedRate={feedRate}
            updatedAt={quoteState.updatedAt}
            isFetching={quoteState.isFetching}
            warnings={warnings}
          />
        ) : null}

        {showStatus ? <TxStatus state={swap.state} onReset={phase === 'error' ? swap.reset : reset} /> : null}

        {!finished && phase !== 'verifying' ? (
          <button
            onClick={() => ctaAction?.()}
            disabled={ctaDisabled || !ctaAction || inFlight}
            className="btn-primary flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {ctaLoading || inFlight ? <Loader2 className="size-4 animate-spin" /> : null}
            {inFlight ? (phase === 'switching' ? 'Switching network' : 'Confirm in wallet') : ctaLabel}
          </button>
        ) : null}
      </div>
    </GlassCard>
  )
}

function TokenChip({ symbol }: { symbol: TokenSymbol }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/6 py-1.5 pl-1.5 pr-3.5">
      <TokenIcon symbol={symbol} size={28} />
      <span className="text-sm font-semibold text-[var(--ink)]">{symbol}</span>
    </div>
  )
}
