import { NextResponse } from 'next/server';

export const revalidate = 3600; // cache 1h

export async function GET() {
  try {
    const r = await fetch('https://app.across.to/api/swap/chains', {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return NextResponse.json({ error: `upstream ${r.status}` }, { status: r.status });
    const j = await r.json();
    return NextResponse.json(j);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
