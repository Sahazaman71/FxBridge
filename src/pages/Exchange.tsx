import { useLocation } from '@/lib/router'
import type { TokenSymbol } from '@/lib/tokens'
import { SwapCard } from '@/components/exchange/SwapCard'
import { RecentSwaps } from '@/components/exchange/RecentSwaps'
import { MarketSnapshot } from '@/components/market/MarketSnapshot'
import { Badge } from '@/components/ui/primitives'

export default function Exchange() {
  const { search } = useLocation()
  const from = search.get('from')
  const initialFrom: TokenSymbol = from === 'EURC' ? 'EURC' : 'USDC'

  return (
    <div>
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <Badge tone="info">Arc Testnet · real onchain swaps</Badge>
        <h1 className="display mt-4 text-balance text-3xl font-semibold text-[var(--ink)] sm:text-4xl">Exchange stablecoins</h1>
        <p className="mx-auto mt-2 max-w-[60ch] text-pretty text-sm text-[var(--muted)]">
          Get a live quote, review every cost, then sign in your own wallet. Nothing is sent until you press Swap.
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] lg:items-start lg:justify-center">
        <SwapCard key={initialFrom} initialFrom={initialFrom} />
        <div className="space-y-6">
          <MarketSnapshot />
          <RecentSwaps />
        </div>
      </div>
    </div>
  )
}
