import { NextRequest, NextResponse } from 'next/server';
import { RelayerRequest } from '@1inch/fusion-sdk';
import type { LimitOrderV4Struct } from '@1inch/limit-order-sdk';
import { getFusionSDK } from '@/lib/fusion-sdk';

// /api/fusion-submit
//
// Receives a client-signed Fusion order and submits it to 1inch's relayer
// via the SDK's RelayerRequest. The SDK is used here purely to format the
// request payload to exactly what the relayer expects — no signing happens
// on the server, the signature must already be present in the body.
//
// Expected body shape (sent by client after wallet.signTypedData):
//   {
//     order: LimitOrderV4Struct,  // exactly what /api/fusion-build-order returned
//     signature: "0x..."          // user's signature over the typed data
//     quoteId: "uuid",            // from /api/fusion-build-order
//     extension: "0x..."          // from /api/fusion-build-order
//   }
//
// Successful submission returns the orderHash for status polling. The order
// is now in the order book; resolvers will compete to fill it during the
// Dutch auction window.
// =========================================================================

export async function POST(req: NextRequest) {
  let body: {
    order?: Record<string, unknown>;
    signature?: string;
    extension?: string;
    quoteId?: string;
    orderHash?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { order, signature, extension, quoteId, orderHash } = body;

  if (!order || !signature || !extension || !quoteId) {
    return NextResponse.json(
      { error: 'missing required fields: order, signature, extension, quoteId' },
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
    // Construct the RelayerRequest using the SDK's helper class. The cast
    // is safe because /api/fusion-build-order returned this exact struct
    // shape via sdk.createOrder().order.build().
    const relayerRequest = new RelayerRequest({
      order: order as unknown as LimitOrderV4Struct,
      signature,
      quoteId,
      extension,
    });

    await sdk.api.submitOrder(relayerRequest);

    return NextResponse.json(
      { ok: true, orderHash, quoteId },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: unknown) {
    // Surface what 1inch actually rejected. The Fusion SDK wraps axios errors;
    // the upstream response body lives at e.response.data and is exactly what
    // 1inch's relayer wrote into the 400/5xx body. Without exposing it, the
    // client sees only "Request failed with status code 400" from axios's
    // default message, which is uselessly generic for diagnosing rejected
    // submits (sub-economic order, predicate mismatch, balance check, etc.).
    //
    // Defense: cap the upstream payload at 2KB to avoid leaking unexpected
    // large blobs. The structure 1inch returns is small JSON; 2KB is plenty.
    const eAny = e as Record<string, unknown>;
    const response = eAny?.response as Record<string, unknown> | undefined;
    const upstreamStatus =
      typeof response?.status === 'number' ? (response.status as number) : null;
    const upstreamData = response?.data ?? null;
    let upstreamSnippet: string | null = null;
    try {
      const s = typeof upstreamData === 'string' ? upstreamData : JSON.stringify(upstreamData);
      upstreamSnippet = s ? s.slice(0, 2048) : null;
    } catch {
      upstreamSnippet = '[unserializable upstream body]';
    }

    const msg = e instanceof Error ? e.message : 'fusion submit failed';

    // Server-side log: visible in Vercel runtime logs. orderHash included so
    // we can correlate to client-side reports.
    console.error('[fusion-submit] upstream error:', {
      msg,
      upstreamStatus,
      upstreamSnippet,
      orderHash,
    });

    return NextResponse.json(
      {
        error: 'fusion submit failed',
        detail: msg.slice(0, 500),
        upstreamStatus,
        upstream: upstreamData ?? null,
      },
      { status: 502 },
    );
  }
}
