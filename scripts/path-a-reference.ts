/**
 * PATH A REFERENCE IMPLEMENTATION
 * --------------------------------
 * ether.fi Cash -> Across + Bebop RFQ -> Ondo GM tokens (TSLAon et al.)
 *
 * This script shows ether.fi exactly how to wire Bebop's RFQ quote into
 * Across's POST /swap/approval `actions` parameter to ship today, with
 * zero changes required on the Across side.
 *
 * What this script does:
 *   1) Asks Across what USDC will arrive at MulticallHandler after fees.
 *   2) Asks Bebop for an RFQ quote for that USDC -> TSLAon, taker set to
 *      MulticallHandler (because MulticallHandler is the msg.sender on
 *      destination), receiver set to the user wallet (TSLAon lands there).
 *   3) Parses Bebop's tx.data and extracts the structured order, maker
 *      signature, and filledTakerAmount. These are the three arguments
 *      to BebopBlend.swapSingle().
 *   4) Builds the Across /swap/approval POST body with an actions[]
 *      array containing the Bebop call, encoded per Across's nested
 *      parameters spec.
 *   5) Calls POST /swap/approval and gets back ready-to-broadcast
 *      deposit calldata.
 *
 * This script DOES NOT broadcast. It prints the deposit tx so an ether.fi
 * engineer can inspect, then connect their wallet client and send.
 *
 * To switch the destination token to NVDAon, GOOGLon, COINon, HOODon,
 * MSTRon, or CRCLon, just change BUY_TOKEN below. All seven are live
 * on Bebop today.
 *
 * Run:
 *   ACROSS_API_KEY=... ACROSS_INTEGRATOR_ID=0x0162 BEBOP_API_KEY=... \
 *     USER_WALLET=0xYour... INPUT_USDC=1312601 \
 *     npx tsx scripts/path-a-reference.ts
 */

import { decodeAbiParameters } from 'viem';

// =============================================================================
// CONSTANTS
// =============================================================================

const ORIGIN_CHAIN_ID = 10; // Optimism (where Cash users hold USDC)
const DESTINATION_CHAIN_ID = 1; // Ethereum (where Ondo GM lives)

const USDC_OP = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Across MulticallHandler on Ethereum. This is the recipient of the
// bridge fill, and the contract that executes the embedded Bebop action.
const MULTICALL_HANDLER_ETH = '0x924a9f036260DdD5808007E1AA95f08eD08aA569';

// Note: BebopBlend's settlement address (0xbbbbbBB520d69a9775E85b458C58c648259FAD5F)
// is returned dynamically in bebopQuote.tx.to. We use that rather than hardcoding,
// in case Bebop updates the routing for specific token pairs.

// Seven Bebop-buyable Ondo GM tickers as of May 2026. Addresses match the
// live PoC's token registry (src/lib/tokens.ts), verified against Bebop's
// tokenlist. To find more, query Bebop's /pmm/ethereum/v3/tokens endpoint.
const ONDO_GM_TOKENS = {
  TSLAon: '0xf6b1117ec07684D3958caD8BEb1b302bfD21103f',
  NVDAon: '0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE',
  GOOGLon: '0xbA47214eDd2bb43099611b208f75E4b42FDcfEDc',
  COINon: '0xF042cfa86cf1D598a75Bdb55c3507a1F39f9493b',
  HOODon: '0x998f02A9E343EF6E3E6f28700d5A20F839fD74E6',
  MSTRon: '0xCabD955322dfbf94C084929ac5E9Eca3fEB5556F',
  CRCLon: '0x3632DEa96A953C11dac2f00b4A05a32CD1063fAE',
} as const;

const BUY_TOKEN = ONDO_GM_TOKENS.TSLAon;

// =============================================================================
// INPUTS (from env or hardcoded for demo)
// =============================================================================

const USER_WALLET = (process.env.USER_WALLET ?? '0x10776A5f72D0498eC0C2Dcbc15d83ad57918b071') as `0x${string}`;
const INPUT_USDC = process.env.INPUT_USDC ?? '1312601'; // 1.312601 USDC (6 decimals)

const ACROSS_BASE = 'https://app.across.to/api';
const BEBOP_BASE = 'https://api.bebop.xyz/pmm/ethereum/v3';

// =============================================================================
// BEBOP swapSingle ABI
// -------------------------------------------------------------------------
// The Single order struct, copied verbatim from BebopBlend.sol. Field order
// must match the on-chain ABI exactly, or the call reverts on the destination.
// =============================================================================

