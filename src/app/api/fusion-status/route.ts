import { NextRequest, NextResponse } from 'next/server';
import { getFusionSDK } from '@/lib/fusion-sdk';

// /api/fusion-status?orderHash=0x...
//
// Polls 1inch's order status endpoint via the SDK. Returns current order
// state: pending (in auction), filled, expired, cancelled, etc.
//
// Frontend should poll every 2-3s while the order is open; stop on any
// terminal state (filled, expired, cancelled, false-predicate, etc.).
//
// Right after submission the order may not have propagated to 1inch's
// indexer yet. We surface that as 'pending-indexing' rather than an error
// so the client can keep polling without UI flicker.
// =========================================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderHash = searchParams.get('orderHash');

  if (!orderHash) {
    return NextResponse.json(
      { error: 'missing required param: orderHash' },
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
    const status = await sdk.getOrderStatus(orderHash);
    return NextResponse.json(
      JSON.parse(JSON.stringify(status)),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fusion status failed';
    // Treat "order not found" as a soft pending-indexing state right after
    // submission — common race condition with 1inch's indexer.
    if (msg.toLowerCase().includes('order_not_found') || msg.includes('not found')) {
      return NextResponse.json(
        {
          status: 'pending-indexing',
          orderHash,
          note: 'order submitted but not yet indexed by 1inch',
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      { error: 'fusion status failed', detail: msg.slice(0, 500) },
      { status: 502 },
    );
  }
}
