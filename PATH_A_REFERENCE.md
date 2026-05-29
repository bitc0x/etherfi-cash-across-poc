# Path A: ether.fi Cash + Across + Bebop integration guide

**For ether.fi engineers.** This document explains how to wire Across's `/swap/approval` API with an `actions[]` array to execute a USDC-on-Optimism to Ondo GM token (TSLAon et al.) flow in one user signature. Reference implementation: [`scripts/path-a-reference.ts`](./scripts/path-a-reference.ts).

## What Path A is

Path A is the integration shape that:

- Goes live **today** with zero changes on the Across side
- Uses Across's existing `/swap/approval` API with the documented `actions[]` parameter for embedded crosschain actions
- Maps Bebop's RFQ quote response into Across's actions schema on the ether.fi side
- Covers seven Ondo GM tickers live on Bebop right now: **TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, CRCLon**
- Has been proven end-to-end on Ethereum mainnet (tx hashes on the landing page)

Estimated effort on ether.fi's side: 2-3 days of focused dev work for one engineer.

## Why this works

Across's MulticallHandler contract (`0x924a9f036260DdD5808007E1AA95f08eD08aA569` on Ethereum) accepts arbitrary destination-side calls encoded in the deposit's `message` field. The `/swap/approval` API constructs this message automatically when you pass an `actions[]` array in the POST body.

Bebop's settlement contract (`0xbbbbbBB520d69a9775E85b458C58c648259FAD5F`, BebopBlend) accepts pre-signed RFQ orders from market makers. The market maker holds the Ondo GM token, signs a willingness-to-fill at a quoted rate, and Bebop returns calldata you can hand to anyone (including MulticallHandler) to execute the swap on-chain.

Composing the two: ether.fi gets a Bebop quote with `taker_address = MulticallHandler` and `receiver = user wallet`, then asks Across to deliver USDC to MulticallHandler with an embedded action that calls Bebop's `swapSingle`. The whole chain runs atomically inside the relayer's `fillV3Relay` transaction.

## End-to-end flow

```
┌────────────┐                                ┌────────────────┐
│   User     │                                │  Across relayer│
│ on Cash UI │                                │  on Ethereum   │
└──────┬─────┘                                └────────┬───────┘
       │                                               │
       │ 1. Across.GET /swap/approval (quote)          │
       ├──────────────────────────────────────────────►│
       │  ◄── expectedOutputAmount ────────────────────│
       │                                               │
       │ 2. Bebop.GET /v3/quote                        │
       │    taker=MulticallHandler, receiver=user      │
       ├──────────────────────────────────────────────►│
       │  ◄── tx.data (encoded swapSingle call) ───────│
       │                                               │
       │ 3. Parse tx.data via viem decodeAbiParameters │
       │    -> (Single order, MakerSig, filledAmount)  │
       │                                               │
       │ 4. Across.POST /swap/approval with actions[]  │
       ├──────────────────────────────────────────────►│
       │  ◄── deposit calldata ────────────────────────│
       │                                               │
       │ 5. wallet.sendTransaction(depositV3 calldata) │
       ├──────────────────────────────────────────────►│
       │                                               │
       │              ~2 seconds later                 │
       │  ◄── TSLAon delivered to user wallet ─────────│
       │                                               │
```

## The Bebop -> Across actions mapping

Bebop's `swapSingle` function ABI:

```solidity
function swapSingle(
  Single calldata order,           // 11-field tuple (see below)
  MakerSignature calldata sig,     // (bytes signatureBytes, uint256 signatureType)
  uint256 filledTakerAmount        // 0 for full fill
) external payable;

struct Single {
  uint256 expiry;
  address taker_address;
  address maker_address;
  uint256 maker_nonce;
  address taker_token;
  address maker_token;
  uint256 taker_amount;
  uint256 maker_amount;
  address receiver;
  uint256 packed_commands;
  uint256 flags;
}
```

Per Across's [nested parameters guide](https://docs.across.to/introduction/embedded-actions/nested-parameters), tuples in the `actions[].args[].value` field are passed as JSON arrays in ABI order. The mapping:

