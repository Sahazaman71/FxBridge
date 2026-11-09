## Implementation Plan: FXBridge

### Summary
FXBridge is a stablecoin exchange for converting USDC and EURC on Arc Testnet, with live quotes, fee and slippage preview, real onchain swaps, and a full transaction history. A premium fintech-style product for people who want transparent stablecoin FX.

### Scope notes (honest limits on testnet)
- Swaps go through Circle's swap SDK in the browser (keyless). On Arc Testnet the SDK supports USDC and EURC. A third-party aggregator or Circle routes each swap; the app discloses this before signing.
- No custom smart contract is deployed. The "audited contracts" requirement is met by using the SDK's existing swap infrastructure.
- Live rate = the SDK quote (the real executable rate). Any external EUR/USD reference rate is labeled "reference, not executable".
- No historical indexer exists in this stack. Rate history is sampled while the app is open (plus an optional labeled reference series). Volume and transactions are limited to the connected wallet's swaps through FXBridge, verified against onchain receipts.
- Anything without a live source gets a visible "Demo data" badge. Nothing simulates a successful swap.

### Architecture
- Blockchain: Arc Testnet only. USDC is the gas token. Chain facts come from `@/onchain-facts`. EURC (`0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`) goes in `.env` as `VITE_EURC_ADDRESS`.
- Swap: Circle App Kit (`@circle-fin/app-kit` + `@circle-fin/adapter-viem-v2`, already installed) with the browser wallet as signer.
  - Flow: enter amount, `estimateSwap`, show review (estimated output, provider fee, effective rate, minimum received at the chosen slippage, USDC gas estimate, provider disclosure), the user clicks Swap (explicit confirmation, the only place `swap()` is called), then pending, confirmed or failed with the real `txHash`, receipt verified onchain, Arc explorer link.
  - Mandatory slippage setting (default 0.5%, up to 3%, warning above 1%). Large-amount warning. Reject same-token and USDC-to-native swaps before routing. Real error states: no route, quote expired, rejected signature, insufficient balance or gas.
- Data: quotes refresh every 15s with a quote-age indicator. Swap records are stored per wallet only after the receipt is verified.
- Frontend: React, Tailwind, wagmi v2 (`useAccount`), viem, ConnectKit, framer-motion, lucide. SVG charts, no new dependency. Dark navy/black, blue and violet gradients, glass cards, mobile bottom nav.
- Wallet: ConnectKit. Shows the address and USDC/EURC balances (6-decimal ERC-20 view only), prompts a network switch, links the faucet.

### Files to Create/Modify
1. `.env`: add `VITE_EURC_ADDRESS`.
2. `src/config.ts`: Arc Testnet chain and RPC from `@/onchain-facts`.
3. `src/lib/tokens.ts`: USDC and EURC metadata and pair validation.
4. `src/lib/swapKit.ts`: AppKit instance, wallet-to-adapter helper (switches to Arc Testnet first), typed estimate and execute wrappers.
5. `src/lib/format.ts`: money, rate, percent formatting on top of `@/onchain-money`.
6. `src/lib/history.ts`: per-wallet swap record store with receipt verification.
7. `src/lib/rates.ts`: sampled quote series and optional reference-rate fetch, tagged by source.
8. `src/hooks/useBalances.ts`: USDC and EURC balances.
9. `src/hooks/useQuote.ts`: debounced, auto-refreshing quote with age and error state.
10. `src/hooks/useSwap.ts`: review, confirm, pending, confirmed or failed state machine with receipt verification.
11. `src/components/layout/AppShell.tsx`: nav, wallet button, network badge, mobile bottom nav, page transitions.
12. `src/components/ui/`: GlassCard, Badge (incl. Demo), Skeleton, Stat, Sparkline, LineChart.
13. `src/components/exchange/SwapCard.tsx`: inputs, flip, balance and Max, quote details.
14. `src/components/exchange/ReviewPanel.tsx`: pre-signing breakdown and Swap button.
15. `src/components/exchange/SlippageSettings.tsx`: slippage control with warnings.
16. `src/components/exchange/TxStatus.tsx`: live status with explorer link.
17. `src/pages/Home.tsx`: hero ("One Bridge. Multiple Stablecoins. Endless Possibilities.", subheadline, CTAs "Start Exchanging" and "Explore Markets"), live ticker, three-step overview.
18. `src/pages/Exchange.tsx`: swap interface and recent swaps.
19. `src/pages/Markets.tsx`: assets table with live rate, reference rate, deviation, sparkline.
20. `src/pages/Portfolio.tsx`: balances, allocation, quick swap actions.
21. `src/pages/Transactions.tsx`: full history with hash, input, output, fees, timestamp, status, explorer links, filters, CSV export.
22. `src/pages/Analytics.tsx`: your volume, swap count, average rate, rate chart, conversion activity, each labeled by source.
23. `src/pages/Docs.tsx`: how it works, fees, slippage, provider disclosure, security model, testnet notice, limitations.
24. `src/App.tsx`: hash routing for the seven pages and providers.
25. `src/index.css` and `tailwind.config.js`: theme tokens, glass utilities, animations.

### Build Sequence
1. Add the EURC env value, confirm the Arc Testnet config, and check SDK versions meet the Arc Testnet minimums.
2. Build the token, format and swap-kit libraries, then the balance and quote hooks. Verify a real `estimateSwap` in both directions.
3. Build the app shell, theme and UI primitives.
4. Build the Exchange page: SwapCard, slippage, ReviewPanel, then the swap state machine with receipt verification and TxStatus.
5. Persist confirmed swaps and build the Transactions page.
6. Build Markets, Portfolio and Analytics with source labels and Demo badges where needed.
7. Build Home and Docs.
8. Responsive and accessibility pass, with loading, empty and error states on every page.
9. Run typecheck and lint. In the preview, connect a funded testnet wallet and confirm one real swap in each direction with the hash visible in the Arc explorer. Walk the failure paths: rejected signature, insufficient balance, wrong network.

### Done When
- [ ] The app connects a wallet, switches to Arc Testnet and shows real USDC and EURC balances.
- [ ] USDC to EURC and EURC to USDC swaps each execute onchain, and the tx hash opens in the Arc testnet explorer.
- [ ] Before signing, the user sees estimated output, fees, slippage, minimum received, gas and the routing-provider disclosure.
- [ ] `swap()` is called only from the user's click on Swap, never automatically.
- [ ] Status moves from pending to confirmed or failed using real receipts; nothing is shown as successful without an onchain receipt.
- [ ] Transactions and volume come only from verified swaps and persist across reloads.
- [ ] Every figure without a live source is labeled (reference, sampled, or Demo).
- [ ] No private keys or seed phrases are requested or stored, and no API key is in browser code.
- [ ] All seven pages work, and the hero text and both buttons match the spec.
- [ ] The layout is responsive on desktop and mobile.
- [ ] Typecheck and lint pass; the app is testnet only.

## Ready to build?
