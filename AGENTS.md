# FXBridge

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

FXBridge is a USDC/EURC stablecoin exchange on Arc Testnet. Real swaps run through Circle App Kit (keyless, browser wallet signs). No custom contract is deployed. Pages: Home, Exchange, Markets, Portfolio, Transactions, Analytics, Docs.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - path-based routing to `src/pages/*`
- `src/lib/swapKit.ts` - App Kit instance, estimate/execute wrappers, error parsing
- `src/lib/history.ts` - per-wallet swap records (localStorage) and onchain receipt verification
- `src/lib/rates.ts` - Circle price feed, ECB reference (Frankfurter), sampled quotes
- `src/lib/router.tsx` - History API router (paths, not hashes)
- `src/hooks/useQuote.ts`, `useSwap.ts`, `useBalances.ts`, `useMarketData.ts`
- `src/components/exchange/` - SwapCard, ReviewPanel, SlippageSettings, TxStatus
- `src/config.ts` - wagmi config (Arc Testnet only)

## Decisions

- `swap()` is called only from the user's click on Swap. A swap is marked confirmed only after the receipt is read from Arc.
- Testnet quotes can be far from market (e.g. +100% vs the Circle price feed). The UI warns when the gap exceeds 1%.
- Volume and history are per-wallet, local to the browser; there is no global indexer. Unsourced figures must carry a label.
- `VITE_EURC_ADDRESS` in `.env` holds the Arc Testnet EURC address (not in `@/onchain-facts`).

## Share links

- Starter apps already ship `getShareBase`, `buildShareLink` and `installShareSync` in `src/lib/share.ts`; import them instead of rewriting them.
- Keep shareable state in the URL path or query, not in the `#fragment`.
- Never put a secret (private key, claim secret, seed phrase, session token, API key) in the URL path or query, encoded or not: every in-app path and query is mirrored to the visitor's studio.arc.io address bar and browser history and reaches servers. A bearer claim secret goes only in the `#fragment` appended to the share link (`` `${await buildShareLink('/claim')}#${secret}` ``) and is read from `location.hash` on load. A link to the app's own share URL shown inside the app must be copy-only or open in a new tab with `target="_blank" rel="noopener noreferrer"`.
- Build every link a user copies or sends with `buildShareLink()` from `src/lib/share.ts`.
- Keep the `installShareSync()` call in `src/main.tsx` when editing it; it keeps the Studio address bar in step with in-app navigation.
- Navigate inside the app with relative links.

## To Run

```bash
bun install
bun run dev
```
