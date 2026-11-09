import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import { ExternalLink } from 'lucide-react'
import { useBalances } from '@/hooks/useBalances'
import { useUsdPrices } from '@/hooks/useMarketData'
import { addressUrl } from '@/lib/chain'
import { formatDecimalString, formatNumber, formatUsd, shortAddress, toNumber } from '@/lib/format'
import { Link } from '@/lib/router'
import { ARC_CHAIN_ID, TOKEN_LIST } from '@/lib/tokens'
import { AnimatedNumber } from '@/components/ui/motion'
import { Badge, EmptyState, GlassCard, SectionHeader, Skeleton, TokenIcon } from '@/components/ui/primitives'

const formatBalance = (value: number) => formatNumber(value, 2, 4)

export default function Portfolio() {
  const { address, isConnected, chainId } = useAccount()
  const { setOpen } = useModal()
  const { balances, isLoading, isError } = useBalances()
  const prices = useUsdPrices()

  if (!isConnected || !address) {
    return (
      <div>
        <SectionHeader eyebrow="Portfolio" title="Your stablecoin balances" description="Connect a wallet to see your USDC and EURC balances on Arc Testnet." />
        <EmptyState
          title="No wallet connected"
          description="Balances are read directly from the Arc Testnet token contracts for your connected address."
          action={
            <button onClick={() => setOpen(true)} className="btn-primary min-h-12 rounded-full px-6 text-sm font-semibold">
              Connect wallet
            </button>
          }
        />
      </div>
    )
  }

  const rows = TOKEN_LIST.map((token) => {
    const value = balances[token.symbol]?.value
    const units = value ? toNumber(value) : 0
    const usd = prices ? units * prices[token.symbol] : null
    return { token, value, units, usd }
  })
  const totalUsd = prices && !isLoading ? rows.reduce((sum, r) => sum + (r.usd ?? 0), 0) : null

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Portfolio"
        title="Your stablecoin balances"
        description="Balances are read from the token contracts on Arc Testnet. USDC is also Arc's gas token, so it is one balance, shown once."
        action={
          <a
            href={addressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="mono glass-inner inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
          >
            {shortAddress(address)} <ExternalLink className="size-3" />
          </a>
        }
      />

      {chainId !== ARC_CHAIN_ID ? (
        <div className="rounded-2xl bg-amber-300/10 p-4 text-sm text-[var(--warn)]">Your wallet is on another network. Balances below are Arc Testnet balances; switch networks from the header to swap.</div>
      ) : null}

      <GlassCard className="p-6 sm:p-8">
        <div className="eyebrow">Total value</div>
        <div className="display mt-2 text-5xl font-semibold tabular-nums text-[var(--ink)]">
          {isLoading ? (
            <Skeleton className="h-12 w-52" />
          ) : totalUsd !== null ? (
            <AnimatedNumber value={totalUsd} format={formatUsd} />
          ) : (
            <span className="text-2xl text-[var(--subtle)]">Price feed unavailable</span>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--subtle)]">Valued at Circle price feed rates. Testnet tokens have no real-world value.</p>

        {totalUsd !== null && totalUsd > 0 ? (
          <div className="mt-6">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8">
              {rows.map((r, i) => (
                <div key={r.token.symbol} style={{ width: `${((r.usd ?? 0) / totalUsd) * 100}%`, background: i === 0 ? '#7fa8ff' : '#a89bff' }} />
              ))}
            </div>
            <div className="mt-2 flex gap-5 text-xs text-[var(--muted)]">
              {rows.map((r, i) => (
                <span key={r.token.symbol} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: i === 0 ? '#7fa8ff' : '#a89bff' }} />
                  {r.token.symbol} {formatNumber(((r.usd ?? 0) / totalUsd) * 100, 1, 1)}%
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </GlassCard>

      {isError ? <div className="rounded-2xl bg-rose-400/10 p-4 text-sm text-[var(--danger)]">Could not read balances from Arc Testnet. Check your connection and refresh.</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ token, value, usd }) => (
          <GlassCard key={token.symbol} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TokenIcon symbol={token.symbol} size={36} />
                <div>
                  <div className="font-semibold text-[var(--ink)]">{token.symbol}</div>
                  <div className="text-xs text-[var(--subtle)]">{token.name}</div>
                </div>
              </div>
              {token.symbol === 'USDC' ? <Badge tone="info">Gas token</Badge> : null}
            </div>
            <div className="display mt-5 text-3xl font-semibold tabular-nums text-[var(--ink)]">
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : value !== undefined ? (
                <AnimatedNumber value={toNumber(value)} format={formatBalance} finalText={formatDecimalString(value, 2, 4)} />
              ) : (
                '-'
              )}
            </div>
            <div className="mt-1 text-sm tabular-nums text-[var(--muted)]">{usd !== null && value !== undefined ? formatUsd(usd) : ''}</div>
            <div className="mt-5 flex gap-2">
              <Link to={`/exchange?from=${token.symbol}`} className="btn-primary flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold">
                Swap {token.symbol}
              </Link>
              <a
                href={addressUrl(token.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-inner flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                Contract <ExternalLink className="size-3" />
              </a>
            </div>
          </GlassCard>
        ))}
      </div>

      {rows.every((r) => r.value === '0') && !isLoading ? (
        <p className="text-center text-sm text-[var(--muted)]">Nothing here yet. Use "Get test USDC" in the Arc Studio sidebar to fund this wallet on Arc Testnet.</p>
      ) : null}
    </div>
  )
}
