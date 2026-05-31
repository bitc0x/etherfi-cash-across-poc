import { NextRequest, NextResponse } from 'next/server';
import { encodeAbiParameters, encodeFunctionData, parseAbi, type Hex } from 'viem';

// =========================================================================
// /api/build-deposit
//
// Combines Across (USDC OP -> USDC ETH bridge leg) + Bebop RFQ (USDC ETH ->
// Ondo GM token destination swap) + MulticallHandler-encoded Instructions
// into a single SpokePool.depositV3 transaction the user signs once.
//
// Flow:
//   1. Fetch Across /swap/approval for USDC OP -> USDC ETH (user as recipient,
//      purely to extract expectedOutputAmount and quoteTimestamp).
//   2. Fetch Bebop /v3/quote with sell_amount = expectedOutputAmount, taker =
//      MulticallHandler, receiver = user. Bebop returns ready-to-broadcast
//      tx.data + settlement contract address.
//   3. Encode an Instructions struct of two Call elements:
//        a. USDC.approve(bebopSettlement, expectedOutputAmount)
//        b. bebopSettlement.<bebop tx.data>
//      plus fallbackRecipient = user so leftovers return cleanly.
//   4. abi.encode(Instructions) -> the message field for depositV3.
//   5. Build the SpokePool.depositV3 calldata with recipient = MulticallHandler
//      (NOT user, since MulticallHandler is the contract that runs the action;
//      tokens land at receiver inside the Bebop call).
//
// Returns the ready-to-submit transaction object the user signs in their wallet,
// plus a Bebop preview for the UI to display the expected output cleanly.
// =========================================================================

// Constants (verified live, checksummed)
const USDC_OP_ADDRESS = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as const;
const USDC_ETH_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;
const SPOKE_POOL_OP = '0x6f26Bf09B1C792e3228e5467807a900A503c0281' as const;
const MULTICALL_HANDLER_ETH = '0x924a9f036260DdD5808007E1AA95f08eD08aA569' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const ACROSS_BASE = 'https://app.across.to/api';
const ORIGIN_CHAIN_ID = 10;
const DESTINATION_CHAIN_ID = 1;

// ERC20 approve selector
const ERC20_ABI = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);

// SpokePool.depositV3 ABI (V4-current; depositV3 still supported alongside new deposit())
const SPOKE_POOL_ABI = parseAbi([
  'function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes message) payable',
]);

// Type of one element inside Instructions.calls
const CALL_TUPLE = {
  type: 'tuple',
  components: [
    { name: 'target', type: 'address' },
    { name: 'callData', type: 'bytes' },
    { name: 'value', type: 'uint256' },
  ],
} as const;

// Top-level Instructions tuple: { Call[] calls, address fallbackRecipient }
const INSTRUCTIONS_TUPLE = {
  type: 'tuple',
  components: [
    { ...CALL_TUPLE, type: 'tuple[]', name: 'calls' },
    { name: 'fallbackRecipient', type: 'address' },
  ],
} as const;

// Token metadata for output-amount formatting. The Bebop quote response
// carries decimals + symbol natively (we use those for the bebop path).
// 1inch's /swap response does NOT include them, so we look up known tokens
// here. Unknown tokens default to 18 decimals (ERC20 standard), which is
// correct for every Ondo GM token and most ERC20s; if we ever route into
// a non-18-decimal token via 1inch, this needs an on-chain decimals() call.
const TOKEN_META: Record<string, { symbol: string; decimals: number }> = {
  // Ondo GM tokens (18 decimals)
  '0xf6b1117ec07684d3958cad8beb1b302bfd21103f': { symbol: 'TSLAon', decimals: 18 },
  '0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee': { symbol: 'NVDAon', decimals: 18 },
  '0xba47214edd2bb43099611b208f75e4b42fdcfedc': { symbol: 'GOOGLon', decimals: 18 },
  // Stablecoins (6 decimals)
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
  // WETH + ETH-yield (18 decimals)
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 },
  '0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee': { symbol: 'weETH', decimals: 18 },
  // sUSDe + other yield assets (18 decimals)
  '0x9d39a5de30e57443bff2a8307a4256c8797a3497': { symbol: 'sUSDe', decimals: 18 },
};
function lookupTokenMeta(address: string): { symbol: string; decimals: number } {
  const found = TOKEN_META[address.toLowerCase()];
  if (found) return found;
  return { symbol: address.slice(0, 6) + '...' + address.slice(-4), decimals: 18 };
}