const BEBOP_SINGLE_ORDER_COMPONENTS = [
  { name: 'expiry', type: 'uint256' },
  { name: 'taker_address', type: 'address' },
  { name: 'maker_address', type: 'address' },
  { name: 'maker_nonce', type: 'uint256' },
  { name: 'taker_token', type: 'address' },
  { name: 'maker_token', type: 'address' },
  { name: 'taker_amount', type: 'uint256' },
  { name: 'maker_amount', type: 'uint256' },
  { name: 'receiver', type: 'address' },
  { name: 'packed_commands', type: 'uint256' },
  { name: 'flags', type: 'uint256' },
] as const;

const BEBOP_MAKER_SIGNATURE_COMPONENTS = [
  { name: 'signatureBytes', type: 'bytes' },
  { name: 'signatureType', type: 'uint256' },
] as const;

// swapSingle(Single order, MakerSignature sig, uint256 filledTakerAmount)
const BEBOP_SWAP_SINGLE_INPUTS = [
  { type: 'tuple', components: BEBOP_SINGLE_ORDER_COMPONENTS },
  { type: 'tuple', components: BEBOP_MAKER_SIGNATURE_COMPONENTS },
  { type: 'uint256', name: 'filledTakerAmount' },
] as const;

const BEBOP_FUNCTION_SIGNATURE =
  'function swapSingle((uint256,address,address,uint256,address,address,uint256,uint256,address,uint256,uint256),(bytes,uint256),uint256)';

// =============================================================================
// MAIN FLOW
// =============================================================================

