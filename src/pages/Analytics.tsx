import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useNow } from '@/hooks/useNow'
import { useUsdPrices } from '@/hooks/useMarketData'
import { useAllSwapRecords } from '@/lib/history'
import { useQuoteSamples } from '@/lib/rates'
import { formatDateTime, formatNumber, formatRate, formatUsd } from '@/lib/format'
import { Link } from '@/lib/router'
import { BarChart, LineChart } from '@/components/ui/charts'
import { Badge, GlassCard, SectionHeader, Stat } from '@/components/ui/primitives'
import { useEcbHistory } from '@/hooks/useMarketData'

const DAY = 86_400_000

export default function Analytics() {
  const { address } = useAccount()
  const now = useNow(60_000)
  const all = useAllSwapRecords()
  const prices = useUsdPrices()
  const samples = useQuoteSamples()
  const ecb = useEcbHistory(30)

  const confirmed = useMemo(
    () => (address ? all.filter((r) => r.wallet.toLowerCase() === address.toLowerCase() && r.status === 'confirmed') : []),
    [all, address],
  )

  const stats = useMemo(() => {
    const volumeUsd = prices ? confirmed.reduce((sum, r) => sum + Number(r.amountIn) * prices[r.tokenIn], 0) : null
    const gas = confirmed.reduce((sum, r) => sum + (r.gasFeeUsdc ? Number(r.gasFeeUsdc) : 0), 0)
    const toEurc = confirmed.filter((r) => r.tokenIn === 'USDC')
    const toUsdc = confirmed.filter((r) => r.tokenIn === 'EURC')
    const avg = (list: typeof confirmed) => {
      const rates = list.filter((r) => r.amountOut && Number(r.amountIn) > 0).map((r) => Number(r.amountOut) / Number(r.amountIn))
      return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null
    }
    return { volumeUsd, gas, toEurc: toEurc.length, toUsdc: toUsdc.length, avgToEurc: avg(toEurc), avgToUsdc: avg(toUsdc) }
  }, [confirmed, prices])

  const dailyVolume = useMemo(() => {
    if (!prices) return []
    const startOfToday = new Date(now).setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const dayStart = startOfToday - (6 - i) * DAY
      const total = confirmed
        .filter((r) => r.timestamp >= dayStart && r.timestamp < dayStart + DAY)
        .reduce((sum, r) => sum + Number(r.amountIn) * prices[r.tokenIn], 0)
      return { label: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' }), value: total }
    })
  }, [confirmed, prices, now])

  const sampledToEurc = useMemo(() => samples.filter((s) => s.pair === 'USDC>EURC').map((s) => ({ label: formatDateTime(s.t), value: s.rate })), [samples])
  const ecbSeries = useMemo(() => (ecb.data ?? []).map((p) => ({ label: p.date, value: p.rate })), [ecb.data])

  const hasActivity = confirmed.length > 0

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Analytics"
        title="Volume, activity and rates"
        description="Activity figures cover swaps made with your connected wallet through FXBridge in this browser. There is no global indexer behind them."
        action={<Badge tone="info">Your activity only</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Conversion volume"
          value={stats.volumeUsd !== null ? formatUsd(stats.volumeUsd) : '-'}
          sub="Valued at current Circle feed prices"
        />
        <Stat label="Confirmed swaps" value={confirmed.length} sub={`${stats.toEurc} to EURC · ${stats.toUsdc} to USDC`} />
        <Stat
          label="Avg effective rate"
          value={stats.avgToEurc ? formatRate(stats.avgToEurc) : stats.avgToUsdc ? formatRate(stats.avgToUsdc) : '-'}
          sub={stats.avgToEurc ? 'USDC to EURC, after fees' : stats.avgToUsdc ? 'EURC to USDC, after fees' : 'No swaps yet'}
        />
        <Stat label="Network fees paid" value={`${formatNumber(stats.gas, 2, 4)} USDC`} sub="From onchain receipts" />
      </div>

      {!address ? (
        <p className="text-sm text-[var(--muted)]">Connect a wallet to see your own activity. The rate charts below are available without one.</p>
      ) : !hasActivity ? (
        <div className="glass-inner flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm text-[var(--muted)]">
          No confirmed swaps for this wallet yet.
          <Link to="/exchange" className="btn-primary inline-flex min-h-11 items-center rounded-full px-5 text-xs font-semibold">
            Make a swap
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="display text-lg font-semibold text-[var(--ink)]">Your volume, last 7 days</h3>
            <p className="text-xs text-[var(--subtle)]">Input value of confirmed swaps per day, in USD.</p>
          </div>
          <BarChart data={hasActivity ? dailyVolume : []} formatValue={(v) => formatUsd(v, 0)} emptyMessage="Volume appears here after your first confirmed swap." />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="display text-lg font-semibold text-[var(--ink)]">Conversion activity</h3>
            <p className="text-xs text-[var(--subtle)]">Confirmed swaps by direction.</p>
          </div>
          <BarChart
            data={hasActivity ? [{ label: 'USDC to EURC', value: stats.toEurc }, { label: 'EURC to USDC', value: stats.toUsdc }] : []}
            formatValue={(v) => String(v)}
            emptyMessage="Direction counts appear here after your first confirmed swap."
          />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="display text-lg font-semibold text-[var(--ink)]">USDC to EURC rate, sampled</h3>
              <p className="text-xs text-[var(--subtle)]">Executable quotes recorded in this browser.</p>
            </div>
            <Badge tone="info">Sampled</Badge>
          </div>
          <LineChart data={sampledToEurc} height={190} formatValue={formatRate} emptyMessage="Enter an amount on the Exchange page with a connected wallet to record live quotes." />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="display text-lg font-semibold text-[var(--ink)]">EUR/USD reference, 30 days</h3>
              <p className="text-xs text-[var(--subtle)]">ECB daily rates via Frankfurter.</p>
            </div>
            <Badge tone="neutral">Reference</Badge>
          </div>
          <LineChart data={ecbSeries} height={190} formatValue={formatRate} emptyMessage="Reference history is unavailable right now." />
        </GlassCard>
      </div>
    </div>
  )
}
