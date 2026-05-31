import { NextRequest, NextResponse } from 'next/server';
import { PresetEnum } from '@1inch/fusion-sdk';
import { getFusionSDK } from '@/lib/fusion-sdk';

// /api/fusion-build-order
//
// Uses the @1inch/fusion-sdk's createOrder() to construct a Fusion limit
// order. The SDK handles the bit-packed makerTraits, the salt that hashes
// the Fusion-specific extension, and the EIP-712 domain — all of which are
// fragile to hand-roll and trigger silent on-chain failures if even one
// bit is off.
//
// We extract three things to send to the client:
//   1. typedData      - EIP-712 structure for wallet.signTypedData
//   2. orderHash      - precomputed for status polling
//   3. extension      - hex-encoded extension bytes (passed alongside the
//                       signed order when submitting to the relayer)
//   4. orderStruct    - the LimitOrderV4Struct (sent back for /fusion-submit)
//   5. quoteId        - needed by the relayer to deduplicate
//
// Client flow:
//   1. POST { fromTokenAddress, toTokenAddress, amount, walletAddress, preset }
//   2. Client signs typedData using viem's signTypedData
//   3. Client POSTs { order, signature, quoteId, extension } to /api/fusion-submit
// =========================================================================

const CHAIN_ID = 1; // Ethereum mainnet (Fusion destination chain in this PoC)

export async function POST(req: NextRequest) {
  let body: {
    fromTokenAddress?: string;
    toTokenAddress?: string;
    amount?: string;
    walletAddress?: string;
    preset?: 'fast' | 'medium' | 'slow';
    source?: string;
    receiver?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const {
    fromTokenAddress,
    toTokenAddress,
    amount,
    walletAddress,
    preset,
    receiver,
  } = body;
  const source = body.source || 'etherfi-cash-across-poc';

  if (!fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
    return NextResponse.json(
      {
        error:
          'missing required fields: fromTokenAddress, toTokenAddress, amount, walletAddress',
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

  const presetMap: Record<string, PresetEnum> = {
    fast: PresetEnum.fast,
    medium: PresetEnum.medium,
    slow: PresetEnum.slow,
  };

  try {
    const prepared = await sdk.createOrder({
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      preset: preset ? presetMap[preset] : PresetEnum.fast,
      source,
      ...(receiver ? { receiver } : {}),
    });

    // Extract the on-the-wire pieces the client needs.
    const typedData = prepared.order.getTypedData(CHAIN_ID);
    const orderStruct = prepared.order.build();
    const extension = prepared.order.extension.encode();

    return NextResponse.json(
      {
        typedData,
        orderHash: prepared.hash,
        quoteId: prepared.quoteId,
        order: orderStruct,
        extension,
        // Surface auction parameters from the prepared order for UI display
        auction: {
          startTime: prepared.order.auctionStartTime.toString(),
          endTime: prepared.order.auctionEndTime.toString(),
          deadline: prepared.order.deadline.toString(),
        },
        // Echo computed amounts so the UI can show what the user will get
        amounts: {
          makingAmount: prepared.order.makingAmount.toString(),
          takingAmount: prepared.order.takingAmount.toString(),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fusion createOrder failed';
    const lower = msg.toLowerCase();
    const isMarketHoursIssue =
      lower.includes('500') ||
      lower.includes('internal server error') ||
      lower.includes('no liquidity') ||
      lower.includes('no quote');
    return NextResponse.json(
      {
        error: 'fusion build-order failed',
        marketHoursIssue: isMarketHoursIssue,
        detail: msg.slice(0, 500),
      },
      { status: 502 },
    );
  }
}
