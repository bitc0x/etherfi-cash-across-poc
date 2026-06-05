# ether.fi × Across

Integration proposal and working PoC for ether.fi Cash, powered by the Across Swap API.

- **Landing / deck**: `/`
- **Live demo**: `/cash`
- **Integration reference (for ether.fi engineers)**: `/reference`

## What this is

Cash users hold USDC in a safe on Optimism. The assets they want — Ondo Global Markets
tokenized stocks (TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, CRCLon) plus live yield
assets (USDY, sUSDe, sDAI, weETH, wstETH, USDS) — live on Ethereum. Across closes that gap in
one user signature: it bridges USDC from Optimism to Ethereum and the requested asset is
delivered to the recipient (user wallet or Cash safe). No ether.fi vault is deployed; the
destination liquidity does the swap.

Two execution shapes are wired:

- **Atomic** (Bebop RFQ, 1inch Aggregation): Across delivers USDC to the MulticallHandler,
  which executes the destination swap in the same fill. One signature, ~2s, reverts cleanly if
  the swap fails.
- **Async** (1inch Fusion): Across delivers USDC to the user's Ethereum wallet, then a signed
  Fusion limit order is filled by a resolver via Dutch auction. Two signatures captured
  back-to-back upfront; the bridge + submit + fill then run headless.

Live yield assets (USDY, sUSDe, etc.) use the direct token-to-token Across Swap API path with
no destination action.

## Architecture

- Next.js 14 (App Router) + TypeScript
- wagmi + RainbowKit for wallet connect
- Tailwind, ether.fi-inspired dark theme with a gold accent (mint and violet as secondary)
- Server-side API routes proxy every upstream call so `ACROSS_API_KEY`, `BEBOP_API_KEY`, and
  `ONEINCH_API_KEY` stay off the client bundle:
  - `/api/swap` → Across `POST /swap/approval`, `tradeType=exactInput`, decimals read from the
    quote response
  - `/api/build-deposit` → Across bridge leg + Bebop RFQ or 1inch Aggregation destination swap,
    encoded into a MulticallHandler message (the atomic path)
  - `/api/fusion-quote`, `/api/fusion-build-order`, `/api/fusion-submit`, `/api/fusion-status`
    → 1inch Fusion (the async path)
  - `/api/status` → Across `deposit/status` polling
  - `/api/chains`, `/api/tokens` → Across chain/token metadata
- Optional async order-tracking layer: when `NEXT_PUBLIC_TRACKING_URL` is set, the Fusion path
  registers the order with the `across-order-tracking` service after the deposit is mined.

## Run locally

```bash
cp .env.example .env.local   # then fill in keys (see comments in the file)
npm install
npm run dev
```

Quotes work without an Across API key (rate-limited). The Bebop, 1inch Aggregation, and Fusion
paths need their respective keys; Bebop RFQ on TSLAon is the simplest end-to-end test.

## Deploy

Vercel: connect the repo and set the environment variables from `.env.example`. Only
`ACROSS_API_KEY` and `ACROSS_INTEGRATOR_ID` are needed for the core Bebop path; add
`BEBOP_API_KEY`, `ONEINCH_API_KEY`, and `NEXT_PUBLIC_TRACKING_URL` to enable the rest.

## Credentials (pre-provisioned for ether.fi)

- Integrator ID: `0x0162` (public attribution tag, safe to commit)
- API Key: provisioned for ether.fi and shared privately. It is a Bearer token used only
  server-side; it is never embedded in this repo, the landing page, or the client bundle. Set
  it as `ACROSS_API_KEY` in your environment.

---

Built for ether.fi by Across. Risk Labs, 2026.
