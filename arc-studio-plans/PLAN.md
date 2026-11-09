## Implementation Plan: Arc Invoice

### Summary
Arc Invoice lets freelancers and small businesses create a USDC invoice and share a payment link. The payer opens the link, connects a wallet, and pays. The invoice is marked paid onchain. Arc Testnet only.

### Architecture
- Blockchain: Arc Testnet. USDC is the gas token, so users need only USDC and fees are predictable.
- Contract: `InvoiceRegistry` (Solidity).
  - `createInvoice(uint256 amount, string memo) returns (uint256 id)` stores issuer, amount, memo, status.
  - `payInvoice(uint256 id)` pulls USDC from the payer via `transferFrom` straight to the issuer, marks the invoice paid, rejects a second payment.
  - `cancelInvoice(uint256 id)` issuer only, unpaid only.
  - `getInvoice(uint256 id)` view.
  - Events: `InvoiceCreated`, `InvoicePaid`, `InvoiceCancelled`.
  - The contract never holds funds.
  - Uses the Arc Testnet USDC ERC-20 interface (6 decimals). Confirm the address and decimals against the Arc docs before wiring.
- Frontend: React + Tailwind + wagmi/viem. Views: create invoice form, my invoices list, public pay page at `/#/pay/:id` (approve then pay), transaction status with explorer links.
- Wallet: ConnectKit (already configured).

### Files to Create/Modify
1. `contracts/src/InvoiceRegistry.sol`: the invoice contract.
2. `contracts/test/InvoiceRegistry.t.sol`: unit tests (create, pay, double-pay, cancel, wrong caller, insufficient allowance).
3. `src/config.ts`: add the deployed contract address and the Arc Testnet USDC address.
4. `src/lib/invoiceAbi.ts`: contract ABI.
5. `src/lib/invoice.ts`: read/write helpers, USDC formatting (6 decimals), share-link builder.
6. `src/components/CreateInvoiceForm.tsx`: amount and memo form, shows the shareable link.
7. `src/components/InvoiceList.tsx`: issued invoices with status badges and copy-link, read from `InvoiceCreated` logs filtered by issuer.
8. `src/components/PayInvoice.tsx`: payer view with approve step, pay step, success state.
9. `src/App.tsx`: header with wallet connect, hash-based routing between dashboard and pay page, layout.

### Build Sequence
1. Write `InvoiceRegistry.sol` and unit tests, then compile.
2. Deploy to Arc Testnet and record the address in `src/config.ts`.
3. Add the ABI file and invoice helpers.
4. Build the create-invoice form and share link.
5. Build the invoice list from events.
6. Build the pay page with approve-then-pay flow and loading, error, success states.
7. Wire routes in `App.tsx`, polish layout, add an empty state and a note about the testnet USDC faucet.
8. Test the full flow in the preview with two wallets: create, open the link, pay.

### Done When
- [ ] Contract deployed to Arc Testnet and its address is in `src/config.ts`.
- [ ] A connected wallet can create an invoice and get a working payment link.
- [ ] A different wallet opening the link sees the correct amount, memo and issuer.
- [ ] Paying sends USDC directly to the issuer and the invoice shows as Paid.
- [ ] A second payment attempt on a paid invoice fails with a clear message.
- [ ] The issuer can cancel an unpaid invoice.
- [ ] The invoice list shows accurate statuses.
- [ ] Unit tests pass and the app is testnet only.

## Ready to build?
