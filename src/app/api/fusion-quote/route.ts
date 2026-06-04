import { NextRequest, NextResponse } from 'next/server';
import { getFusionSDK } from '@/lib/fusion-sdk';

// /api/fusion-quote
// Returns Fusion (intent-swap) quote with auction presets (fast/medium/slow).
// Uses the official @1inch/fusion-sdk under the hood to ensure preset
// parameters match what the resolvers expect.
//
// IMPORTANT: Fusion has resolver coverage for Ondo GM tokens (TSLAon
// etc.) via the Ondo x 1inch partnership, BUT only during US market
// hours (Mon-Fri 9:30am-4pm EST). Off-hours we get a 500 / no-quote /
// no-resolver style error because resolvers can't hedge the underlying
// equity exposure. The client surfaces this nuance via the
// marketHoursIssue flag.
//
// Note on serialization: the SDK's Quote object contains BigInt fields
// (auction amounts, deadlines, prices). JavaScript's default JSON
// serializer throws on BigInt with "Do not know how to serialize a
// BigInt". We use a replacer to coerce them to strings before
// transport. Client-side numeric handling already treats these fields
// as strings (parsed via BigInt()/Number() per field).
// =========================================================================

// Recursive replacer: coerces all BigInt values to decimal strings during
// JSON serialization. Applied to the Quote object before returning to the
// client.
function bigintSafeReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

// US equity market hours gate (Eastern Time, Mon-Fri 9:30 - 16:00). Used to
// short-circuit Fusion quotes off-hours where 1inch's submit endpoint will
// reject even though their quote endpoint now responds successfully. The
// UI already keys on `marketHoursIssue` to surface the offline notice and
// disable submit; this gate ensures it fires reliably instead of depending
// on the brittle upstream-error pattern matching in the catch block below.
//
// Holidays (Thanksgiving, Christmas, Good Friday, etc.) are NOT handled
// here — would require a fixed list to maintain. The heuristic in the
// catch block below remains as a backstop for those days, since 1inch is
// likely to error on quotes when there's no resolver coverage at all.
//
// Implementation note: Intl.DateTimeFormat with timeZone is the only
// reliable way to compute ET wall-clock time on a UTC-defaulted Vercel
// server. Round-tripping via toLocaleString into a Date constructor is
// fragile across Node versions.
function isWithinUSMarketHours(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const minutes = hour * 60 + minute;
  // 9:30 inclusive, 16:00 exclusive. At exactly 16:00 ET, after-hours begins
  // and resolvers wind down; at exactly 9:30 ET, the cash session opens.
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

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

  // Off-hours short-circuit. As of June 2026, 1inch's quote endpoint returns
  // successful quotes outside US market hours but their submit endpoint still
  // rejects with 400 — leaving users who get this far signing, broadcasting
  // the Across deposit, then having the Fusion submit fail. The result: USDC
  // stranded on Ethereum with no destination order, exactly the scenario the
  // tracking layer is built to surface.
  //
  // The legacy `marketHoursIssue` heuristic in the catch block below only
  // fires when the quote itself errors, which it no longer does. Keep both
  // gates as defense in depth: this clock check covers the common case,
  // the heuristic still catches holidays and unscheduled outages.
  if (!isWithinUSMarketHours()) {
    return NextResponse.json(
      {
        error: 'fusion quote unavailable: outside US market hours',
        marketHoursIssue: true,
        statusCode: null,
        detail:
          'US equity market hours are Mon-Fri 9:30 AM - 4:00 PM ET. Use Bebop RFQ or 1inch Aggregation for atomic routing in the meantime.',
      },
      { status: 502 },
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

    // BigInt-aware serialization. The Quote object has BigInt internals
    // that default JSON.stringify cannot handle. We coerce them to
    // strings; the client parses them back into BigInt where needed.
    const body = JSON.stringify(quote, bigintSafeReplacer);
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const lower = errMsg.toLowerCase();

    // Try several common shapes for the upstream status code. The SDK
    // wraps axios errors and may expose the upstream HTTP status under
    // any of these properties depending on version.
    const eAny = e as Record<string, unknown>;
    const statusCode =
      (typeof eAny?.statusCode === 'number' ? (eAny.statusCode as number) : undefined) ??
      (typeof eAny?.status === 'number' ? (eAny.status as number) : undefined) ??
      ((eAny?.response as Record<string, unknown> | undefined)?.status as number | undefined) ??
      ((eAny?.response as Record<string, unknown> | undefined)?.statusCode as number | undefined);

    // Broadened marketHoursIssue heuristic. Resolvers go offline at the
    // edges of the trading week (Fri close, weekend, pre-open Monday)
    // and can return any of these in upstream errors depending on which
    // layer rejects the quote.
    const MARKET_HOURS_PATTERNS = [
      '500',
      'internal server error',
      'no liquidity',
      'no quote',
      'no quote available',
      'no resolver',
      'no resolvers',
      'no maker',
      'no makers',
      'temporarily unavailable',
      'outside market hours',
      'market closed',
      'markets closed',
      'auction unavailable',
    ];

    const matchedPattern = MARKET_HOURS_PATTERNS.some((p) => lower.includes(p));
    const matchedStatus = typeof statusCode === 'number' && statusCode >= 500;
    const isMarketHoursIssue = matchedPattern || matchedStatus;

    // Log server-side so we can see what 1inch is actually returning
    // when the heuristic fires (helps tune the patterns over time).
    console.warn(
      `[fusion-quote] upstream error: status=${statusCode ?? 'n/a'} marketHoursIssue=${isMarketHoursIssue} msg="${errMsg.slice(0, 200)}"`,
    );

    return NextResponse.json(
      {
        error: 'fusion quote failed',
        marketHoursIssue: isMarketHoursIssue,
        statusCode: statusCode ?? null,
        detail: errMsg.slice(0, 500),
      },
      { status: 502 },
    );
  }
}
