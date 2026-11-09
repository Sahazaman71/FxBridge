## Implementation Plan: Arc Milestone Escrow

### Summary
A milestone-based USDC escrow for freelance and service work. Clients fund a job up front and funds release per milestone. If a milestone is disputed, a panel of staked reviewers votes on the outcome. For clients and freelancers who want trust-minimized payments with a fair dispute path. Arc Testnet only.

### Architecture
- Blockchain: Arc Testnet. USDC is the gas and payment token, so fees are predictable and payments confirm in under a second.
- Contract: `MilestoneEscrow` (Solidity), using OpenZeppelin SafeERC20, ReentrancyGuard, Pausable, AccessControl.
  - Roles: client, freelancer, reviewer, admin (pause and parameters only).
  - Job lifecycle:
    - `createJob(freelancer, amounts[], deadlines[], reviewWindow)`
    - `fundJob(id)` pulls the total USDC into escrow
    - `submitMilestone(id, i, deliverableHash, uri)` (freelancer)
    - `approveMilestone(id, i)` (client) releases that milestone
    - `claimAfterWindow(id, i)` lets the freelancer release funds if the client is silent past the review window
    - `refundExpired(id, i)` returns funds to the client if the deadline is missed
    - `cancelUnfunded(id)`
  - Disputes:
    - `raiseDispute(id, i)` (client, within the review window) posts a dispute bond
    - `proposeSplit(id, i, bps)` / `acceptSplit` lets the parties settle on their own
    - `registerReviewer()` takes a USDC stake; `withdrawReviewerStake()` returns it after a cooldown
    - `castVote(disputeId, forFreelancer)` is limited to staked reviewers who are not a party to the job; the first 3 votes decide
    - `resolveDispute(disputeId)` pays the milestone to the winner, shares the bond among majority voters, slashes a small part of the minority's stake, and updates reviewer reputation (votes cast and majority votes)
  - Safety: pull-based accounting, checks-effects-interactions, reentrancy guards, a single state machine per milestone (no double payout), and a pause that never blocks refunds or withdrawals. First-come reviewers means reviewer collusion is a known limitation, documented in the design doc.
  - Events are emitted for every state change so the frontend can build timelines from logs.
  - Uses the Arc Testnet USDC ERC-20 interface (6 decimals). Confirm the address and decimals against the Arc docs before wiring.
- Frontend: React, Tailwind, wagmi/viem with role-aware views: dashboard, create-job wizard, job detail with milestone timeline, dispute page, reviewer console. Deliverables are a URL plus a keccak256 hash computed in the browser, with no file storage backend.
- Wallet: ConnectKit (already configured).

### Files to Create/Modify
1. `docs/DESIGN.md`: design doc (goals, actors and trust model, roles, storage layout, state machine, security table, threat model including reviewer collusion and griefing, emergency plan, test plan).
2. `contracts/src/MilestoneEscrow.sol`: escrow and dispute contract.
3. `contracts/test/MilestoneEscrow.t.sol`: unit tests (happy path, auto-release, expiry refund, double payout, access control, pause, every dispute outcome and settlement).
4. `contracts/test/MilestoneEscrow.invariant.t.sol`: invariants (escrow balance equals unreleased milestones plus bonds and stakes; no milestone pays out twice).
5. `src/config.ts`: contract and USDC addresses and contract parameters (review window, dispute bond, stake size, slash share).
6. `src/lib/escrowAbi.ts`: contract ABI.
7. `src/lib/escrow.ts`: typed read/write helpers, status enums, USDC formatting, keccak file hashing, event-log fetching.
8. `src/hooks/useJobs.ts` and `src/hooks/useDisputes.ts`: job, milestone and dispute state from reads and logs.
9. `src/components/CreateJobWizard.tsx`: freelancer address, milestone builder, fund step.
10. `src/components/JobDetail.tsx`: milestone timeline with role-aware actions.
11. `src/components/MilestoneActions.tsx`: submit, approve, claim, refund, dispute buttons with tx state handling.
12. `src/components/DisputePanel.tsx`: evidence links, vote tally, settlement proposal.
13. `src/components/ReviewerConsole.tsx`: stake, open disputes, voting, reputation.
14. `src/components/Dashboard.tsx`: job list filtered by role and status.
15. `src/App.tsx`: layout, wallet connect, hash routing (`#/`, `#/job/:id`, `#/reviewer`).

### Build Sequence
1. Write `docs/DESIGN.md` and settle the state machine, roles and parameters.
2. Write `MilestoneEscrow.sol`, then the unit and invariant tests; compile and fix until they pass.
3. Run a security review of the contract and apply the fixes.
4. Deploy to Arc Testnet and record addresses and parameters in `src/config.ts`.
5. Add the ABI, helpers and hooks.
6. Build the create-job wizard and fund flow.
7. Build the job detail page and milestone actions for client and freelancer.
8. Build the dispute flow: raise, settle, and the reviewer console with voting.
9. Build the dashboard, empty states, faucet note and error handling.
10. Run the whole flow in the preview with several wallets: happy path, silent-client auto-release, and a disputed milestone resolved by 3 reviewer votes.

### Done When
- [ ] Design doc exists and matches the deployed behavior.
- [ ] Contract is deployed to Arc Testnet and the addresses are in `src/config.ts`.
- [ ] Unit and invariant tests pass.
- [ ] A client can create and fund a job, and approving a milestone releases USDC to the freelancer.
- [ ] A freelancer can claim a milestone after the review window if the client is silent.
- [ ] The client is refunded if a deadline is missed.
- [ ] A disputed milestone can be settled by agreement or by 3 reviewer votes; the winner is paid, and the bond and slashing are distributed correctly.
- [ ] Parties to a job cannot vote on its dispute, and a milestone cannot be paid twice.
- [ ] Pause blocks new jobs but never blocks refunds or withdrawals.
- [ ] The UI shows only actions valid for the viewer's role.
- [ ] The app is testnet only.

## Ready to build?
