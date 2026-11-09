import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/** Minimal History API router. Paths (not hashes) so Studio can mirror the address bar. */

export interface RouteDef {
  path: string
  label: string
}

export const ROUTES: readonly RouteDef[] = [
  { path: '/', label: 'Home' },
  { path: '/exchange', label: 'Exchange' },
  { path: '/markets', label: 'Markets' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/docs', label: 'Docs' },
]

const NAV_EVENT = 'fxbridge:navigate'

function snapshot(): string {
  return window.location.pathname + window.location.search
}

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener)
  window.addEventListener(NAV_EVENT, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener(NAV_EVENT, listener)
  }
}

export function navigate(to: string) {
  if (to === snapshot()) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new Event(NAV_EVENT))
  window.scrollTo({ top: 0 })
}

export function useLocation(): { path: string; search: URLSearchParams } {
  const full = useSyncExternalStore(subscribe, snapshot, snapshot)
  const [pathname = '/', query = ''] = full.split('?')
  const path = pathname.replace(/\/+$/, '') || '/'
  return { path, search: new URLSearchParams(query) }
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
}

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
