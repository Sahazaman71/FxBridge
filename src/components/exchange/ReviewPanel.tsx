import { motion } from 'framer-motion'
import { AlertTriangle, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNow } from '@/hooks/useNow'
import { QUOTE_REFRESH_MS, type DerivedQuote } from '@/hooks/useQuote'
import { formatDecimalString, formatPercent, formatRate } from '@/lib/format'
import type { TokenSymbol } from '@/lib/tokens'

const FEE_LABELS: Record<string, string> = {
  provider: 'Swap provider fee',
  swap: 'Routing fee',
  gas: 'Network fee',
  developer: 'Service fee',
}

function Row({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-[var(--muted)]" title={hint}>
        {label}
      </span>
      <span className="text-right font-medium tabular-nums text-[var(--ink)]">{value}</span>
    </div>
  )
}

interface ReviewPanelProps {
  tokenIn: TokenSymbol
  tokenOut: TokenSymbol
  amountIn: string
  quote: DerivedQuote
  slippageBps: number
  /** Output per 1 input implied by the Circle price feed, or null when unavailable. */
  feedRate: number | null
  updatedAt: number | null
  isFetching: boolean
  warnings: string[]
}

/** Everything the user pays and receives, shown before they sign. */
export function ReviewPanel({ tokenIn, tokenOut, amountIn, quote, slippageBps, feedRate, updatedAt, isFetching, warnings }: ReviewPanelProps) {
  const now = useNow(1000)
  const ageSeconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null
  const deviation = feedRate && feedRate > 0 ? ((quote.rate - feedRate) / feedRate) * 100 : null
  const hasGasFee = quote.fees.some((fee) => fee.type === 'gas')

  return (
    <motion.div
      className="glass-inner rounded-2xl p-4"
      aria-live="polite"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="eyebrow">Review before you sign</span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--subtle)]">
          <span className={isFetching ? 'live-dot text-[var(--accent)]' : 'live-dot text-[var(--success)]'} />
          {isFetching ? 'Refreshing quote' : ageSeconds !== null ? `Quote ${ageSeconds}s old, refreshes every ${QUOTE_REFRESH_MS / 1000}s` : 'Live quote'}
        </span>
      </div>

      <Row label="You pay" value={`${formatDecimalString(amountIn, 2, 6)} ${tokenIn}`} />
      <Row label="Estimated output" value={`${formatDecimalString(quote.output, 2, 6)} ${tokenOut}`} />
      <Row label="Effective rate" value={`1 ${tokenIn} = ${formatRate(quote.rate)} ${tokenOut}`} hint="Output per 1 unit paid, after fees" />
      {feedRate ? (
        <Row
          label="Circle price feed"
          value={
            <span>
              1 {tokenIn} = {formatRate(feedRate)} {tokenOut}
              {deviation !== null ? (
                <span className="ml-1.5 text-xs" style={{ color: Math.abs(deviation) > 0.5 ? 'var(--warn)' : 'var(--subtle)' }}>
                  ({formatPercent(deviation)})
                </span>
              ) : null}
            </span>
          }
          hint="Reference mid-market rate, before fees and slippage"
        />
      ) : null}
      <Row
        label={`Minimum received (${(slippageBps / 100).toFixed(2)}% slippage)`}
        value={`${formatDecimalString(quote.minReceived, 2, 6)} ${tokenOut}`}
        hint="The swap is rejected if it would fill below this amount"
      />

      <div className="my-2 h-px bg-white/8" />

      {quote.fees.length > 0 ? (
        quote.fees.map((fee, index) => (
          <Row key={`${fee.type}-${index}`} label={FEE_LABELS[fee.type] ?? 'Fee'} value={`${formatDecimalString(fee.amount, 2, 6)} ${fee.token}`} />
        ))
      ) : (
        <Row label="Swap fees" value="None reported" />
      )}
      {!hasGasFee ? <Row label="Network fee" value="Paid in USDC, shown in your wallet" hint="Arc uses USDC as its gas token" /> : null}
      <Row label="Route" value={quote.provider ? `via ${quote.provider}` : 'Provider chosen at execution'} hint="A third-party aggregator or Circle routes the swap" />

      {warnings.length > 0 ? (
        <div className="mt-3 space-y-2">
          {warnings.map((warning) => (
            <div key={warning} className="flex gap-2 rounded-xl bg-amber-300/10 p-3 text-xs text-[var(--warn)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2 text-[11px] leading-relaxed text-[var(--subtle)]">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Estimates are not guaranteed. This swap is routed through a swap service provider, a third-party aggregator or Circle, and is subject to its terms.
      </div>
    </motion.div>
  )
}
