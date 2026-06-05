# Pattern B Implementation Guide

A turnkey blueprint for integrators (e.g., ether.fi) to build single-signature 1inch Fusion fills via a smart-contract Safe acting as the order maker through ERC-1271.

## Overview

Pattern B enables single-signature Fusion-fill UX. The user signs ONE EIP-712 intent via their wallet. That signature authorizes both:

1. An Across deposit on the origin chain (bridging USDC)
2. A 1inch Fusion order on the destination chain (swapping bridged USDC for the target asset)

Both operations execute through smart-contract Safes that validate the intent against their respective actions. Net: one wallet prompt, full cross-chain swap.

## Architecture

```
[User wallet (Turnkey or EOA)]
       |
       | signs ONE EIP-712 Intent
       v
[Backend / keeper service]
       |
       +--> Origin Safe.executeWithIntent(intent, sig, acrossCalldata)
       |     Safe verifies sig + intent + action, fires Across deposit
       |
       +--> Destination Safe.registerOrder(intent, orderHash, binding)
       |
       +--> 1inch Fusion API.submit(order)
                 (maker = Destination Safe)

[Across SpokePool] delivers USDC to Destination Safe on destination chain

[1inch resolver]
       | calls fillContractOrder on LOP (0x111111125421cA6dc452d289314280a0f8842A65)
       | LOP staticcalls Destination Safe.isValidSignature(orderHash, sig)
       | Safe checks orderHash is bound to an active intent
       | LOP transfers USDC from Safe via pre-approved allowance
       | Resolver delivers target asset to recipient
```

## The Intent struct

EIP-712 typed data signed by the user. Identical struct verified on both chains:

```solidity
struct Intent {
    address user;             // Authorizing EOA (Turnkey signer)
    uint256 originChainId;
    uint256 destChainId;
    address inputToken;       // Origin-chain token (e.g., OP USDC)
    address destInputToken;   // Destination-chain version of input (e.g., Eth USDC)
    address outputToken;      // Destination-chain target asset (e.g., TSLAon)
    uint256 inputAmount;
    uint256 minOutputAmount;  // Enforces min-out
    address recipient;        // Where the output is delivered
    uint256 expiry;           // Unix timestamp; both chains check
    uint256 nonce;            // Per-user replay protection
}
```

EIP-712 domain MUST be chain-agnostic (omit chainId from the domain separator, or set to 0) so the same signature validates on both chains:

```
Domain: { name: "etherfi-cash-pattern-b", version: "1" }
```

Chain context is carried inside the message body via originChainId and destChainId.

## Destination Safe: ERC-1271 logic

Two responsibilities: hold USDC after Across delivery, and authorize Fusion fills via isValidSignature.

```solidity
contract DestSafe {
    address public immutable owner;          // User's signing key
    address public immutable keeper;         // Backend keeper address
    address public immutable destInputToken; // Destination-chain USDC

    mapping(bytes32 => bool) public activeIntents;
    mapping(bytes32 => OrderBinding) public orderBindings;

    struct OrderBinding {
        bytes32 intentHash;
        address makerAsset;
        address takerAsset;
        uint256 makingAmount;
        uint256 takingAmount;
        address receiver;
    }

    function submitIntent(Intent calldata intent, bytes calldata signature) external {
        require(msg.sender == keeper, "only keeper");
        bytes32 intentHash = hashIntent(intent);
        require(
            SignatureChecker.isValidSignatureNow(owner, intentHash, signature),
            "bad sig"
        );
        require(intent.user == owner, "wrong user");
        require(intent.expiry > block.timestamp, "expired");
        require(intent.destChainId == block.chainid, "wrong chain");
        require(intent.destInputToken == destInputToken, "wrong dest token");
        activeIntents[intentHash] = true;
    }

    function registerOrder(
        Intent calldata intent,
        bytes32 orderHash,
        OrderBinding calldata binding
    ) external {
        require(msg.sender == keeper, "only keeper");
        bytes32 intentHash = hashIntent(intent);
        require(activeIntents[intentHash], "intent not active");
        // Bind orderHash to the intent and validate binding aligns with intent fields
        require(binding.makerAsset == destInputToken, "wrong maker asset");
        require(binding.takerAsset == intent.outputToken, "wrong taker asset");
        require(binding.takingAmount >= intent.minOutputAmount, "min-out violated");
        require(binding.receiver == intent.recipient, "wrong receiver");
        orderBindings[orderHash] = OrderBinding({
            intentHash: intentHash,
            makerAsset: binding.makerAsset,
            takerAsset: binding.takerAsset,
            makingAmount: binding.makingAmount,
            takingAmount: binding.takingAmount,
            receiver: binding.receiver
        });
    }

    function isValidSignature(bytes32 orderHash, bytes calldata)
        external view returns (bytes4)
    {
        OrderBinding memory b = orderBindings[orderHash];
        require(b.intentHash != bytes32(0), "no binding");
        require(activeIntents[b.intentHash], "intent revoked");
        return 0x1626ba7e;
    }

    function approveRouter(address token, address router, uint256 amount) external {
        require(msg.sender == owner, "only owner");
        IERC20(token).approve(router, amount);
    }

    function cancelIntent(bytes32 intentHash) external {
        require(msg.sender == owner, "only owner");
        activeIntents[intentHash] = false;
    }

    function withdraw(address token, uint256 amount, address to) external {
        require(msg.sender == owner, "only owner");
        IERC20(token).transfer(to, amount);
    }
}
```

