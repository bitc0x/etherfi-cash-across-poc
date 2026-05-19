import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId');

  try {
    const r = await fetch('https://app.across.to/api/swap/tokens', {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return NextResponse.json({ error: `upstream ${r.status}` }, { status: r.status });
    const all = (await r.json()) as Array<{ chainId: number; symbol: string; address: string; decimals: number; name: string; logoUrl?: string; priceUsd?: string }>;
    const filtered = chainId ? all.filter((t) => String(t.chainId) === chainId) : all;
    return NextResponse.json(filtered);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
