import { NextRequest, NextResponse } from 'next/server';
import { getFusionSDK } from '@/lib/fusion-sdk';

// /api/fusion-quote
// Returns Fusion (intent-swap) quote with auction presets (fast/medium/slow).
// Uses the official @1inch/fusion-sdk under the hood to ensure preset
// parameters match what the resolvers expect.
//
// IMPORTANT: Fusion has resolver coverage for Ondo GM tokens (TSLAon
// etc.) via the Ondo x 1inch partnership, BUT only during US market
// hours (Mon-Fri 9:30am-4pm EST). Off-hours we get a 500 because
// resolvers can't hedge the underlying equity exposure. The client
// surfaces this nuance via the marketHoursIssue flag.
// =========================================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromTokenAddress = searchParams.get('fromTokenAddress');
  const toTokenAddress = searchParams.get('toTokenAddress');
  const amount = searchParams.get('amount');
  const walletAddress = searchParams.get('walletAddress');
  const source = searchParams.get('source') || 'etherfi-cash-across-poc';

  if (!fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
    return NextResponse.json(
      {
        error:
          'missing required params: fromTokenAddress, toTokenAddress, amount, walletAddress',
      },
      { status: 400 },
    );
  }

  let sdk;
  try {
    sdk = getFusionSDK();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '1inch SDK init failed';
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  try {
    const quote = await sdk.getQuote({
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      enableEstimate: true,
      source,
    });

    // The SDK returns a Quote class with internal data; serialize it cleanly
    // for the client. We re-shape into the same flat structure the 1inch
    // REST API returns so the client UI logic stays simple.
    return NextResponse.json(
      JSON.parse(JSON.stringify(quote)),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const lower = errMsg.toLowerCase();

    // 500 from the upstream quoter is the standard signal that resolvers
    // aren't quoting this pair right now. For Ondo GM tokens that's almost
    // always a US-market-hours issue (weekend or pre/post market). Surface
    // it cleanly so the UI can show the right message.
    const isMarketHoursIssue =
      lower.includes('500') ||
      lower.includes('internal server error') ||
      lower.includes('no liquidity') ||
      lower.includes('no quote');

    return NextResponse.json(
      {
        error: 'fusion quote failed',
        marketHoursIssue: isMarketHoursIssue,
        detail: errMsg.slice(0, 500),
      },
      { status: 502 },
    );
  }
}
