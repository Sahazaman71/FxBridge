import { useLocation } from '@/lib/router'
import { AppShell } from '@/components/layout/AppShell'
import Home from '@/pages/Home'
import Exchange from '@/pages/Exchange'
import Markets from '@/pages/Markets'
import Portfolio from '@/pages/Portfolio'
import Transactions from '@/pages/Transactions'
import Analytics from '@/pages/Analytics'
import Docs from '@/pages/Docs'

function Page() {
  const { path } = useLocation()
  switch (path) {
    case '/exchange':
      return <Exchange />
    case '/markets':
      return <Markets />
    case '/portfolio':
      return <Portfolio />
    case '/transactions':
      return <Transactions />
    case '/analytics':
      return <Analytics />
    case '/docs':
      return <Docs />
    default:
      return <Home />
  }
}

export default function App() {
  return (
    <AppShell>
      <Page />
    </AppShell>
  )
}
