import { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { useEcbHistory, usePriceFeed } from '@/hooks/useMarketData'
import { useRateView } from '@/components/market/MarketSnapshot'
import { addressUrl } from '@/lib/chain'
import { formatPercent, formatRate, formatUsd, shortAddress, formatDateTime } from '@/lib/format'
import { useQuoteSamples } from '@/lib/rates'
import { Link } from '@/lib/router'
import { TOKEN_LIST } from '@/lib/tokens'
import { LineChart, Sparkline } from '@/components/ui/charts'
import { Badge, GlassCard, SectionHeader, Skeleton, TokenIcon } from '@/components/ui/primitives'

type PairKey = 'USDC>EURC' | 'EURC>USDC'

export default function Markets() {
  const feed = usePriceFeed()
  const view = useRateView()
  const ecbHistory = useEcbHistory(30)
  const samples = useQuoteSamples()
  const [pair, setPair] = useState<PairKey>('USDC>EURC')

  const ecbSeries = useMemo(() => (ecbHistory.data ?? []).map((p) => ({ label: p.date, value: p.rate })), [ecbHistory.data])
  const sampledSeries = useMemo(
    () => samples.filter((s) => s.pair === pair).map((s) => ({ label: formatDateTime(s.t), value: s.rate })),
    [samples, pair],
  )

  const ecbChange = ecbSeries.length >= 2 ? ((ecbSeries[ecbSeries.length - 1].value - ecbSeries[0].value) / ecbSeries[0].value) * 100 : null

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Markets"
        title="Supported assets and rates"
        description="Prices come from the Circle price feed for Arc Testnet. The ECB EUR/USD rate is shown beside it as a reference, not a tradable price."
      />

      <GlassCard className="overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[var(--subtle)]">
                <th className="eyebrow px-5 py-4 font-semibold">Asset</th>
                <th className="eyebrow px-3 py-4 font-semibold">Price (USD)</th>
                <th className="eyebrow px-3 py-4 font-semibold">Exchange rate</th>
                <th className="eyebrow px-3 py-4 font-semibold">Reference</th>
                <th className="eyebrow px-3 py-4 font-semibold">30d reference</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {TOKEN_LIST.map((token) => {
                const isEurc = token.symbol === 'EURC'
                const price = isEurc ? view.feedEurcUsd : view.feedUsdcUsd
                const perUsdc = view.feedEurcInUsdc ? (isEurc ? 1 / view.feedEurcInUsdc : 1) : null
                return (
                  <tr key={token.symbol} className="border-b border-white/6 last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={token.symbol} size={34} />
                        <div>
                          <div className="font-semibold text-[var(--ink)]">{token.symbol}</div>
                          <a
                            href={addressUrl(token.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mono inline-flex items-center gap-1 text-[11px] text-[var(--subtle)] hover:text-[var(--ink)]"
                          >
                            {shortAddress(token.address)} <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 tabular-nums text-[var(--ink)]">
                      {feed.isLoading ? <Skeleton className="h-5 w-16" /> : price ? formatUsd(price, 4) : 'Unavailable'}
                    </td>
                    <td className="px-3 py-4 tabular-nums text-[var(--ink)]">
                      {feed.isLoading ? (
                        <Skeleton className="h-5 w-28" />
                      ) : perUsdc ? (
                        isEurc ? (
                          `1 USDC = ${formatRate(perUsdc)} EURC`
                        ) : (
                          `1 EURC = ${formatRate(view.feedEurcInUsdc!)} USDC`
                        )
                      ) : (
                        'Unavailable'
                      )}
                    </td>
                    <td className="px-3 py-4 tabular-nums text-[var(--muted)]">
                      {isEurc && view.ecbRate ? (
                        <div>
                          <div>EUR/USD {formatRate(view.ecbRate)}</div>
                          {view.deviationPct !== null ? <div className="text-[11px] text-[var(--subtle)]">Feed {formatPercent(view.deviationPct)} vs ECB</div> : null}
                        </div>
                      ) : (
                        <span className="text-[var(--subtle)]">{isEurc ? 'Unavailable' : 'Base asset'}</span>
                      )}
                    </td>
                    <td className="px-3 py-4">{isEurc ? <Sparkline data={ecbSeries.map((p) => p.value)} color="#7fa8ff" /> : <span className="text-[var(--subtle)]">-</span>}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/exchange?from=${token.symbol}`}
                        className="glass-inner inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold text-[var(--ink)] hover:bg-white/10"
                      >
                        Swap {token.symbol}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="display text-lg font-semibold text-[var(--ink)]">EUR/USD, last 30 days</h3>
              <p className="text-xs text-[var(--subtle)]">ECB reference rates via Frankfurter. Daily, business days only.</p>
            </div>
            <Badge tone="neutral">Reference</Badge>
          </div>
          {ecbHistory.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <LineChart
              data={ecbSeries}
              height={220}
              formatValue={formatRate}
              emptyMessage="Reference history is unavailable right now. Live exchange rates are not affected."
            />
          )}
          {ecbChange !== null ? <p className="mt-3 text-xs text-[var(--subtle)]">Change over range: {formatPercent(ecbChange)}</p> : null}
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="display text-lg font-semibold text-[var(--ink)]">Executable rate, sampled</h3>
              <p className="text-xs text-[var(--subtle)]">Effective rates (after fees) recorded in this browser while you use the Exchange page.</p>
            </div>
            <Badge tone="info">Sampled</Badge>
          </div>
          <div className="mb-3 flex gap-2">
            {(['USDC>EURC', 'EURC>USDC'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setPair(key)}
                className={clsx(
                  'min-h-11 rounded-full px-4 text-xs font-semibold transition',
                  pair === key ? 'bg-white/14 text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-white/6',
                )}
              >
                {key.replace('>', ' to ')}
              </button>
            ))}
          </div>
          <LineChart
            data={sampledSeries}
            height={190}
            formatValue={formatRate}
            emptyMessage="No quotes recorded yet. Connect a wallet and enter an amount on the Exchange page to start sampling live executable rates."
          />
        </GlassCard>
      </div>
    </div>
  )
}
