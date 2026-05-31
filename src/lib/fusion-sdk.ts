import { FusionSDK, NetworkEnum } from '@1inch/fusion-sdk';

// =========================================================================
// Server-side Fusion SDK initialization.
//
// The SDK is used on the server for:
//   - Quote fetching (getQuote)
//   - Order construction (createOrder) — returns FusionOrder with the
//     correctly bit-packed makerTraits, salt, and extension encoding
//   - Pre-signed order submission (sdk.api.submitOrder)
//   - Status polling (getOrderStatus)
//
// We intentionally pass blockchainProvider: undefined because signing
// happens client-side via viem's signTypedData. The SDK does NOT call
// the blockchain provider for any of the methods we use server-side —
// only submitOrder/placeOrder would, and we substitute that with a
// direct relayer call carrying a pre-signed signature.
//
// authKey stays server-side (never exposed to client bundle).
// =========================================================================

let sdkInstance: FusionSDK | null = null;

export function getFusionSDK(): FusionSDK {
  if (sdkInstance) return sdkInstance;

  const authKey = process.env.ONEINCH_API_KEY;
  if (!authKey) {
    throw new Error('ONEINCH_API_KEY not configured in env');
  }

  sdkInstance = new FusionSDK({
    url: 'https://api.1inch.dev/fusion',
    network: NetworkEnum.ETHEREUM,
    authKey,
    // blockchainProvider intentionally omitted — signing is client-side
  });

  return sdkInstance;
}
