import { NextRequest, NextResponse } from 'next/server';

// Bebop RFQ API proxy. Used as the destination-side liquidity source for permissioned RWA
// tokens (Ondo Global Markets stocks: TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, CRCLon).
// The taker_address parameter MUST be the MulticallHandler so that when MulticallHandler
// executes the swap on destination, msg.sender matches the quoted taker. The receiver_address
// is where the bought tokens (e.g. TSLAon) actually land - typically the user's wallet.

const BEBOP_BASE = 'https://api.bebop.xyz/pmm/ethereum/v3/quote';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const sellTokens = searchParams.get('sellTokens');
  const buyTokens = searchParams.get('buyTokens');
  const sellAmounts = searchParams.get('sellAmounts');
  const takerAddress = searchParams.get('takerAddress');
  const receiverAddress = searchParams.get('receiverAddress');

  if (!sellTokens || !buyTokens || !sellAmounts || !takerAddress) {
    return NextResponse.json(
      { error: 'missing required params: sellTokens, buyTokens, sellAmounts, takerAddress' },
      { status: 400 },
    );
  }

  const url = new URL(BEBOP_BASE);
  url.searchParams.set('sell_tokens', sellTokens);
  url.searchParams.set('buy_tokens', buyTokens);
  url.searchParams.set('sell_amounts', sellAmounts);
  url.searchParams.set('taker_address', takerAddress);
  url.searchParams.set('receiver_address', receiverAddress || takerAddress);
  url.searchParams.set('gasless', 'false');

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    // Optional Bebop API key. Without it: heavily rate-limited + worse pricing per Bebop docs.
    const apiKey = process.env.BEBOP_API_KEY;
    if (apiKey) headers['source-auth'] = apiKey;

    const r = await fetch(url.toString(), { headers, cache: 'no-store' });
    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: text }, { status: r.status });
    }
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: 'invalid upstream' }, { status: 502 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
