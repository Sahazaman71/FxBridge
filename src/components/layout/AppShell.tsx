import type { ReactNode } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { Link, ROUTES, useLocation } from '@/lib/router'
import { ARC_CHAIN_ID } from '@/lib/tokens'
import { shortAddress } from '@/lib/format'
import { Badge } from '@/components/ui/primitives'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="FXBridge home">
      <span
        className="flex size-9 items-center justify-center rounded-xl"
        style={{ background: 'linear-gradient(140deg, rgba(79,140,255,0.35), rgba(139,124,246,0.35))', border: '1px solid rgba(255,255,255,0.14)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 17c2-7 6-10 9-10s7 3 9 10" stroke="#cbdbf2" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 17h18" stroke="#8b7cf6" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 17v-4M12 17V9M16 17v-4" stroke="#cbdbf2" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="display text-lg font-semibold tracking-tight text-[var(--ink)]">FXBridge</span>
    </Link>
  )
}

function WalletButton() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID

  return (
    <div className="flex items-center gap-2">
      {wrongChain ? (
        <button
          onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
          disabled={isPending}
          className="flex min-h-11 items-center gap-2 rounded-full border border-amber-200/30 bg-amber-300/10 px-4 text-sm font-semibold text-[var(--warn)] transition hover:bg-amber-300/15 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Switch to Arc Testnet
        </button>
      ) : isConnected ? (
        <Badge tone="info" className="hidden sm:inline-flex">
          <span className="live-dot text-[var(--success)]" /> Arc Testnet
        </Badge>
      ) : null}
      <ConnectKitButton.Custom>
        {({ isConnected: connected, show, address }) => (
          <button
            onClick={show}
            className={clsx(
              'min-h-11 rounded-full px-5 text-sm font-semibold transition active:scale-[0.98]',
              connected ? 'glass-inner text-[var(--ink)] hover:bg-white/10' : 'btn-primary',
            )}
          >
            {connected && address ? <span className="mono text-[13px]">{shortAddress(address)}</span> : 'Connect wallet'}
          </button>
        )}
      </ConnectKitButton.Custom>
    </div>
  )
}

function NavLinks({ mobile }: { mobile?: boolean }) {
  const { path } = useLocation()
  return (
    <nav aria-label="Primary" className={clsx(mobile ? 'scroll-thin flex gap-1 overflow-x-auto px-4 pb-3' : 'hidden items-center gap-1 lg:flex')}>
      {ROUTES.map((route) => {
        const active = route.path === path
        return (
          <Link
            key={route.path}
            to={route.path}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
              active ? 'text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-white/6 hover:text-[var(--ink)]',
            )}
          >
            {active ? (
              <motion.span
                layoutId={mobile ? 'nav-pill-mobile' : 'nav-pill'}
                className="absolute inset-0 rounded-full border border-white/12 bg-white/12"
                style={{ boxShadow: '0 0 24px -6px rgba(127,168,255,0.5)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative">{route.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })
  return <motion.div className="scroll-progress absolute inset-x-0 bottom-0" style={{ scaleX }} aria-hidden />
}

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useLocation()
  return (
    <div className="app-backdrop min-h-dvh">
      <div className="aurora" aria-hidden>
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
        <div className="grid-fade" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#070f1d]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-8">
            <Logo />
            <NavLinks />
          </div>
          <WalletButton />
        </div>
        <div className="lg:hidden">
          <NavLinks mobile />
        </div>
        <ScrollProgress />
      </header>

      <motion.main
        key={path}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-8 sm:pt-12"
      >
        {children}
      </motion.main>

      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 pb-20 text-xs text-[var(--subtle)] sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-pretty">
            FXBridge runs on Arc Testnet. Tokens have no real value. Swaps are routed through a third-party aggregator or Circle, and you sign every transaction
            in your own wallet.
          </p>
          <div className="flex gap-4">
            <Link to="/docs" className="hover:text-[var(--ink)]">
              How it works
            </Link>
            <Link to="/markets" className="hover:text-[var(--ink)]">
              Markets
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
