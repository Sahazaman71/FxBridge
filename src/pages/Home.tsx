import { motion } from 'framer-motion'
import { ArrowRight, Gauge, KeyRound, ReceiptText } from 'lucide-react'
import { Link } from '@/lib/router'
import { MarketSnapshot } from '@/components/market/MarketSnapshot'
import { Reveal, springs } from '@/components/ui/motion'
import { Badge, GlassCard, TokenIcon } from '@/components/ui/primitives'

const STEPS = [
  { title: 'Get a live quote', body: 'Enter an amount and see the estimated output, every fee, and the minimum you will receive.' },
  { title: 'Sign in your wallet', body: 'You approve the swap yourself. FXBridge never asks for, or stores, a key or seed phrase.' },
  { title: 'Settle on Arc', body: 'Swaps settle onchain and are confirmed from the receipt, with the hash linked to the Arc explorer.' },
]

const PILLARS = [
  { icon: Gauge, title: 'Transparent pricing', body: 'Effective rate, provider fees, slippage and the Circle price feed side by side before you sign.' },
  { icon: ReceiptText, title: 'Efficient settlement', body: 'Arc uses USDC for gas, so fees are predictable and a swap is a single USDC-denominated cost.' },
  { icon: KeyRound, title: 'Non-custodial', body: 'Your tokens stay in your wallet until the swap executes. Slippage limits protect every trade.' },
]

const HEADLINE = [
  { text: 'One Bridge.', gradient: false },
  { text: 'Multiple Stablecoins.', gradient: false },
  { text: 'Endless Possibilities.', gradient: true },
]

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }
const lineUp = { hidden: { y: '110%' }, show: { y: 0, transition: { type: 'spring', stiffness: 160, damping: 22 } } }
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: springs.gentle } }

export default function Home() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp}>
            <Badge tone="info">
              <TokenIcon symbol="USDC" size={14} /> <TokenIcon symbol="EURC" size={14} /> USDC and EURC on Arc Testnet
            </Badge>
          </motion.div>
          <h1 className="display mt-5 text-4xl font-semibold leading-[1.08] text-[var(--ink)] sm:text-6xl">
            {HEADLINE.map((line) => (
              <span key={line.text} className="block overflow-hidden pb-1">
                <motion.span variants={lineUp} className={line.gradient ? 'text-gradient block' : 'block'}>
                  {line.text}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p variants={fadeUp} className="mt-5 max-w-[52ch] text-pretty text-base text-[var(--muted)] sm:text-lg">
            Exchange stablecoins with transparent pricing, efficient settlement, and the power of Arc.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/exchange"
              className="btn-primary group inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold active:scale-[0.98]"
            >
              Start Exchanging <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/markets"
              className="glass-inner inline-flex min-h-12 items-center rounded-full px-6 text-sm font-semibold text-[var(--ink)] hover:border-white/25 hover:bg-white/10"
            >
              Explore Markets
            </Link>
          </motion.div>
        </motion.div>

        <motion.div className="relative" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.25 }}>
          <div className="float-slow absolute -left-6 -top-7 z-10 hidden size-14 items-center justify-center rounded-2xl border border-white/14 bg-[#0d1b2f]/80 shadow-xl backdrop-blur-md lg:flex" aria-hidden>
            <TokenIcon symbol="USDC" size={32} />
          </div>
          <div className="float-slower absolute -bottom-6 -right-5 z-10 hidden size-14 items-center justify-center rounded-2xl border border-white/14 bg-[#0d1b2f]/80 shadow-xl backdrop-blur-md lg:flex" aria-hidden>
            <TokenIcon symbol="EURC" size={32} />
          </div>
          <MarketSnapshot />
        </motion.div>
      </section>

      <section>
        <Reveal>
          <div className="eyebrow mb-4">How it works</div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.1}>
              <GlassCard className="lift h-full p-6">
                <div className="display text-gradient text-3xl font-semibold tabular-nums">0{index + 1}</div>
                <h3 className="display mt-3 text-lg font-semibold text-[var(--ink)]">{step.title}</h3>
                <p className="mt-1.5 text-pretty text-sm text-[var(--muted)]">{step.body}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, body }, index) => (
          <Reveal key={title} delay={index * 0.1}>
            <div className="glass-inner lift group h-full rounded-3xl p-6 transition-transform duration-300 hover:border-white/20">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/8 transition-colors group-hover:bg-white/14">
                <Icon className="size-5 text-[var(--accent)]" />
              </span>
              <h3 className="display mt-4 text-lg font-semibold text-[var(--ink)]">{title}</h3>
              <p className="mt-1.5 text-pretty text-sm text-[var(--muted)]">{body}</p>
            </div>
          </Reveal>
        ))}
      </section>
    </div>
  )
}
