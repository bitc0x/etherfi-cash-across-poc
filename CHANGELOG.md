# Changelog

## [unreleased]

### Docs
- Scrubbed em/en dashes from reference page user-facing copy; qualified cash page buySteps
  walkthrough for the Fusion path; added a Path vs Pattern naming disambiguation note in
  reference section 01.
- Added Pattern B Implementation Guide as a turnkey blueprint for integrators implementing
  single-signature Fusion via ERC-1271. Linked from the reference page Pattern B subsection.

### Docs alignment
- Aligned landing and cash page copy with the current PoC state: the single-signature /
  MulticallHandler framing is now scoped to the atomic paths (Bebop, 1inch Aggregation), with
  the async Fusion path (two signatures today, USDC delivered to the user wallet) called out
  explicitly. Added an "Integrator Requirements Profile" section to the reference and marked
  Pattern B (single-signature Fusion via ERC-1271) as designed, not yet built.

### Destination liquidity
- Three destination sources wired and selectable per trade for Bebop-buyable Ondo GM stocks:
  Bebop RFQ (atomic, zero slippage), 1inch Aggregation (atomic, multi-DEX), and 1inch Fusion
  (async, Dutch auction).
- Fusion orders constructed with `allowPartialFills=false` and `allowMultipleFills=false`,
  matching ether.fi's no-partial-fills requirement on the destination swap leg.

### Fusion async path
- Order submission now happens **after** Across delivers USDC to the user's Ethereum wallet,
  not before. 1inch's relayer runs a maker balance/allowance pre-flight at submit time;
  submitting before delivery loses that check and the order never enters the book. Both
  signatures are still captured back-to-back upfront; only the submit is deferred until the
  bridge poll confirms delivery.
- Off-hours handling: Fusion quotes are gated to US market hours (Mon–Fri 9:30–16:00 ET) with
  a `marketHoursIssue` flag and a clean in-UI fallback to Bebop RFQ or 1inch Aggregation.

### Async order tracking (optional)
- When `NEXT_PUBLIC_TRACKING_URL` is set, the Fusion path fires a fire-and-forget registration
  to the `across-order-tracking` service after the deposit is mined. Unset → skipped, identical
  behavior.

### Housekeeping
- Removed the live Across API key from `.env.example` and the landing page; the key is now
  server-side only and shared privately. `.env.example` documents every env var the code reads.
- Reference script (`scripts/path-a-reference.ts`) token addresses aligned with the live token
  registry in `src/lib/tokens.ts`.
