# FXBridge

A stablecoin exchange for converting USDC and EURC on Arc Testnet. Users get a live quote, review every fee and the minimum they will receive, sign in their own wallet, and see the result confirmed onchain. The app also has markets, a portfolio view, swap history, analytics and a short guide.

Built with [Arc Studio](https://studio.arc.io)

## What you can do

- Swap USDC and EURC with live quotes, fee breakdown and slippage protection.
- Compare the executable rate with the Circle price feed and an ECB EUR/USD reference.
- See wallet balances, swap history with explorer links, and your own volume and rate charts.

Everything runs on Arc Testnet. Test tokens have no real-world value. History and volume cover swaps made with your wallet through this app in the current browser.

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS
- wagmi, viem, ConnectKit (injected browser wallets)
- Circle App Kit for quotes and swaps
- Arc Testnet (USDC is the gas token)

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Other scripts:

```bash
bun run check       # lint and typecheck
```

### Environment variables

- `VITE_EURC_ADDRESS`: EURC token address on Arc Testnet (public value).
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: optional outside Arc Studio, provisioned for backend RPC access. Not used by this app.

## Data sources

- Executable quotes and swaps: Circle swap service, keyless from the browser.
- Prices: Circle price feed for Arc Testnet.
- EUR/USD reference and history: ECB daily rates via Frankfurter.
