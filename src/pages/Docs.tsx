import type { ReactNode } from 'react'
import { addressUrl } from '@/lib/chain'
import { Link } from '@/lib/router'
import { TOKEN_LIST } from '@/lib/tokens'
import { shortAddress } from '@/lib/format'
import { Reveal } from '@/components/ui/motion'
import { GlassCard, SectionHeader } from '@/components/ui/primitives'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal className="h-full">
      <GlassCard className="h-full p-6">
        <h2 className="display text-xl font-semibold text-[var(--ink)]">{title}</h2>
        <div className="mt-3 max-w-[70ch] space-y-3 text-pretty text-sm leading-relaxed text-[var(--muted)]">{children}</div>
      </GlassCard>
    </Reveal>
  )
}

export default function Docs() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Documentation" title="How FXBridge works" description="What happens between pressing Swap and seeing tokens in your wallet, and what to know before you do." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="1. Quote">
          <p>
            When you enter an amount, FXBridge asks Circle's swap service for a live quote for your wallet. The quote shows the estimated output, the fees charged, and the
            effective rate: how much you receive per 1 token paid, after fees.
          </p>
          <p>Quotes refresh every 15 seconds. A quote is an estimate, not a guarantee, and the price can move before your transaction is mined.</p>
        </Section>

        <Section title="2. Review and sign">
          <p>
            Before you sign, the review panel lists what you pay, the estimated output, the minimum you will receive, each fee, and the route. Pressing Swap is your
            confirmation. FXBridge never sends a transaction on its own.
          </p>
          <p>You sign in your own wallet. FXBridge never asks for, receives, or stores a private key or seed phrase.</p>
        </Section>

        <Section title="3. Settle on Arc">
          <p>
            The swap is executed onchain on Arc Testnet. FXBridge then reads the transaction receipt from the chain. Only a successful receipt marks a swap as confirmed, and
            the received amount shown in your history is read from the token transfer in that receipt.
          </p>
          <p>If the receipt cannot be found yet, the swap stays pending and is re-checked from the Transactions page.</p>
        </Section>

        <Section title="Fees and gas">
          <p>
            Arc uses USDC as its gas token, so network fees are paid in USDC. Your USDC balance is one pool, shown once, whether it is spent on swaps or on fees. When you
            swap USDC, keep a little back for fees.
          </p>
          <p>Swap fees come from the routing provider and are shown in the review panel. FXBridge does not add its own fee.</p>
        </Section>

        <Section title="Slippage and protections">
          <p>
            Slippage tolerance is the largest price move you accept. The swap is rejected if it would fill below your minimum received amount. The default is 0.5% and the
            maximum is 3%. FXBridge warns above 1%, on large amounts, when a quote is well below the Circle price feed, and when a swap would leave too little USDC for fees.
          </p>
        </Section>

        <Section title="Where the numbers come from">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Executable rates and fees: Circle's swap service, as a live quote for your wallet.</li>
            <li>USD prices and the EURC/USDC mid-market rate: the Circle price feed for Arc Testnet.</li>
            <li>EUR/USD reference and 30-day history: European Central Bank daily rates via Frankfurter. Reference only, not tradable.</li>
            <li>Sampled rates: executable quotes recorded in your browser while you use the Exchange page.</li>
            <li>Transactions, volume and fees: your own swaps, read from onchain receipts. There is no global volume indexer.</li>
          </ul>
        </Section>

        <Section title="Routing disclosure">
          <p>
            Each swap is routed through a swap service provider, either a third-party DEX aggregator or Circle, and the provider can vary by route and change over time. By
            swapping you are subject to that provider's terms of service.
          </p>
        </Section>

        <Section title="Testnet notice">
          <p>
            FXBridge runs on Arc Testnet only. Test tokens have no real-world value. Use "Get test USDC" in the Arc Studio sidebar to fund a wallet. No mainnet funds are
            involved.
          </p>
          <p>
            Testnet liquidity is thin, so executable quotes can sit far from the market price. FXBridge shows the Circle price feed next to every quote and warns when they
            differ by more than 1%.
          </p>
          <p>Supported tokens on Arc Testnet:</p>
          <ul className="space-y-1.5">
            {TOKEN_LIST.map((token) => (
              <li key={token.symbol}>
                <a href={addressUrl(token.address)} target="_blank" rel="noopener noreferrer" className="mono text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  {token.symbol} {shortAddress(token.address)}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="flex justify-center pt-4">
        <Link to="/exchange" className="btn-primary inline-flex min-h-12 items-center rounded-full px-8 text-sm font-semibold">
          Start Exchanging
        </Link>
      </div>
    </div>
  )
}