async function main() {
  console.log('=== Path A Reference: ether.fi -> Across + Bebop ===\n');
  console.log(`User wallet:       ${USER_WALLET}`);
  console.log(`Input USDC (OP):   ${INPUT_USDC} (${Number(INPUT_USDC) / 1e6} USDC)`);
  console.log(`Buying:            ${BUY_TOKEN} (TSLAon on Ethereum)\n`);

  // -----------------------------------------------------------------------
  // Step 1: ask Across what USDC will arrive at MulticallHandler.
  //
  // We use exactInput because the user types "I want to spend N USDC".
  // The response tells us the expectedOutputAmount, which is exactly
  // the USDC that will land at MulticallHandler on the destination chain.
  //
  // This is the value we need to pass to Bebop so the maker signs an
  // order for the right taker_amount.
  // -----------------------------------------------------------------------
  console.log('[1/5] Across quote: getting expectedOutputAmount...');
  const acrossQuoteParams = new URLSearchParams({
    tradeType: 'exactInput',
    originChainId: String(ORIGIN_CHAIN_ID),
    destinationChainId: String(DESTINATION_CHAIN_ID),
    inputToken: USDC_OP,
    outputToken: USDC_ETH,
    amount: INPUT_USDC,
    depositor: USER_WALLET,
    recipient: USER_WALLET,
    integratorId: process.env.ACROSS_INTEGRATOR_ID ?? '0x0162',
    slippageTolerance: '1',
  });
  const acrossQuoteRes = await fetch(`${ACROSS_BASE}/swap/approval?${acrossQuoteParams}`, {
    headers: process.env.ACROSS_API_KEY
      ? { Authorization: `Bearer ${process.env.ACROSS_API_KEY}`, Accept: 'application/json' }
      : { Accept: 'application/json' },
  });
  if (!acrossQuoteRes.ok) {
    throw new Error(`Across quote failed: ${await acrossQuoteRes.text()}`);
  }
  const acrossQuote = await acrossQuoteRes.json() as {
    expectedOutputAmount: string;
  };
  const usdcArrivingAtHandler = acrossQuote.expectedOutputAmount;
  console.log(`      USDC arriving at MulticallHandler: ${usdcArrivingAtHandler} (${Number(usdcArrivingAtHandler) / 1e6} USDC)\n`);

  // -----------------------------------------------------------------------
  // Step 2: Bebop quote.
  //
  // taker_address = MulticallHandler. Critical: Bebop signs the maker
  // order against this address, and on-chain the call to swapSingle
  // will have msg.sender == MulticallHandler (because MulticallHandler
  // is the one calling Bebop's settlement contract). If taker doesn't
  // match, the call reverts.
  //
  // receiver_address = the user's wallet. TSLAon goes directly there.
  // -----------------------------------------------------------------------
  console.log('[2/5] Bebop quote: USDC -> TSLAon, taker=MulticallHandler...');
  const bebopUrl = new URL(`${BEBOP_BASE}/quote`);
  bebopUrl.searchParams.set('sell_tokens', USDC_ETH);
  bebopUrl.searchParams.set('buy_tokens', BUY_TOKEN);
  bebopUrl.searchParams.set('sell_amounts', usdcArrivingAtHandler);
  bebopUrl.searchParams.set('taker_address', MULTICALL_HANDLER_ETH);
  bebopUrl.searchParams.set('receiver_address', USER_WALLET);
  bebopUrl.searchParams.set('gasless', 'false');

  const bebopHeaders: Record<string, string> = { Accept: 'application/json' };
  if (process.env.BEBOP_API_KEY) bebopHeaders['source-auth'] = process.env.BEBOP_API_KEY;
  const bebopRes = await fetch(bebopUrl.toString(), { headers: bebopHeaders });
  if (!bebopRes.ok) {
    throw new Error(`Bebop quote failed: ${await bebopRes.text()}`);
  }
  const bebopQuote = await bebopRes.json() as {
    tx: { to: string; data: `0x${string}`; value: string };
    buyTokens: Record<string, { amount: string; decimals: number }>;
    onchainOrderType?: string;
  };
  const buyInfo = Object.values(bebopQuote.buyTokens)[0];
  console.log(`      TSLAon to be received: ${buyInfo.amount} (${Number(BigInt(buyInfo.amount)) / 10 ** buyInfo.decimals} TSLAon)`);
  console.log(`      Bebop settlement: ${bebopQuote.tx.to}`);
  console.log(`      onchainOrderType: ${bebopQuote.onchainOrderType ?? 'SingleOrder (default)'}\n`);

  // -----------------------------------------------------------------------
  // Step 3: decode Bebop's tx.data.
  //
  // Bebop returns opaque calldata in tx.data. We strip the 4-byte
  // function selector and ABI-decode the rest as (Single, MakerSig, uint256).
  //
  // This gives us the structured order tuple that we can hand to Across's
  // actions parameter without having to interpret flag-packing logic.
  // -----------------------------------------------------------------------
  console.log('[3/5] Decoding Bebop tx.data into structured args...');
  const selector = bebopQuote.tx.data.slice(0, 10);
  if (selector !== '0x4dcebcba') {
    throw new Error(`unexpected Bebop selector ${selector}; expected swapSingle 0x4dcebcba. Did the order type change?`);
  }
  const rawArgs = ('0x' + bebopQuote.tx.data.slice(10)) as `0x${string}`;
  const [order, makerSignature, filledTakerAmount] = decodeAbiParameters(
    BEBOP_SWAP_SINGLE_INPUTS,
    rawArgs
  ) as [
    {
      expiry: bigint;
      taker_address: `0x${string}`;
      maker_address: `0x${string}`;
      maker_nonce: bigint;
      taker_token: `0x${string}`;
      maker_token: `0x${string}`;
      taker_amount: bigint;
      maker_amount: bigint;
      receiver: `0x${string}`;
      packed_commands: bigint;
      flags: bigint;
    },
    { signatureBytes: `0x${string}`; signatureType: bigint },
    bigint
  ];
  console.log(`      order.taker_address (must equal MulticallHandler): ${order.taker_address}`);
  console.log(`      order.receiver      (must equal user wallet):       ${order.receiver}`);
  console.log(`      order.taker_amount  (must equal arriving USDC):     ${order.taker_amount}`);
  console.log(`      order.maker_amount  (TSLAon out):                   ${order.maker_amount}`);
  console.log(`      makerSignature.bytes: ${makerSignature.signatureBytes.slice(0, 18)}...`);
  console.log(`      filledTakerAmount:   ${filledTakerAmount} (0 = full fill)\n`);

  // Sanity check: these must hold or the on-chain call reverts.
  if (order.taker_address.toLowerCase() !== MULTICALL_HANDLER_ETH.toLowerCase()) {
    throw new Error('order.taker_address mismatch; Bebop quote was not built for MulticallHandler');
  }
  if (order.taker_amount.toString() !== usdcArrivingAtHandler) {
    throw new Error(`order.taker_amount (${order.taker_amount}) does not equal Across expectedOutputAmount (${usdcArrivingAtHandler})`);
  }

  // -----------------------------------------------------------------------
  // Step 4: build the Across /swap/approval POST body.
  //
  // Per Across's "Handling Nested Parameters" doc, tuple args are passed
  // as JSON arrays of all the struct fields in ABI order. The Single
  // order tuple has 11 fields, the MakerSignature tuple has 2.
  //
  // populateDynamically: false everywhere because the maker signature
  // was signed against an exact taker_amount, so we must use it as-is.
  // -----------------------------------------------------------------------
  console.log('[4/5] Building Across /swap/approval actions[] payload...');
  const actions = [
    {
      target: bebopQuote.tx.to,
      functionSignature: BEBOP_FUNCTION_SIGNATURE,
      args: [
        {
          // Single order tuple, 11 fields in ABI order
          value: [
            order.expiry.toString(),
            order.taker_address,
            order.maker_address,
            order.maker_nonce.toString(),
            order.taker_token,
            order.maker_token,
            order.taker_amount.toString(),
            order.maker_amount.toString(),
            order.receiver,
            order.packed_commands.toString(),
            order.flags.toString(),
          ],
          populateDynamically: false,
        },
        {
          // MakerSignature tuple, 2 fields in ABI order
          value: [
            makerSignature.signatureBytes,
            makerSignature.signatureType.toString(),
          ],
          populateDynamically: false,
        },
        {
          // filledTakerAmount (uint256). 0 = full fill at order.taker_amount.
          value: filledTakerAmount.toString(),
          populateDynamically: false,
        },
      ],
      value: '0',
      isNativeTransfer: false,
      populateCallValueDynamically: false,
    },
  ];

  // The /swap/approval query params for the POST. Note recipient is now
  // MulticallHandler (not the user wallet) because MulticallHandler is
  // the contract that receives USDC and executes the action.
  const acrossPostParams = new URLSearchParams({
    tradeType: 'exactInput',
    originChainId: String(ORIGIN_CHAIN_ID),
    destinationChainId: String(DESTINATION_CHAIN_ID),
    inputToken: USDC_OP,
    outputToken: USDC_ETH,
    amount: INPUT_USDC,
    depositor: USER_WALLET,
    recipient: MULTICALL_HANDLER_ETH,
    integratorId: process.env.ACROSS_INTEGRATOR_ID ?? '0x0162',
    slippageTolerance: '1',
  });

  const orderArr = actions[0].args[0].value as string[];
  const sigArr = actions[0].args[1].value as string[];
  console.log(`      action.target:             ${actions[0].target}`);
  console.log(`      action.functionSignature:  ${actions[0].functionSignature.slice(0, 60)}...`);
  console.log(`      action.args[0] (order):    [${orderArr.slice(0, 3).join(', ')}, ...] (11 fields)`);
  console.log(`      action.args[1] (sig):      [${sigArr[0].slice(0, 14)}..., type=${sigArr[1]}]`);
  console.log(`      action.args[2] (filled):   ${actions[0].args[2].value}\n`);

  // -----------------------------------------------------------------------
  // Step 5: POST to Across. Across returns ready-to-broadcast deposit
  // transaction data, including any required ERC-20 approvals.
  // -----------------------------------------------------------------------
  console.log('[5/5] POST /swap/approval with actions[]...');
  const postRes = await fetch(`${ACROSS_BASE}/swap/approval?${acrossPostParams}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(process.env.ACROSS_API_KEY ? { Authorization: `Bearer ${process.env.ACROSS_API_KEY}` } : {}),
    },
    body: JSON.stringify({ actions }),
  });
  if (!postRes.ok) {
    const err = await postRes.text();
    throw new Error(`Across POST failed: ${err}`);
  }
  const deposit = await postRes.json();

  console.log('      Across deposit response received.');
  console.log(`      Steps to execute: ${(deposit.checks?.allowance?.actual ?? '0') === '0' ? 'approve USDC + deposit' : 'deposit only'}`);
  console.log(`      Deposit target: ${deposit.swapTx?.to ?? '(unknown)'}`);
  console.log(`      Deposit value:  ${deposit.swapTx?.value ?? '0'}`);
  console.log(`      Deposit gas:    ${deposit.swapTx?.gas ?? '(estimated)'}`);
  console.log();
  console.log('Full Across response (truncated):');
  console.log(JSON.stringify(deposit, null, 2).slice(0, 2000));
  console.log('...\n');

  console.log('=== Done. ===');
  console.log('Wire deposit.swapTx into your wallet client (viem walletClient.sendTransaction).');
  console.log('Across will route USDC from Optimism to Ethereum, MulticallHandler will execute');
  console.log('the Bebop call atomically, and TSLAon will land in the user wallet in ~2s.');
}

main().catch((e) => {
  console.error('\nERROR:', e instanceof Error ? e.message : e);
  process.exit(1);
});
