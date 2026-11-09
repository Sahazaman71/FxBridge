import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import { ArrowRight, Download, ExternalLink, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { reverifyPending, useSwapRecords, type SwapRecord, type SwapStatus } from '@/lib/history'
import { formatDateTime, formatDecimalString, formatRate, shortHash } from '@/lib/format'
import { txUrl } from '@/lib/chain'
import { Link } from '@/lib/router'
import { StatusBadge } from '@/components/exchange/RecentSwaps'
import { EmptyState, GlassCard, SectionHeader, TokenIcon } from '@/components/ui/primitives'

type Filter = 'all' | SwapStatus

function effectiveRate(record: SwapRecord): number | null {
  const inAmt = Number(record.amountIn)
  const outAmt = record.amountOut ? Number(record.amountOut) : NaN
  return inAmt > 0 && Number.isFinite(outAmt) ? outAmt / inAmt : null
}

function feeSummary(record: SwapRecord): string {
  const swapFees = record.fees.filter((f) => f.type !== 'gas' && Number(f.amount) > 0).map((f) => `${formatDecimalString(f.amount, 2, 6)} ${f.token}`)
  const gas = record.gasFeeUsdc ? `${formatDecimalString(record.gasFeeUsdc, 2, 6)} USDC network` : null
  const parts = [...swapFees, ...(gas ? [gas] : [])]
  return parts.length ? parts.join(' + ') : record.verified ? 'No swap fee reported' : 'Pending'
}

function toCsv(records: SwapRecord[]): string {
  const header = ['time_iso', 'status', 'token_in', 'amount_in', 'token_out', 'amount_out', 'slippage_bps', 'network_fee_usdc', 'block', 'tx_hash']
  const rows = records.map((r) => [
    new Date(r.timestamp).toISOString(),
    r.status,
    r.tokenIn,
    r.amountIn,
    r.tokenOut,
    r.amountOut ?? '',
    String(r.slippageBps),
    r.gasFeeUsdc ?? '',
    r.blockNumber ?? '',
    r.txHash,
  ])
  return [header, ...rows].map((row) => row.join(',')).join('\n')
}

export default function Transactions() {
  const { address, isConnected } = useAccount()
  const { setOpen } = useModal()
  const records = useSwapRecords(address)
  const [filter, setFilter] = useState<Filter>('all')
  const [checking, setChecking] = useState(false)

  const unverified = useMemo(() => records.filter((r) => !r.verified), [records])

  const recheck = async () => {
    setChecking(true)
    try {
      await reverifyPending(unverified)
    } finally {
      setChecking(false)
    }
  }

  // Re-read any swap that was submitted but not yet confirmed from the chain.
  useEffect(() => {
    if (unverified.length > 0) void reverifyPending(unverified)
    // Only on first load of the page; the manual button handles later checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const visible = filter === 'all' ? records : records.filter((r) => r.status === filter)

  const download = () => {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fxbridge-transactions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isConnected) {
    return (
      <div>
        <SectionHeader eyebrow="Transactions" title="Swap history" description="Connect a wallet to see swaps you made through FXBridge." />
        <EmptyState
          title="No wallet connected"
          description="History is kept in this browser per wallet and every entry is checked against its onchain receipt."
          action={
            <button onClick={() => setOpen(true)} className="btn-primary min-h-12 rounded-full px-6 text-sm font-semibold">
              Connect wallet
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Transactions"
        title="Swap history"
        description="Swaps made with this wallet through FXBridge in this browser. Amounts and fees are read from the onchain receipt once a swap is confirmed."
        action={
          <div className="flex gap-2">
            {unverified.length > 0 ? (
              <button
                onClick={() => void recheck()}
                disabled={checking}
                className="glass-inner inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold text-[var(--ink)] hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={clsx('size-3.5', checking && 'animate-spin')} /> Check {unverified.length} pending
              </button>
            ) : null}
            <button
              onClick={download}
              disabled={visible.length === 0}
              className="glass-inner inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold text-[var(--ink)] hover:bg-white/10 disabled:opacity-40"
            >
              <Download className="size-3.5" /> Export CSV
            </button>
          </div>
        }
      />

      <div className="flex gap-2">
        {(['all', 'confirmed', 'pending', 'failed'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={clsx('min-h-11 rounded-full px-4 text-xs font-semibold capitalize transition', filter === key ? 'bg-white/14 text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-white/6')}
          >
            {key}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={records.length === 0 ? 'No swaps yet' : 'Nothing matches this filter'}
          description={records.length === 0 ? 'Your first confirmed swap will show up here with its hash, amounts, fees and a link to the Arc explorer.' : 'Try a different status filter.'}
          action={
            records.length === 0 ? (
              <Link to="/exchange" className="btn-primary inline-flex min-h-12 items-center rounded-full px-6 text-sm font-semibold">
                Make a swap
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <GlassCard className="hidden overflow-hidden md:block">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Time', 'Swap', 'Rate', 'Fees', 'Status', 'Transaction'].map((h) => (
                      <th key={h} className="eyebrow px-4 py-4 font-semibold first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const rate = effectiveRate(r)
                    return (
                      <tr key={r.txHash} className="border-b border-white/6 align-top last:border-0">
                        <td className="whitespace-nowrap px-4 py-4 pl-5 text-[var(--muted)]">{formatDateTime(r.timestamp)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 font-semibold tabular-nums text-[var(--ink)]">
                            <TokenIcon symbol={r.tokenIn} size={18} />
                            {formatDecimalString(r.amountIn, 2, 6)}
                            <ArrowRight className="size-3.5 text-[var(--subtle)]" />
                            <TokenIcon symbol={r.tokenOut} size={18} />
                            {r.amountOut ? formatDecimalString(r.amountOut, 2, 6) : 'Pending'}
                          </div>
                          {!r.verified ? <div className="mt-0.5 text-[11px] text-[var(--subtle)]">Amounts are from the quote until the receipt is read.</div> : null}
                        </td>
                        <td className="px-4 py-4 tabular-nums text-[var(--muted)]">{rate ? formatRate(rate) : '-'}</td>
                        <td className="max-w-[220px] px-4 py-4 text-xs tabular-nums text-[var(--muted)]">{feeSummary(r)}</td>
                        <td className="px-4 py-4">
                          <StatusBadge record={r} />
                        </td>
                        <td className="px-4 py-4">
                          <a href={txUrl(r.txHash)} target="_blank" rel="noopener noreferrer" className="mono inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
                            {shortHash(r.txHash)} <ExternalLink className="size-3" />
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {visible.map((r) => (
              <li key={r.txHash} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--subtle)]">{formatDateTime(r.timestamp)}</span>
                  <StatusBadge record={r} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 font-semibold tabular-nums text-[var(--ink)]">
                  <TokenIcon symbol={r.tokenIn} size={20} />
                  {formatDecimalString(r.amountIn, 2, 6)}
                  <ArrowRight className="size-3.5 text-[var(--subtle)]" />
                  <TokenIcon symbol={r.tokenOut} size={20} />
                  {r.amountOut ? formatDecimalString(r.amountOut, 2, 6) : 'Pending'}
                </div>
                <div className="mt-2 text-xs text-[var(--muted)]">Fees: {feeSummary(r)}</div>
                <a href={txUrl(r.txHash)} target="_blank" rel="noopener noreferrer" className="mono mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)]">
                  {shortHash(r.txHash)} <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
