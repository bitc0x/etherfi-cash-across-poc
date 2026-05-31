import { NextRequest, NextResponse } from 'next/server';

// /api/oneinch-quote
// Proxy to 1inch Swap v6 Aggregation API. Returns the destination-chain swap
// calldata that MulticallHandler will execute atomically after Across bridges
// USDC over. Pattern identical to Bebop: same Call shape (approve + swap),
// just sourced from 1inch's router instead of Bebop's settlement contract.
//
// 1inch's Aggregation routes across many sources (Uniswap V3, Curve, Bebop,
// other PMMs). For Ondo GM tokens specifically, 1inch usually routes via
// Bebop as one of its PMM integrations — same liquidity wrapped in 1inch's
// router. For general crypto, 1inch finds the best AMM/PMM path.
//
// Required params:
//   src, dst:    token addresses on Ethereum
//   amount:      input amount (raw, base units)
//   from:        address that will call 1inch's router (must be
//                MulticallHandler in our flow, since that's msg.sender
//                on destination)
//   receiver:    address that receives the output token (user wallet)
//
// Returns:
//   { dstAmount, tx: { to, data, value } }
// =========================================================================

const ONEINCH_BASE = 'https://api.1inch.dev/swap/v6.0/1/swap';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const src = searchParams.get('src');
  const dst = searchParams.get('dst');
  const amount = searchParams.get('amount');
  const from = searchParams.get('from');
  const receiver = searchParams.get('receiver');
  const slippage = searchParams.get('slippage') || '1';

  if (!src || !dst || !amount || !from) {
    return NextResponse.json(
      { error: 'missing required params: src, dst, amount, from' },
      { status: 400 },
    );
  }

  if (!process.env.ONEINCH_API_KEY) {
    return NextResponse.json(
      { error: '1inch API key not configured (set ONEINCH_API_KEY in env)' },
      { status: 503 },
    );
  }

  const url = new URL(ONEINCH_BASE);
  url.searchParams.set('src', src);
  url.searchParams.set('dst', dst);
  url.searchParams.set('amount', amount);
  url.searchParams.set('from', from);
  if (receiver) url.searchParams.set('receiver', receiver);
  url.searchParams.set('slippage', slippage);
  // Skip on-chain estimate since MulticallHandler doesn't have USDC pre-approved
  // at quote time; the approval is the first Call inside the deposit message.
  url.searchParams.set('disableEstimate', 'true');

  try {
    const r = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { error: '1inch quote failed', status: r.status, detail: text.slice(0, 500) },
        { status: 502 },
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: '1inch returned non-JSON', detail: text.slice(0, 200) }, { status: 502 });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '1inch fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
