# ether.fi × Across

Integration proposal and working PoC for ether.fi Cash, powered by the Across Swap API.

- **Landing / deck**: `/`
- **Live demo**: `/cash`

## What this is

Cash users hold USDC in a safe on Optimism. The assets they want (Ondo Global Markets tokens, sUSDe, weETH, sDAI, USDS) live on Ethereum. Across closes that gap. The Swap API routes USDC on OP into the target Ethereum asset, and embedded actions deposit it into the ether.fi Ethereum vault in a single transaction.

## Architecture

- Next.js 14 (App Router) + TypeScript
- wagmi + RainbowKit for wallet connect
- Tailwind for styling, ether.fi-inspired dark theme with mint accent
- Server-side `/api/swap` proxy for Across Swap API (keeps `ACROSS_API_KEY` and `ACROSS_INTEGRATOR_ID` off the client)
- Across Swap API: `POST /api/swap/approval` with `tradeType=exactInput`, decimals read from quote response
- Status polling via `/api/status` proxy

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Deploy

Vercel: connect the repo, set `ACROSS_API_KEY` and `ACROSS_INTEGRATOR_ID` as environment variables.

## Credentials (pre-provisioned for ether.fi)

- Integrator ID: `0x0162`
- API Key: passed as Bearer token via server-side proxy

---

Built for ether.fi by Across. Risk Labs, 2026.