**Key design choices**:

- **Order binding on-chain**: keeper calls registerOrder after constructing the Fusion order. Eliminates the need to decode 1inch's order struct inside Solidity (fragile across SDK versions).
- **Signature parameter to isValidSignature is ignored**: trust assumption is "orderHash is registered iff keeper authorized it". The original user signature is verified once at submitIntent, not again per-fill.
- **destInputToken is immutable**: prevents the Safe from being tricked into accepting a different bridge token.
- **Expiry enforcement**: intent expiry checked at submitIntent. Fusion order expiry is enforced by LOP itself (OrderExpired revert), so the Safe doesn't need to re-check it on every fill.
- **Pre-approve 1inch LOP / Aggregation Router v6** at 0x111111125421cA6dc452d289314280a0f8842A65 (Ethereum mainnet) for USDC at deployment, via approveRouter. This is the unified contract that handles both atomic Aggregation swaps and fillContractOrder Fusion fills.

## Origin Safe: intent-execution logic

Validates the same intent and executes an Across deposit:

```solidity
contract OriginSafe {
    address public immutable owner;
    address public immutable keeper;
    address public immutable acrossSpokePool;

    mapping(bytes32 => bool) public executedIntents;

    function executeWithIntent(
        Intent calldata intent,
        bytes calldata signature,
        bytes calldata acrossCalldata
    ) external {
        require(msg.sender == keeper, "only keeper");
        bytes32 intentHash = hashIntent(intent);
        require(!executedIntents[intentHash], "replay");
        require(
            SignatureChecker.isValidSignatureNow(owner, intentHash, signature),
            "bad sig"
        );
        require(intent.user == owner, "wrong user");
        require(intent.expiry > block.timestamp, "expired");
        require(intent.originChainId == block.chainid, "wrong chain");
        require(actionMatchesIntent(acrossCalldata, intent), "action mismatch");

        executedIntents[intentHash] = true;
        IERC20(intent.inputToken).approve(acrossSpokePool, intent.inputAmount);

        (bool ok, ) = acrossSpokePool.call(acrossCalldata);
        require(ok, "across deposit failed");
    }

    function actionMatchesIntent(bytes calldata acrossCalldata, Intent calldata intent)
        internal view returns (bool)
    {
        // Decode Across SpokePool depositV3 selector and parameters
        // depositV3(depositor, recipient, inputToken, outputToken,
        //           inputAmount, outputAmount, destinationChainId,
        //           exclusiveRelayer, quoteTimestamp, fillDeadline,
        //           exclusivityDeadline, message)
        //
        // Verify against intent:
        //   inputToken == intent.inputToken
        //   inputAmount == intent.inputAmount
        //   destinationChainId == intent.destChainId
        //   recipient == address of the DestSafe (immutable, configurable)
        //   outputToken == intent.destInputToken
        //   outputAmount in [intent.inputAmount - feeMax, intent.inputAmount]
        //   fillDeadline reasonably bounded
    }
}
```

actionMatchesIntent is the load-bearing safety boundary on the origin side. Tight validation here means the keeper cannot route funds elsewhere even with intent + signature in hand.

## Keeper / backend architecture

Sequence:

1. **Receive user intent**: HTTP endpoint accepts (Intent, signature).
2. **Validate**: server-side signature well-formedness, freshness, user permitted.
3. **Submit to OriginSafe**: executeWithIntent(intent, sig, acrossCalldata) on the origin chain. Keeper pays gas; OriginSafe enforces auth.
4. **Wait for Across delivery**: poll Across /api/deposit/status until status=filled (typical 5-30s).
5. **Construct Fusion order**: 1inch Fusion order with maker = DestSafe, params matching the intent. Use fusion-sdk with allowPartialFills: false and allowMultipleFills: false.
6. **Register order on DestSafe**: registerOrder(intent, orderHash, binding) on the destination chain.
7. **Submit Fusion order to 1inch**: via fusion-sdk's submit method.
8. **Monitor**: poll order status, surface state to the UI.

