import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { MAX_SLIPPAGE_BPS, SLIPPAGE_PRESETS_BPS } from '@/lib/tokens'

const bpsToPct = (bps: number) => `${(bps / 100).toFixed(bps % 10 === 0 ? 1 : 2)}%`

export function SlippageSettings({ value, onChange, disabled }: { value: number; onChange: (bps: number) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const applyCustom = (raw: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return
    setCustom(raw)
    const pct = Number(raw)
    if (raw !== '' && Number.isFinite(pct) && pct > 0) onChange(Math.min(MAX_SLIPPAGE_BPS, Math.round(pct * 100)))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-label={`Slippage tolerance ${bpsToPct(value)}`}
        className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[var(--muted)] transition hover:bg-white/8 hover:text-[var(--ink)] disabled:opacity-40"
      >
        <SlidersHorizontal className="size-4" />
        <span className="tabular-nums">{bpsToPct(value)}</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-white/12 bg-[#0d1b2f]/95 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="eyebrow mb-2">Slippage tolerance</div>
            <p className="mb-3 text-xs text-[var(--muted)]">The swap fails instead of filling below this price. Tighter limits protect you but can fail in fast markets.</p>
            <div className="flex gap-2">
              {SLIPPAGE_PRESETS_BPS.map((bps) => (
                <button
                  key={bps}
                  onClick={() => {
                    onChange(bps)
                    setCustom('')
                  }}
                  className={clsx(
                    'min-h-11 flex-1 rounded-xl border text-sm font-semibold tabular-nums transition',
                    value === bps && custom === '' ? 'border-[var(--accent)] bg-white/10 text-[var(--ink)]' : 'border-white/10 text-[var(--muted)] hover:bg-white/6',
                  )}
                >
                  {bpsToPct(bps)}
                </button>
              ))}
            </div>
            <label className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-[var(--muted)]">
              Custom
              <input
                inputMode="decimal"
                value={custom}
                onChange={(e) => applyCustom(e.target.value)}
                placeholder="0.50"
                aria-label="Custom slippage percent"
                className="mono w-full bg-transparent text-right text-[var(--ink)] outline-none placeholder:text-[var(--subtle)]"
              />
              %
            </label>
            {value > 100 ? (
              <div className="mt-3 flex gap-2 rounded-xl bg-amber-300/10 p-3 text-xs text-[var(--warn)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                High slippage can let your swap fill at a worse price. Max is {bpsToPct(MAX_SLIPPAGE_BPS)}.
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
