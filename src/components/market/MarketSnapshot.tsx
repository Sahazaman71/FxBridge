import { useMemo, type ReactNode } from 'react'
import { AnimatedNumber } from '@/components/ui/motion'
import { useEcbLatest, usePriceFeed } from '@/hooks/useMarketData'
import { useNow } from '@/hooks/useNow'
import { formatPercent, formatRate, formatUsd, timeAgo } from '@/lib/format'
import { Badge, GlassCard, Skeleton } from '@/components/ui/primitives'

export interface RateView {
  /** EURC priced in USDC (USDC per 1 EURC) from the Circle price feed. */
  feedEurcInUsdc: number | null
  feedUsdcUsd: number | null
  feedEurcUsd: number | null
  feedFetchedAt: number | null
  /** ECB EUR/USD reference. */
  ecbRate: number | null
  ecbDate: string | null
  /** Premium of the feed over the ECB reference, percent. */
  deviationPct: number | null
  isLoading: boolean
  feedError: boolean
}

export function useRateView(): RateView {
  const feed = usePriceFeed()
  const ecb = useEcbLatest()
  return useMemo(() => {
    const feedEurcInUsdc = feed.data?.eurcInUsdc ?? null
    const ecbRate = ecb.data?.rate ?? null
    return {
      feedEurcInUsdc,
      feedUsdcUsd: feed.data?.usdcUsd ?? null,
      feedEurcUsd: feed.data?.eurcUsd ?? null,
      feedFetchedAt: feed.data?.fetchedAt ?? null,
      ecbRate,
      ecbDate: ecb.data?.date ?? null,
      deviationPct: feedEurcInUsdc && ecbRate ? ((feedEurcInUsdc - ecbRate) / ecbRate) * 100 : null,
      isLoading: feed.isLoading,
      feedError: feed.isError,
    }
  }, [feed.data, feed.isLoading, feed.isError, ecb.data])
}

/** Live rates panel: Circle price feed (live) next to the ECB reference (not executable). */
export function MarketSnapshot() {
  const view = useRateView()
  const now = useNow(1000)

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="display text-lg font-semibold text-[var(--ink)]">Live rates</h3>
        <Badge tone={view.feedError ? 'danger' : 'success'}>
          <span className="live-dot" />
          {view.feedError ? 'Feed unavailable' : view.feedFetchedAt ? `Updated ${timeAgo(view.feedFetchedAt, now)}` : 'Connecting'}
        </Badge>
      </div>

      <div className="space-y-3">
        <RateLine
          label="1 EURC in USDC"
          source="Circle price feed"
          loading={view.isLoading}
          value={view.feedEurcInUsdc ? <><AnimatedNumber value={view.feedEurcInUsdc} format={formatRate} /> USDC</> : view.feedError ? 'Unavailable' : '-'}
        />
        <RateLine
          label="1 USDC in EURC"
          source="Circle price feed"
          loading={view.isLoading}
          value={view.feedEurcInUsdc ? <><AnimatedNumber value={1 / view.feedEurcInUsdc} format={formatRate} /> EURC</> : view.feedError ? 'Unavailable' : '-'}
        />
        <RateLine
          label="EUR/USD"
          source={view.ecbDate ? `ECB reference, ${view.ecbDate}` : 'ECB reference'}
          loading={false}
          value={view.ecbRate ? formatRate(view.ecbRate) : 'Unavailable'}
          reference
        />
      </div>

      {view.deviationPct !== null ? (
        <p className="mt-4 text-xs text-[var(--subtle)]">
          Circle feed vs ECB reference:{' '}
          <span className="tabular-nums" style={{ color: Math.abs(view.deviationPct) > 1 ? 'var(--warn)' : 'var(--muted)' }}>
            {formatPercent(view.deviationPct)}
          </span>
          . The ECB figure is a reference only and cannot be traded.
        </p>
      ) : null}
      {view.feedUsdcUsd ? (
        <p className="mt-1 text-xs text-[var(--subtle)]">
          USDC {formatUsd(view.feedUsdcUsd, 4)} · EURC {view.feedEurcUsd ? formatUsd(view.feedEurcUsd, 4) : '-'}
        </p>
      ) : null}
    </GlassCard>
  )
}

function RateLine({ label, source, value, loading, reference }: { label: string; source: string; value: ReactNode; loading: boolean; reference?: boolean }) {
  return (
    <div className="glass-inner flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div>
        <div className="text-sm font-medium text-[var(--ink)]">{label}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--subtle)]">
          {source}
          {reference ? <Badge tone="neutral">Reference</Badge> : null}
        </div>
      </div>
      {loading ? <Skeleton className="h-6 w-24" /> : <div className="display text-lg font-semibold tabular-nums text-[var(--ink)]">{value}</div>}
    </div>
  )
}