**Keeper needs**:

- Funded EOA on both chains for gas
- 1inch Developer Portal token
- Read access to Across /api/deposit/status
- Persistent storage for intent lookups and status caching

## What ether.fi needs to build vs reuse

**Reuse from existing infrastructure**:

- Turnkey signing (already in place for user keys)
- Existing ether.fi Safe contract framework (if it supports custom storage and validation logic, Pattern B Safes are a thin extension)
- Existing backend services for transaction submission (if the Cash UX keeper exists, it can be extended)

**Build new**:

- DestSafe ERC-1271 logic: intent storage + order binding + isValidSignature (~300 lines Solidity + tests)
- OriginSafe intent-execution: action validation against intent + Across deposit execution (~250 lines + tests)
- Pre-approval of 0x111111125421cA6dc452d289314280a0f8842A65 for USDC on DestSafe (one-time deployment step via approveRouter)
- Keeper service additions: intent ingest, dual-chain orchestration, Fusion order construction with contract maker
- Frontend: EIP-712 intent signing flow + status UI

## Open questions to align on with us

- Does ether.fi's existing Safe support arbitrary owner-authorized storage writes? If yes, we extend it; if not, this needs a new contract.
- Turnkey's signing surface: does it produce raw EIP-712 signatures, or are there constraints we need to design around?
- One keeper service for both chains, or separate? Hot-wallet management implications.
- 1inch resolver whitelist: can ether.fi's DestSafe address get whitelisted by 1inch's resolver fleet, or is a contract-maker filter not in play? Worth confirming with 1inch BD before Phase 1 spends gas.

## Integration sequence (phased)

| Phase | Scope | Estimate |
|---|---|---|
| Phase 1: Destination-side proof | DestSafe + signing UI + keeper. Submit manual Fusion order with DestSafe as maker. Verify resolver pickup. Highest risk: 1inch resolver whitelist. | 1-2 weeks |
| Phase 2: Origin-side execution | OriginSafe + keeper extension. Submit intent, fire Across deposit, USDC arrives at DestSafe. | 1 week |
| Phase 3: Single-signature end-to-end | Frontend + backend orchestration. One intent signature drives both legs to completion. | 1 week |
| Phase 4: Production hardening | Replay-protection edge cases, intent revocation, keeper key rotation, monitoring, alerting, recovery flows, audit. | 1-2 weeks (plus audit calendar time) |

**Total**: 4-6 weeks of engineering, plus audit calendar time. Scope dependent on existing infrastructure reuse.

## Failure modes and recovery

| Failure | Behavior | Recovery |
|---|---|---|
| OriginSafe rejects intent (bad sig, expired, action mismatch) | executeWithIntent reverts, no deposit fires | User retries with fresh intent |
| Across deposit fires but no relayer fills before fillDeadline | SpokePool slow-fill via dataworker bundle delivers USDC to DestSafe (~a few hours) | Fully automatic |
| Across delivery completes but Fusion order not submitted (keeper failure) | USDC sits at DestSafe | Keeper retry, or user invokes cancelIntent + withdraw |
| Fusion order submitted but no resolver fills before expiry | USDC stays at DestSafe (only allowance committed) | Keeper resubmit with fresh order, OR trigger bridge-back, OR user-driven recovery |
| Fusion fill delivers less than min | Cannot happen, takingAmount enforced on-chain at LOP |  |

## Security notes

- **Keeper key compromise**: blast radius is "drain funds for currently-active intents". Mitigate with short intent expiry (5-15 min), small per-intent caps, and keeper hot/cold separation.
- **Intent replay**: prevented by per-user nonce + executedIntents mapping on OriginSafe.
- **Cross-chain replay**: prevented by originChainId and destChainId checks inside the intent. Same signature validates on both chains but only authorizes the correct action per chain.
- **Order param substitution**: prevented by Safe-side registerOrder binding orderHash to validated params. Resolver cannot swap in a different order for the same orderHash.
- **approveRouter is owner-only**: keeper-compromise cannot grant new allowances or redirect funds.
- **Unbounded approval**: pre-approving the 1inch router for unlimited USDC on the DestSafe is convenient but increases exposure if the Safe is compromised. Cap-per-intent approval is safer if engineering can support it.
