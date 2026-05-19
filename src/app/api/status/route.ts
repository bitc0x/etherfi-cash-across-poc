import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const originChainId = searchParams.get('originChainId');
  const depositId = searchParams.get('depositId');
  const depositTxHash = searchParams.get('depositTxHash');

  const url = new URL('https://app.across.to/api/deposit/status');
  if (originChainId) url.searchParams.set('originChainId', originChainId);
  if (depositId) url.searchParams.set('depositId', depositId);
  if (depositTxHash) url.searchParams.set('depositTxHash', depositTxHash);

  try {
    const r = await fetch(url.toString(), { cache: 'no-store' });
    const text = await r.text();
    if (!r.ok) return NextResponse.json({ error: text }, { status: r.status });
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: 'invalid upstream' }, { status: 502 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
