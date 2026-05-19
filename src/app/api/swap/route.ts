import { NextRequest, NextResponse } from 'next/server';

const ACROSS_BASE = 'https://app.across.to/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const inputToken = searchParams.get('inputToken');
  const outputToken = searchParams.get('outputToken');
  const originChainId = searchParams.get('originChainId');
  const destinationChainId = searchParams.get('destinationChainId');
  const amount = searchParams.get('amount');
  const depositor = searchParams.get('depositor');
  const recipient = searchParams.get('recipient');

  if (!inputToken || !outputToken || !originChainId || !destinationChainId || !amount || !depositor) {
    return NextResponse.json({ error: 'missing required params' }, { status: 400 });
  }

  const apiKey = process.env.ACROSS_API_KEY;
  const integratorId = process.env.ACROSS_INTEGRATOR_ID || '0x0155';

  const url = new URL(`${ACROSS_BASE}/swap/approval`);
  url.searchParams.set('inputToken', inputToken);
  url.searchParams.set('outputToken', outputToken);
  url.searchParams.set('originChainId', originChainId);
  url.searchParams.set('destinationChainId', destinationChainId);
  url.searchParams.set('amount', amount);
  url.searchParams.set('depositor', depositor);
  url.searchParams.set('recipient', recipient || depositor);
  url.searchParams.set('tradeType', 'exactInput');
  url.searchParams.set('integratorId', integratorId);
  url.searchParams.set('slippageTolerance', '1');

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const r = await fetch(url.toString(), { headers, cache: 'no-store' });
    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: text || `upstream ${r.status}` }, { status: r.status });
    }
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: 'invalid upstream response' }, { status: 502 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