export async function POST(req: NextRequest) {
  let body: {
    depositor?: string;
    recipient?: string;
    inputAmount?: string;
    outputToken?: string;
    source?: 'bebop' | 'oneinch-aggregation';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { depositor, recipient, inputAmount, outputToken } = body;
  const source = body.source || 'bebop';

  if (!depositor || !inputAmount || !outputToken) {
    return NextResponse.json(
      { error: 'missing required fields: depositor, inputAmount, outputToken' },
      { status: 400 },
    );
  }
  if (source !== 'bebop' && source !== 'oneinch-aggregation') {
    return NextResponse.json(
      { error: `invalid source '${source}'. supported: 'bebop', 'oneinch-aggregation'` },
      { status: 400 },
    );
  }

  const finalRecipient = recipient || depositor;

  // -----------------------------------------------------------------------
  // Step 1: Across quote (USDC OP -> USDC ETH, recipient=user-EOA for the
  // estimate; we'll override recipient to MulticallHandler in the actual deposit).
  // -----------------------------------------------------------------------
  let acrossQuote: {
    inputAmount: string;
    expectedOutputAmount: string;
    minOutputAmount: string;
    timestamp?: string | number;
    fillDeadline?: string | number;
  };
  try {
    const acrossUrl = new URL(`${ACROSS_BASE}/swap/approval`);
    acrossUrl.searchParams.set('inputToken', USDC_OP_ADDRESS);
    acrossUrl.searchParams.set('outputToken', USDC_ETH_ADDRESS);
    acrossUrl.searchParams.set('originChainId', String(ORIGIN_CHAIN_ID));
    acrossUrl.searchParams.set('destinationChainId', String(DESTINATION_CHAIN_ID));
    acrossUrl.searchParams.set('amount', inputAmount);
    acrossUrl.searchParams.set('depositor', depositor);
    acrossUrl.searchParams.set('recipient', depositor);
    acrossUrl.searchParams.set('tradeType', 'exactInput');
    acrossUrl.searchParams.set('integratorId', process.env.ACROSS_INTEGRATOR_ID || '0x0162');
    acrossUrl.searchParams.set('slippageTolerance', '1');

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.ACROSS_API_KEY) headers.Authorization = `Bearer ${process.env.ACROSS_API_KEY}`;
    const r = await fetch(acrossUrl.toString(), { headers, cache: 'no-store' });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: 'across quote failed', detail: text }, { status: 502 });
    }
    acrossQuote = await r.json();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'across quote fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const usdcArrivingAtHandler = BigInt(acrossQuote.expectedOutputAmount);
  if (usdcArrivingAtHandler <= 0n) {
    return NextResponse.json({ error: 'across quote returned zero output' }, { status: 502 });
  }

  // Across V4 deposit timestamps. fillDeadline is the latest time a relayer is
  // allowed to fill the deposit before it can be refunded to fallbackRecipient.
  // Across's /swap/approval typically returns ~2 hours by default; we use 6h
  // here for a generous safety margin on the custom build-deposit path. Either
  // value works; this is purely an integrator-side configuration.
  const now = Math.floor(Date.now() / 1000);
  const quoteTimestamp = now;
  const fillDeadline = now + 6 * 60 * 60; // 6 hours

  // -----------------------------------------------------------------------
  // Step 2: destination-leg quote. Source-specific.
  //
  //   Bebop:               taker=MulticallHandler, receiver=user, RFQ pre-signed
  //   1inch Aggregation:   from=MulticallHandler, receiver=user, multi-DEX route
  //
  // Both yield the same shape downstream: a target contract + calldata
  // that MulticallHandler will execute after USDC arrives.
  // -----------------------------------------------------------------------
  type DestinationLeg = {
    target: Hex;
    callData: Hex;
    value: bigint;
    approvalSpender: Hex;       // contract to grant USDC allowance to
    outputAmount: string;        // raw base units
    outputAmountDecimal: number; // for UI display
    outputSymbol: string;
    outputDecimals: number;
    pricePerShare: number | null;
    sourceLabel: string;
    expiry?: number;             // optional expiry hint
  };

  let dest: DestinationLeg;

  if (source === 'bebop') {
    let bebopQuote: {
      settlementAddress: string;
      approvalTarget: string;
      expiry: number;
      tx: { to: string; data: string; value: string };
      buyTokens: Record<string, { amount: string; minimumAmount?: string; symbol: string; decimals: number; priceUsd: number }>;
    };
    try {
      const bebopUrl = new URL('https://api.bebop.xyz/pmm/ethereum/v3/quote');
      bebopUrl.searchParams.set('sell_tokens', USDC_ETH_ADDRESS);
      bebopUrl.searchParams.set('buy_tokens', outputToken);
      bebopUrl.searchParams.set('sell_amounts', usdcArrivingAtHandler.toString());
      bebopUrl.searchParams.set('taker_address', MULTICALL_HANDLER_ETH);
      bebopUrl.searchParams.set('receiver_address', finalRecipient);
      bebopUrl.searchParams.set('gasless', 'false');

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (process.env.BEBOP_API_KEY) headers['source-auth'] = process.env.BEBOP_API_KEY;

      const r = await fetch(bebopUrl.toString(), { headers, cache: 'no-store' });
      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json({ error: 'bebop quote failed', detail: text }, { status: 502 });
      }
      bebopQuote = await r.json();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'bebop quote fetch failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    if (!bebopQuote.tx?.data || !bebopQuote.settlementAddress) {
      return NextResponse.json({ error: 'bebop returned no tx data', detail: bebopQuote }, { status: 502 });
    }

    const buyEntries = Object.entries(bebopQuote.buyTokens || {});
    const buyInfo = buyEntries[0]?.[1];
    if (!buyInfo) {
      return NextResponse.json({ error: 'bebop returned no buyTokens info' }, { status: 502 });
    }

    dest = {
      target: bebopQuote.settlementAddress as Hex,
      callData: bebopQuote.tx.data as Hex,
      value: BigInt(bebopQuote.tx.value || '0'),
      approvalSpender: bebopQuote.settlementAddress as Hex,
      outputAmount: buyInfo.amount,
      outputAmountDecimal: Number(BigInt(buyInfo.amount)) / 10 ** buyInfo.decimals,
      outputSymbol: buyInfo.symbol,
      outputDecimals: buyInfo.decimals,
      pricePerShare: buyInfo.priceUsd ?? null,
      sourceLabel: 'Bebop RFQ',
      expiry: bebopQuote.expiry,
    };
  } else {
    // 1inch Aggregation API
    if (!process.env.ONEINCH_API_KEY) {
      return NextResponse.json(
        { error: '1inch API key not configured on server (set ONEINCH_API_KEY)' },
        { status: 503 },
      );
    }

    let oneinchQuote: {
      dstAmount: string;
      tx: { to: string; data: string; value: string };
    };
    try {
      const oiUrl = new URL('https://api.1inch.dev/swap/v6.0/1/swap');
      oiUrl.searchParams.set('src', USDC_ETH_ADDRESS);
      oiUrl.searchParams.set('dst', outputToken);
      oiUrl.searchParams.set('amount', usdcArrivingAtHandler.toString());
      oiUrl.searchParams.set('from', MULTICALL_HANDLER_ETH);
      oiUrl.searchParams.set('receiver', finalRecipient);
      oiUrl.searchParams.set('slippage', '1');
      oiUrl.searchParams.set('disableEstimate', 'true');

      const r = await fetch(oiUrl.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json({ error: '1inch quote failed', detail: text.slice(0, 500) }, { status: 502 });
      }
      oneinchQuote = await r.json();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '1inch quote fetch failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    if (!oneinchQuote.tx?.data || !oneinchQuote.tx?.to) {
      return NextResponse.json({ error: '1inch returned no tx data', detail: oneinchQuote }, { status: 502 });
    }

    // Look up output token decimals + symbol from our static registry. We
    // already maintain token metadata for the UI; trust it for display.
    const outputMeta = lookupTokenMeta(outputToken);

    dest = {
      target: oneinchQuote.tx.to as Hex,
      callData: oneinchQuote.tx.data as Hex,
      value: BigInt(oneinchQuote.tx.value || '0'),
      approvalSpender: oneinchQuote.tx.to as Hex, // 1inch router is its own spender
      outputAmount: oneinchQuote.dstAmount,
      outputAmountDecimal: Number(BigInt(oneinchQuote.dstAmount)) / 10 ** outputMeta.decimals,
      outputSymbol: outputMeta.symbol,
      outputDecimals: outputMeta.decimals,
      pricePerShare: null,
      sourceLabel: '1inch Aggregation',
    };
  }

  // -----------------------------------------------------------------------
  // Step 3: encode the two Call elements.
  //   Call 1: USDC.approve(approvalSpender, usdcArrivingAtHandler)
  //   Call 2: target.<dest.callData>
  // -----------------------------------------------------------------------
  const approveCalldata = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [dest.approvalSpender, usdcArrivingAtHandler],
  });

  const calls = [
    {
      target: USDC_ETH_ADDRESS,
      callData: approveCalldata,
      value: 0n,
    },
    {
      target: dest.target,
      callData: dest.callData,
      value: dest.value,
    },
  ];

  // -----------------------------------------------------------------------
  // Step 4: Encode the message = abi.encode(Instructions{calls, fallbackRecipient}).
  // The MulticallHandler's handleV3AcrossMessage will abi.decode the message
  // back into Instructions before executing each Call.
  // -----------------------------------------------------------------------
  const message = encodeAbiParameters(
    [INSTRUCTIONS_TUPLE],
    [
      {
        calls,
        fallbackRecipient: depositor as Hex,
      },
    ],
  );

  // -----------------------------------------------------------------------
  // Step 5: Build the SpokePool.depositV3 calldata. recipient = MulticallHandler.
  // -----------------------------------------------------------------------
  const depositCalldata = encodeFunctionData({
    abi: SPOKE_POOL_ABI,
    functionName: 'depositV3',
    args: [
      depositor as Hex,
      MULTICALL_HANDLER_ETH,
      USDC_OP_ADDRESS,
      USDC_ETH_ADDRESS,
      BigInt(inputAmount),
      usdcArrivingAtHandler,
      BigInt(DESTINATION_CHAIN_ID),
      ZERO_ADDRESS,
      quoteTimestamp,
      fillDeadline,
      0,
      message,
    ],
  });

  // -----------------------------------------------------------------------
  // Destination-leg preview for the UI. Source-agnostic field names so the
  // frontend can render identically across providers.
  // -----------------------------------------------------------------------
  return NextResponse.json({
    spokePool: SPOKE_POOL_OP,
    transaction: {
      to: SPOKE_POOL_OP,
      data: depositCalldata,
      value: '0',
      chainId: ORIGIN_CHAIN_ID,
    },
    bridge: {
      inputAmount,
      expectedOutputAmount: usdcArrivingAtHandler.toString(),
      acrossFeeBps: Number(((BigInt(inputAmount) - usdcArrivingAtHandler) * 10000n) / BigInt(inputAmount)),
    },
    destination: {
      source,
      sourceLabel: dest.sourceLabel,
      target: dest.target,
      approvalSpender: dest.approvalSpender,
      outputAmount: dest.outputAmount,
      outputAmountDecimal: dest.outputAmountDecimal,
      outputSymbol: dest.outputSymbol,
      outputDecimals: dest.outputDecimals,
      pricePerShare: dest.pricePerShare,
      expiry: dest.expiry,
    },
    // Backwards-compat: keep the original `bebop` field name when Bebop is
    // the source, so existing UI code that reads response.bebop still works
    // without changes during the migration.
    bebop: source === 'bebop'
      ? {
          outputAmount: dest.outputAmount,
          outputAmountDecimal: dest.outputAmountDecimal,
          outputSymbol: dest.outputSymbol,
          outputDecimals: dest.outputDecimals,
          pricePerShare: dest.pricePerShare,
          settlementAddress: dest.target,
          expiry: dest.expiry,
        }
      : null,
    deposit: {
      depositor,
      recipient: finalRecipient,
      multicallHandler: MULTICALL_HANDLER_ETH,
      quoteTimestamp,
      fillDeadline,
    },
  });
}
