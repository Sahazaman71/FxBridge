import { useAccount } from 'wagmi'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { useSwapRecords, type SwapRecord } from '@/lib/history'
import { formatDecimalString, shortHash, timeAgo } from '@/lib/format'
import { txUrl } from '@/lib/chain'
import { Link } from '@/lib/router'
import { Badge, GlassCard, TokenIcon } from '@/components/ui/primitives'

export function StatusBadge({ record }: { record: SwapRecord }) {
  if (record.status === 'confirmed') return <Badge tone="success">Confirmed</Badge>
  if (record.status === 'failed') return <Badge tone="danger">Failed</Badge>
  return <Badge tone="warn">Pending</Badge>
}

export function RecentSwaps({ limit = 4 }: { limit?: number }) {
  const { address } = useAccount()
  const records = useSwapRecords(address).slice(0, limit)

  return (
    <GlassCard className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="display text-lg font-semibold text-[var(--ink)]">Your recent swaps</h3>
        <Link to="/transactions" className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]">
          View all
        </Link>
      </div>
      {!address ? (
        <p className="text-sm text-[var(--muted)]">Connect a wallet to see swaps made through FXBridge.</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No swaps yet. Completed swaps appear here once they are confirmed onchain.</p>
      ) : (
        <ul className="space-y-2">
          {records.map((record) => (
            <li key={record.txHash} className="glass-inner rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold tabular-nums text-[var(--ink)]">
                  <TokenIcon symbol={record.tokenIn} size={20} />
                  {formatDecimalString(record.amountIn, 2, 4)}
                  <ArrowRight className="size-3.5 text-[var(--subtle)]" />
                  <TokenIcon symbol={record.tokenOut} size={20} />
                  {record.amountOut ? formatDecimalString(record.amountOut, 2, 4) : '...'}
                </div>
                <StatusBadge record={record} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--subtle)]">
                <span>{timeAgo(record.timestamp)}</span>
                <a href={txUrl(record.txHash)} target="_blank" rel="noopener noreferrer" className="mono inline-flex items-center gap-1 hover:text-[var(--ink)]">
                  {shortHash(record.txHash)} <ExternalLink className="size-3" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