```json
{
  "actions": [{
    "target": "0xbbbbbBB520d69a9775E85b458C58c648259FAD5F",
    "functionSignature": "function swapSingle((uint256,address,address,uint256,address,address,uint256,uint256,address,uint256,uint256),(bytes,uint256),uint256)",
    "args": [
      {
        "value": [
          "<expiry>",
          "<taker_address = MulticallHandler>",
          "<maker_address>",
          "<maker_nonce>",
          "<taker_token = USDC>",
          "<maker_token = TSLAon>",
          "<taker_amount = expectedOutputAmount from Across>",
          "<maker_amount = TSLAon to be received>",
          "<receiver = user wallet>",
          "<packed_commands>",
          "<flags>"
        ],
        "populateDynamically": false
      },
      {
        "value": ["<maker signature bytes>", "<signature type>"],
        "populateDynamically": false
      },
      {
        "value": "0",
        "populateDynamically": false
      }
    ],
    "value": "0",
    "isNativeTransfer": false,
    "populateCallValueDynamically": false
  }]
}
```

## Critical invariants

These must hold or the on-chain call reverts:

1. **`order.taker_address` must equal MulticallHandler** (`0x924a9f036260DdD5808007E1AA95f08eD08aA569`). Bebop's settlement contract checks `msg.sender == order.taker_address`, and MulticallHandler is the contract calling `swapSingle`. Set `taker_address` in your Bebop quote request accordingly.

2. **`order.taker_amount` must equal Across's `expectedOutputAmount`.** The maker's signature is over the full order including taker_amount. If the USDC arriving at MulticallHandler doesn't match what Bebop signed, the call reverts.

3. **`order.receiver` should be the user's wallet (or Cash safe contract).** This is where the TSLAon lands. Set in the Bebop quote request.

4. **All 11 fields of the Single tuple must be in ABI order.** Getting the order wrong silently produces invalid calldata.

5. **`populateDynamically: false` everywhere.** The maker signature locks the exact amounts; you can't substitute dynamic balances.

## Atomic-fail guarantee

If any of the above invariants are violated at execution time, MulticallHandler's `handleV3AcrossMessage` reverts the entire fill. The relayer's `fillV3Relay` transaction reverts. The user's USDC stays on Optimism and is refunded after `fillDeadline` (default 6 hours). No partial state. No stuck funds at MulticallHandler.

This is materially safer than a sequential "bridge first, then swap" architecture, where a failed swap can leave bridged funds stranded.

## Tradeoff vs Path B

Path B (Across formally integrating Bebop as a Swap API source) would eliminate steps 2 and 3 above. ether.fi would just call `/swap/approval` with `outputToken = TSLAon` and Across handles the Bebop routing internally. Better DX, but requires Across-side product and legal review.

Path A is the right answer for **shipping in days** without waiting on Across-side decisions. Path B is the right answer **later**, once volume justifies Across investing in the integration.

## Running the reference

```bash
cd etherfi-across-poc
npm install  # ensure viem is installed
USER_WALLET=0xYourWallet \
INPUT_USDC=1312601 \
ACROSS_API_KEY=acx_... \
ACROSS_INTEGRATOR_ID=0x0162 \
BEBOP_API_KEY=... \
  npx tsx scripts/path-a-reference.ts
```

The script does not broadcast. It prints the deposit calldata so you can inspect it before connecting a wallet client to send.

## Production hardening checklist

For ether.fi's actual integration, beyond what the reference shows:

- [ ] Cache Across and Bebop quotes per-user with short TTL (15-30s); quotes expire
- [ ] Handle Bebop quote expiry mid-flight (Bebop quotes typically last ~60s; refresh if user delays signing)
- [ ] Wrap the deposit in your wallet abstraction (Permit2 if you support it; otherwise standard ERC20 approve)
- [ ] Surface fees clearly (Across LP + relayer + gas; Bebop has zero slippage on the quoted amount)
- [ ] Show user the recipient address; offer choice between user wallet and Cash safe
- [ ] Geo-restrict per Ondo GM jurisdiction policy (APAC, Africa, LatAm currently; not US)
- [ ] Track deposits via Across `/deposit/status` for confirmation UX
- [ ] Handle the refund path if `fillDeadline` is reached without a fill (rare but possible)

## Questions

For anything in this doc, ping Victor or Hart on the Across side. For Bebop-specific behavior (quote semantics, MM coverage, status), Bebop's team is responsive.
