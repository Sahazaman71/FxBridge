import { motion } from 'framer-motion'
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react'
import type { SwapState } from '@/hooks/useSwap'
import { formatDecimalString, shortHash } from '@/lib/format'
import { txUrl } from '@/lib/chain'
import { Link } from '@/lib/router'

export function TxStatus({ state, onReset }: { state: SwapState; onReset: () => void }) {
  const { phase, record, error } = state
  if (phase === 'idle') return null

  const hash = record?.txHash

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="glass-inner rounded-2xl p-4"
      role="status"
      aria-live="polite"
    >
      {phase === 'switching' ? (
        <Line icon={<Loader2 className="size-5 animate-spin text-[var(--accent)]" />} title="Switching to Arc Testnet" body="Approve the network switch in your wallet." />
      ) : null}

      {phase === 'submitting' ? (
        <Line
          icon={<Loader2 className="size-5 animate-spin text-[var(--accent)]" />}
          title="Confirm in your wallet"
          body="Sign any prompts in your wallet. Your swap is submitted to Arc once signed."
        />
      ) : null}

      {phase === 'verifying' && record ? (
        <>
          <Line
            icon={<Loader2 className="size-5 animate-spin text-[var(--accent)]" />}
            title="Submitted, waiting for Arc to confirm"
            body="This is pending until the onchain receipt is read. You can leave this page; the Transactions page keeps checking."
          />
          {hash ? <ExplorerLink hash={hash} /> : null}
        </>
      ) : null}

      {phase === 'confirmed' && record ? (
        <>
          <Line
            icon={<SuccessMark />}
            title="Swap confirmed onchain"
            body={`You received ${record.amountOut ? formatDecimalString(record.amountOut, 2, 6) : 'your tokens'} ${record.tokenOut} for ${formatDecimalString(record.amountIn, 2, 6)} ${record.tokenIn}.`}
          />
          {record.gasFeeUsdc ? <p className="mt-2 text-xs tabular-nums text-[var(--subtle)]">Network fee paid: {formatDecimalString(record.gasFeeUsdc, 2, 6)} USDC</p> : null}
          <ExplorerLink hash={record.txHash} />
          <div className="mt-4 flex gap-2">
            <button onClick={onReset} className="btn-primary min-h-11 flex-1 rounded-xl text-sm font-semibold transition active:scale-[0.98]">
              New swap
            </button>
            <Link to="/transactions" className="glass-inner flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold text-[var(--ink)] hover:bg-white/8">
              View history
            </Link>
          </div>
        </>
      ) : null}

      {phase === 'failed' && record ? (
        <>
          <Line
            icon={<XCircle className="size-5 text-[var(--danger)]" />}
            title="Transaction reverted onchain"
            body="The swap did not complete and no tokens were exchanged. You only paid the network fee. Review a fresh quote and try again."
          />
          <ExplorerLink hash={record.txHash} />
          <button onClick={onReset} className="btn-primary mt-4 min-h-11 w-full rounded-xl text-sm font-semibold">
            Try again
          </button>
        </>
      ) : null}

      {phase === 'error' && error ? (
        <>
          <Line icon={<XCircle className="size-5 text-[var(--danger)]" />} title="Swap not completed" body={error.message} />
          <button onClick={onReset} className="glass-inner mt-4 min-h-11 w-full rounded-xl text-sm font-semibold text-[var(--ink)] hover:bg-white/8">
            Dismiss
          </button>
        </>
      ) : null}
    </motion.div>
  )
}

/** Plays once when a swap is confirmed from a real onchain receipt. */
function SuccessMark() {
  return (
    <span className="relative flex size-5 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-full border border-[var(--success)]"
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
        <CheckCircle2 className="size-5 text-[var(--success)]" />
      </motion.span>
    </span>
  )
}

function Line({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-[var(--ink)]">{title}</div>
        <p className="mt-0.5 text-pretty text-sm text-[var(--muted)]">{body}</p>
      </div>
    </div>
  )
}

function ExplorerLink({ hash }: { hash: string }) {
  return (
    <a
      href={txUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="mono mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
    >
      {shortHash(hash)} <ExternalLink className="size-3" /> View on Arc explorer
    </a>
  )
}
