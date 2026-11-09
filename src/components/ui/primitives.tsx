import type { HTMLAttributes, PointerEvent, ReactNode } from 'react'
import { TokenEURC, TokenUSDC } from '@web3icons/react'
import clsx from 'clsx'
import type { TokenSymbol } from '@/lib/tokens'

/** Glass card with a spotlight that follows the pointer (CSS vars, no re-render). */
export function GlassCard({ className, children, onPointerMove, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
    onPointerMove?.(event)
  }
  return (
    <div className={clsx('glass rounded-3xl', className)} onPointerMove={handleMove} {...rest}>
      {children}
    </div>
  )
}

type BadgeTone = 'neutral' | 'success' | 'danger' | 'warn' | 'info' | 'demo'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-white/8 text-[var(--muted)] border-white/10',
  success: 'bg-emerald-400/10 text-[var(--success)] border-emerald-300/20',
  danger: 'bg-rose-400/10 text-[var(--danger)] border-rose-300/20',
  warn: 'bg-amber-300/10 text-[var(--warn)] border-amber-200/20',
  info: 'bg-sky-300/10 text-[var(--accent)] border-sky-200/20',
  demo: 'bg-violet-400/10 text-violet-200 border-violet-300/25',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Marks any figure that does not come from a live source. */
export function DemoBadge({ label = 'Demo data' }: { label?: string }) {
  return <Badge tone="demo">{label}</Badge>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('shimmer rounded-lg', className)} aria-hidden />
}

export function TokenIcon({ symbol, size = 28 }: { symbol: TokenSymbol; size?: number }) {
  return symbol === 'USDC' ? <TokenUSDC variant="branded" size={size} /> : <TokenEURC variant="branded" size={size} />
}

export function Stat({
  label,
  value,
  sub,
  loading,
  badge,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  loading?: boolean
  badge?: ReactNode
}) {
  return (
    <div className="glass-inner rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {badge}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <div className="display mt-2 text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</div>
      )}
      {sub ? <div className="mt-1 text-xs text-[var(--subtle)]">{sub}</div> : null}
    </div>
  )
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="display text-balance text-3xl font-semibold text-[var(--ink)] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-[65ch] text-pretty text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="glass-inner flex flex-col items-center rounded-2xl px-6 py-12 text-center">
      <div className="display text-lg font-semibold text-[var(--ink)]">{title}</div>
      <p className="mt-1 max-w-sm text-pretty text-sm text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
