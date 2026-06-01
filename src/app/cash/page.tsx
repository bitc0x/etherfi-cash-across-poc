'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useBalance, useChainId, usePublicClient, useReadContract, useSendTransaction, useSignTypedData, useSwitchChain } from 'wagmi';
import type { AcrossChain, AcrossToken } from '@/lib/tokens';
import { DEMO_DEST_SYMBOLS, isBebopBuyable, isStock, LOCAL_LOGO_OVERRIDES, ORIGIN_USDC, RELIABLE_LOGOS, STOCK_MOCK_PRICE } from '@/lib/tokens';
import { formatUnits, friendlyError, parseUnits } from '@/lib/format';

type Quote = {
  approvalTxns?: { to: string; data: string }[];
  swapTx?: { to: string; data: string; value: string; chainId: number };
  inputAmount: string;
  expectedOutputAmount: string;
  minOutputAmount?: string;
  inputToken: { decimals: number; symbol: string };
  outputToken: { decimals: number; symbol: string };
  fees?: { total?: { pct?: string } };
  checks?: {
    allowance?: { actual?: string; expected?: string };
    balance?: { actual?: string; expected?: string };
  };
};

// Response shape from /api/build-deposit (Across + destination-leg + MulticallHandler path).
// Used for Ondo GM stocks routed through either Bebop RFQ or 1inch Aggregation;
// the existing Quote type is used for the vanilla Across Swap API path.
type StockQuote = {
  spokePool: string;
  transaction: { to: string; data: string; value: string; chainId: number };
  bridge: { inputAmount: string; expectedOutputAmount: string; acrossFeeBps: number };
  destination: {
    source: 'bebop' | 'oneinch-aggregation';
    sourceLabel: string;
    target: string;
    approvalSpender: string;
    outputAmount: string;
    outputAmountDecimal: number;
    outputSymbol: string;
    outputDecimals: number;
    pricePerShare: number | null;
    expiry?: number;
  };
  // Backwards-compat: only populated when source = 'bebop'
  bebop: {
    outputAmount: string;
    outputAmountDecimal: number;
    outputSymbol: string;
    outputDecimals: number;
    pricePerShare: number;
    settlementAddress: string;
    expiry: number;
  } | null;
  deposit: {
    depositor: string;
    recipient: string;
    multicallHandler: string;
    quoteTimestamp: number;
    fillDeadline: number;
  };
};

type LiquiditySource = 'bebop' | 'oneinch-aggregation' | 'oneinch-fusion';

// Response shape from /api/fusion-quote
type FusionQuote = {
  quoteId: string;
  recommendedPreset?: string;
  presets?: {
    fast?: { auctionStartAmount?: string; auctionEndAmount?: string; auctionDuration?: number };
    medium?: { auctionStartAmount?: string; auctionEndAmount?: string; auctionDuration?: number };
    slow?: { auctionStartAmount?: string; auctionEndAmount?: string; auctionDuration?: number };
  };
  prices?: { usd?: { fromToken?: string; toToken?: string } };
  fee?: { bps?: number };
  marketHoursIssue?: boolean;
  error?: string;
};

// Response shape from /api/fusion-build-order
type FusionBuiltOrder = {
  typedData: {
    primaryType: string;
    domain: { name: string; version: string; chainId: number; verifyingContract: string };
    types: Record<string, unknown>;
    message: Record<string, unknown>;
  };
  orderHash: string;
  quoteId: string;
  order: {
    salt: string; maker: string; receiver: string; makerAsset: string; takerAsset: string;
    makingAmount: string; takingAmount: string; makerTraits: string;
  };
  extension: string;
  auction?: { startTime?: string; endTime?: string; deadline?: string };
  amounts?: { makingAmount: string; takingAmount: string };
};

type Phase =
  | 'idle'
  | 'quoting'
  | 'quoted'
  | 'approving'
  | 'signing'
  | 'filling'
  | 'filled'
  // Fusion-specific phases.
  // Option A Level 1: tight sequential UX. Both signatures captured upfront
  // back-to-back, then async wait for Across delivery, then submit signed order.
  | 'fusion-approving-usdc'   // Pre-flight USDC -> Aggregation Router allowance (one-time)
  | 'fusion-preparing'        // Fetching /api/swap + building Fusion order upfront
  | 'fusion-confirm-bridge'   // Step 1 of 2: user signs Across depositV3 on Optimism
  | 'fusion-confirm-order'    // Step 2 of 2: user signs EIP-712 Fusion order on Ethereum
  | 'fusion-bridging'         // Across in flight; both sigs already captured. No user action.
  | 'fusion-bridged'          // (legacy, retained for back-compat; no longer set)
  | 'fusion-signing-order'    // (legacy, retained for back-compat; replaced by fusion-confirm-order)
  | 'fusion-submitting'       // POSTing the pre-signed order to 1inch's relayer
  | 'fusion-auction'          // Order in Dutch auction, resolvers competing
  | 'fusion-filled'           // Resolver filled, output token delivered
  | 'fusion-expired'          // Auction window closed without fill; USDC stays in user wallet
  | 'error';

type Mode = 'buy' | 'sell';

// Mock Ondo GM holdings shown in Sell mode for permissioned RWA stocks (these
// addresses don't sit on most wallets in this PoC since the demo wallet doesn't
// hold them). Live assets (USDY, sUSDe, sDAI, weETH, wstETH, USDS, USDC) read
// real balances via wagmi.
const STOCK_MOCK_BALANCES: Record<string, number> = {
  TSLAon: 0.8,
  AAPLon: 1.2,
  NVDAon: 1.5,
  GOOGLon: 1.0,
  SPYon: 0.4,
  QQQon: 0.3,
};

// Format the Across fee as a dollar amount given the input USD and the fee
// percentage. feePct is in percent units (e.g. 0.00869 for 0.869 bps).
function formatFeeUsd(inputUsd: number, feePct: number): string {
  if (!Number.isFinite(inputUsd) || inputUsd <= 0) return '$0.00';
  if (!Number.isFinite(feePct) || feePct <= 0) return '$0.00';
  const dollars = inputUsd * (feePct / 100);
  if (dollars < 0.0001) return '< $0.0001';
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  if (dollars < 1) return `$${dollars.toFixed(3)}`;
  if (dollars < 100) return `$${dollars.toFixed(2)}`;
  return `$${dollars.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function CashDemo() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  // Optimism public client for parsing the Across deposit receipt (V3FundsDeposited
  // event), so we can extract depositId and poll Across's status endpoint by ID.
  // Polling by depositId is more reliable than by tx hash: the indexer keys
  // deposits by ID, and tx-hash lookups can lag behind ID-based ones.
  const opPublicClient = usePublicClient({ chainId: 10 });

  // Dynamic data
  const [destTokens, setDestTokens] = useState<AcrossToken[]>([]);
  const [chains, setChains] = useState<AcrossChain[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [mode, setMode] = useState<Mode>('buy');
  const [amount, setAmount] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('TSLAon');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [originTxHash, setOriginTxHash] = useState<string | null>(null);
  const [fillTxHash, setFillTxHash] = useState<string | null>(null);
  const [liquiditySource, setLiquiditySource] = useState<LiquiditySource>('bebop');
  // Fusion-specific state (only populated when liquiditySource === 'oneinch-fusion')
  const [fusionQuote, setFusionQuote] = useState<FusionQuote | null>(null);
  const [fusionStatus, setFusionStatus] = useState<{
    status?: string;
    fills?: Array<{ amount?: string; txHash?: string }>;
    [k: string]: unknown;
  } | null>(null);
  const [fusionOrderHash, setFusionOrderHash] = useState<string | null>(null);
  const { signTypedDataAsync } = useSignTypedData();

  // Fetch chains + Ethereum tokens once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cR, tR] = await Promise.all([
          fetch('/api/chains'),
          fetch('/api/tokens?chainId=1'),
        ]);
        if (!mounted) return;
        if (cR.ok) setChains(await cR.json());
        if (tR.ok) setDestTokens(await tR.json());
      } finally {
        if (mounted) setDataLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build destination asset options: combine curated metadata with live API token data.
  // Ondo GM stocks are NOT in Across's whitelist (KYC-gated, permissioned), so for the
  // Bebop-buyable ones we use the on-chain Ondo GM token address (drives the destination
  // RFQ swap); for the preview-only ones (no Bebop coverage yet) we keep a placeholder.
  const destOptions = useMemo(() => {
    return DEMO_DEST_SYMBOLS.map((curated) => {
      const match = destTokens.find(
        (t) => t.symbol.toUpperCase() === curated.symbol.toUpperCase(),
      );
      if (curated.kind === 'rwa-stock') {
        return {
          ...curated,
          token: match || {
            chainId: 1,
            address: curated.tokenAddress || '0x0000000000000000000000000000000000000000',
            name: `${curated.underlying || curated.symbol} (Ondo GM)`,
            symbol: curated.symbol,
            decimals: 18,
          },
        };
      }
      return { ...curated, token: match };
    }).filter((o) => !!o.token);
  }, [destTokens]);

  const selectedAsset = useMemo(
    () => destOptions.find((o) => o.symbol === selectedSymbol) || destOptions[0],
    [destOptions, selectedSymbol],
  );

  const isStockSelected = useMemo(
    () => isStock(selectedAsset?.symbol || ''),
    [selectedAsset],
  );

  // True if the selected asset is a Bebop-buyable Ondo GM stock (TSLAon, NVDAon, etc.)
  // -> use the /api/build-deposit path (Across + Bebop RFQ + MulticallHandler).
  // False for preview-only stocks (AAPLon, SPYon, QQQon) or non-stock assets.
  const isBebopSelected = useMemo(
    () => isBebopBuyable(selectedAsset?.symbol || ''),
    [selectedAsset],
  );

  const opChainLogo = useMemo(
    () => chains.find((c) => c.chainId === 10)?.logoUrl,
    [chains],
  );
  const ethChainLogo = useMemo(
    () => chains.find((c) => c.chainId === 1)?.logoUrl,
    [chains],
  );

  // Live wallet balance reads.
  // Origin: USDC on Optimism (Cash safe equivalent in this PoC).
  const { data: usdcOpBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    token: ORIGIN_USDC.address as `0x${string}`,
    chainId: 10,
    query: { enabled: !!address, refetchInterval: 12000 },
  });
  // Destination: selected asset on Ethereum (Sell mode source).
  // Skipped for stocks (allowlist-gated, can't be held by ordinary wallets) -
  // those use mock balances.
  const { data: destAssetBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    token: selectedAsset?.token?.address as `0x${string}` | undefined,
    chainId: 1,
    query: {
      enabled: !!address && !!selectedAsset?.token && !isStockSelected,
      refetchInterval: 12000,
    },
  });

  const usdcOpBalanceNum = usdcOpBalance ? Number(usdcOpBalance.formatted) : 0;
  const destAssetBalanceNum = useMemo(() => {
    if (isStockSelected && selectedAsset?.symbol) {
      return STOCK_MOCK_BALANCES[selectedAsset.symbol] ?? 0;
    }
    return destAssetBalance ? Number(destAssetBalance.formatted) : 0;
  }, [destAssetBalance, isStockSelected, selectedAsset]);

  // Reset transient state when toggling mode
  useEffect(() => {
    setQuote(null);
    setStockQuote(null);
    setPhase('idle');
    setError(null);
    setOriginTxHash(null);
    setFillTxHash(null);
  }, [mode]);

  // Fetch quote on input change. Four branches now:
  //   1a. Bebop / 1inch Aggregation source -> POST /api/build-deposit
  //       (Across + atomic destination action via MulticallHandler).
  //   1b. 1inch Fusion source -> GET /api/fusion-quote
  //       (Across delivers USDC to user wallet, then user signs and submits a
  //       Fusion order separately - async two-signature flow).
  //   2.  Preview-only stock (AAPLon, SPYon, QQQon) -> architecture preview,
  //       no live quote.
  //   3.  Live asset (USDY, sUSDe, etc.) -> GET /api/swap (Across Swap API).
  useEffect(() => {
    // Branch 1b: Fusion preview (different architecture from Bebop/Aggregation).
    if (isStockSelected && isBebopSelected && mode === 'buy' && liquiditySource === 'oneinch-fusion') {
      setQuote(null);
      setStockQuote(null);
      if (!address || !amount || Number(amount) <= 0 || !selectedAsset?.token) {
        setFusionQuote(null);
        setPhase('idle');
        return;
      }
      const ctrl = new AbortController();
      const t = setTimeout(async () => {
        setPhase('quoting');
        setError(null);
        try {
          const raw = parseUnits(amount, ORIGIN_USDC.decimals);
          const url = new URL('/api/fusion-quote', window.location.origin);
          // Fusion is destination-only here (USDC on Ethereum -> stock on Ethereum).
          // The Across bridge leg happens separately on the Buy click.
          url.searchParams.set('fromTokenAddress', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
          url.searchParams.set('toTokenAddress', selectedAsset.token!.address);
          // Approximate the post-Across-fee USDC amount that will arrive on Ethereum.
          // Across charges ~25-30bps on USDC OP -> USDC ETH; we use 99.7% as a safe
          // estimate for the quote preview. The actual Fusion order built on Buy
          // click uses the precise post-bridge USDC amount.
          const estUsdcEth = (raw * 997n) / 1000n;
          url.searchParams.set('amount', estUsdcEth.toString());
          url.searchParams.set('walletAddress', address);
          const r = await fetch(url.toString(), { signal: ctrl.signal });
          const j = await r.json();
          if (!r.ok || j.error) {
            // Off-hours / no-coverage case: surface marketHoursIssue cleanly
            setFusionQuote({ ...j, marketHoursIssue: j.marketHoursIssue });
            setPhase('error');
            setError(
              j.marketHoursIssue
                ? 'Fusion resolvers are offline while US markets are closed (Mon-Fri 9:30-16:00 EST). Use Bebop RFQ or 1inch Aggregation for atomic routing in the meantime, or wait for market hours.'
                : friendlyError(String(j.error || `fusion quote failed (${r.status})`)),
            );
            return;
          }
          setFusionQuote(j);
          setPhase('quoted');
        } catch (e: unknown) {
          const err = e as { name?: string; message?: string };
          if (err?.name === 'AbortError') return;
          setError(friendlyError(String(err?.message || e)));
          setPhase('error');
          setFusionQuote(null);
        }
      }, 400);
      return () => {
        clearTimeout(t);
        ctrl.abort();
      };
    }

    // Branch 1a: Bebop or 1inch Aggregation (atomic via MulticallHandler).
    if (isStockSelected && isBebopSelected && mode === 'buy') {
      setQuote(null);
      setFusionQuote(null);
      if (!address || !amount || Number(amount) <= 0 || !selectedAsset?.token) {
        setStockQuote(null);
        setPhase('idle');
        return;
      }
      const ctrl = new AbortController();
      const t = setTimeout(async () => {
        setPhase('quoting');
        setError(null);
        try {
          const raw = parseUnits(amount, ORIGIN_USDC.decimals);
          const r = await fetch('/api/build-deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              depositor: address,
              recipient: address,
              inputAmount: raw.toString(),
              outputToken: selectedAsset.token!.address,
              source: liquiditySource,
            }),
            signal: ctrl.signal,
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error(j.error || `build-deposit failed (${r.status})`);
          }
          setStockQuote(await r.json());
          setPhase('quoted');
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
          setError(friendlyError(String(e?.message || e)));
          setPhase('error');
          setStockQuote(null);
        }
      }, 400);
      return () => {
        clearTimeout(t);
        ctrl.abort();
      };
    }

    // Branch 2: Preview-only stocks (no live quote).
    if (isStockSelected) {
      setQuote(null);
      setStockQuote(null);
      setPhase('idle');
      return;
    }

    // Branch 3: Live non-stock asset via Across Swap API.
    setStockQuote(null);
    if (!address || !amount || Number(amount) <= 0 || !selectedAsset?.token) {
      setQuote(null);
      setPhase('idle');
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setPhase('quoting');
      setError(null);
      try {
        const isBuy = mode === 'buy';
        const inputToken = isBuy ? ORIGIN_USDC.address : selectedAsset.token!.address;
        const outputToken = isBuy ? selectedAsset.token!.address : ORIGIN_USDC.address;
        const originChainId = isBuy ? ORIGIN_USDC.chainId : selectedAsset.token!.chainId;
        const destinationChainId = isBuy ? selectedAsset.token!.chainId : ORIGIN_USDC.chainId;
        const inputDecimals = isBuy ? ORIGIN_USDC.decimals : selectedAsset.token!.decimals;
        const raw = parseUnits(amount, inputDecimals);
        const params = new URLSearchParams({
          inputToken,
          outputToken,
          originChainId: String(originChainId),
          destinationChainId: String(destinationChainId),
          amount: raw.toString(),
          depositor: address,
          recipient: address,
        });
        const r = await fetch(`/api/swap?${params}`, { signal: ctrl.signal });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `quote failed (${r.status})`);
        }
        setQuote(await r.json());
        setPhase('quoted');
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(friendlyError(String(e?.message || e)));
        setPhase('error');
        setQuote(null);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [address, amount, selectedAsset, mode, isStockSelected, isBebopSelected, liquiditySource]);

  const feePct = useMemo(() => {
    const raw = quote?.fees?.total?.pct;
    if (!raw) return null;
    try {
      return (parseFloat(raw) / 1e18) * 100;
    } catch {
      return null;
    }
  }, [quote]);
  const isSponsored = feePct !== null && feePct === 0;

  const needsApproval = useMemo(() => {
    const a = quote?.checks?.allowance;
    if (!a?.actual || !a?.expected) return false;
    try {
      return BigInt(a.actual) < BigInt(a.expected);
    } catch {
      return false;
    }
  }, [quote]);

  // For the Bebop path the spender is SpokePool on Optimism, not Across's swap router.
  // Read USDC OP allowance to that SpokePool so we only ask the user to approve when
  // their current allowance is insufficient.
  const { data: spokeAllowance } = useReadContract({
    address: ORIGIN_USDC.address as `0x${string}`,
    abi: [
      {
        type: 'function',
        name: 'allowance',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
      },
    ] as const,
    functionName: 'allowance',
    args: address && stockQuote?.spokePool
      ? [address as `0x${string}`, stockQuote.spokePool as `0x${string}`]
      : undefined,
    chainId: 10,
    query: {
      enabled: !!address && !!stockQuote?.spokePool,
      refetchInterval: 6000,
    },
  });

  const needsStockApproval = useMemo(() => {
    if (!stockQuote) return false;
    if (spokeAllowance === undefined) return true; // not yet read -> assume needed
    try {
      return (spokeAllowance as bigint) < BigInt(stockQuote.bridge.inputAmount);
    } catch {
      return true;
    }
  }, [stockQuote, spokeAllowance]);

  // Fusion path needs TWO separate allowances:
  //  (a) USDC OP -> SpokePool on Optimism (so Across can pull USDC for the bridge leg).
  //      The SpokePool address is the same regardless of liquidity source; we use
  //      the well-known constant rather than relying on stockQuote which is null
  //      on the Fusion path.
  //  (b) USDC ETH -> 1inch Aggregation Router v6 on Ethereum (so the Fusion
  //      resolver can pull USDC for the swap fill).
  // USDC on Ethereum mainnet (Circle's FiatTokenV2.2) does support EIP-2612 permit
  // (DOMAIN_SEPARATOR + nonces verified on-chain), so a production integration
  // could include a permit signature in the Fusion order's extension instead of a
  // separate approve. In the PoC we use a standard approve() tx for clarity —
  // one-time per user, persists forever.
  const SPOKE_POOL_OP = '0x6f26Bf09B1C792e3228e5467807a900A503c0281' as const;
  const ONEINCH_ROUTER_V6_ETH = '0x111111125421cA6dc452d289314280a0f8842A65' as const;
  const USDC_ETH_ADDR = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;

  const isFusionSelected =
    isStockSelected && isBebopSelected && mode === 'buy' && liquiditySource === 'oneinch-fusion';

  const ERC20_ALLOWANCE_ABI = [
    {
      type: 'function',
      name: 'allowance',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
    },
  ] as const;

  const { data: fusionOpSpokeAllowance } = useReadContract({
    address: ORIGIN_USDC.address as `0x${string}`,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, SPOKE_POOL_OP] : undefined,
    chainId: 10,
    query: { enabled: !!address && isFusionSelected, refetchInterval: 8000 },
  });

  const { data: fusionEthRouterAllowance } = useReadContract({
    address: USDC_ETH_ADDR,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, ONEINCH_ROUTER_V6_ETH] : undefined,
    chainId: 1,
    query: { enabled: !!address && isFusionSelected, refetchInterval: 8000 },
  });

  async function execute() {
    if (!address || !selectedAsset?.token) return;
    setError(null);

    // ==============================================================
    // BRANCH F: 1inch Fusion async path — Option A Level 1 (tight sequential UX).
    //
    // Both user signatures captured BACK-TO-BACK upfront. No waiting between
    // them. After both are captured, Across delivery + Fusion submission run
    // headless (no user interaction).
    //
    // Why Pattern A (sign upfront) instead of sign-after-delivery:
    //   - User experience is one continuous flow: "step 1 of 2" then "step 2
    //     of 2", not "sign, wait 4 seconds, sign again."
    //   - Half-day of work vs full smart-wallet integration (Level 2).
    //
    // The amount-drift risk that previously argued against upfront signing is
    // mitigated here by building the Fusion order against Across's
    // GUARANTEED delivery floor (swapResp.minOutputAmount), not the
    // expectedOutputAmount. Any positive drift between quote and fill stays
    // in the user's wallet as residual; the resolver always has enough USDC
    // to pull because actual_arrived >= minOutputAmount by Across's contract.
    //
    // Note (smart wallets): for users on Coinbase Smart Wallet, Safe, Argent,
    // ZeroDev, or any EIP-5792-capable wallet, the USDC OP approval + Across
    // deposit can be batched into one prompt via wallet_sendCalls, collapsing
    // this to effectively a single user interaction. Not implemented in the
    // PoC; flagged in the demo footnote as Level 2.
    //
    // Flow:
    //   1. (optional) Approve USDC ETH -> 1inch Aggregation Router (one-time per user)
    //   2. (optional) Approve USDC OP  -> Across SpokePool         (one-time per user)
    //   3. Fetch /api/swap (Across deposit calldata + minOutputAmount)
    //   4. Build Fusion order via SDK against minOutputAmount
    //   5. SIGNATURE 1 of 2: sendTransaction(swapTx) on Optimism
    //   6. SIGNATURE 2 of 2: signTypedData(Fusion order) on Ethereum   <-- back-to-back
    //   7. Poll /api/status until USDC arrives on Ethereum (no user action)
    //   8. POST signed Fusion order to /api/fusion-submit
    //   9. Poll /api/fusion-status until filled or expired
    // ==============================================================
    if (
      liquiditySource === 'oneinch-fusion' &&
      isStockSelected && isBebopSelected && mode === 'buy' &&
      fusionQuote && !fusionQuote.marketHoursIssue
    ) {
      try {
        const raw = parseUnits(amount, ORIGIN_USDC.decimals);
        const opChain = 10;
        const ethChain = 1;

        // Conservative estimate for the USDC ETH allowance check (Across charges
        // ~25-30 bps on USDC OP -> USDC ETH). Used only for the pre-flight gate;
        // the actual order amount comes from swapResp.minOutputAmount below.
        const estUsdcEth = (raw * 997n) / 1000n;

        // --------- Step 1: USDC ETH -> 1inch Router approval (one-time) ---------
        if (
          fusionEthRouterAllowance === undefined ||
          (fusionEthRouterAllowance as bigint) < estUsdcEth
        ) {
          if (chainId !== ethChain) await switchChain({ chainId: ethChain });
          setPhase('fusion-approving-usdc');
          const max = (1n << 256n) - 1n;
          const spenderPadded = ONEINCH_ROUTER_V6_ETH.slice(2).padStart(64, '0');
          const amtPadded = max.toString(16).padStart(64, '0');
          const approveCalldata = `0x095ea7b3${spenderPadded}${amtPadded}` as `0x${string}`;
          await sendTransactionAsync({
            to: USDC_ETH_ADDR,
            data: approveCalldata,
          });
        }

        // --------- Step 2: USDC OP -> SpokePool approval (one-time) ---------
        if (
          fusionOpSpokeAllowance === undefined ||
          (fusionOpSpokeAllowance as bigint) < raw
        ) {
          if (chainId !== opChain) await switchChain({ chainId: opChain });
          setPhase('approving');
          const max = (1n << 256n) - 1n;
          const spenderPadded = SPOKE_POOL_OP.slice(2).padStart(64, '0');
          const amtPadded = max.toString(16).padStart(64, '0');
          const approveCalldata = `0x095ea7b3${spenderPadded}${amtPadded}` as `0x${string}`;
          await sendTransactionAsync({
            to: ORIGIN_USDC.address as `0x${string}`,
            data: approveCalldata,
          });
        }

        // --------- Step 3: Fetch Across deposit + build Fusion order UPFRONT ---------
        // Both are constructed BEFORE any user signature is captured so the
        // two sigs can fire back-to-back without any await between them.
        setPhase('fusion-preparing');
        const swapUrl = new URL('/api/swap', window.location.origin);
        swapUrl.searchParams.set('inputToken', ORIGIN_USDC.address);
        swapUrl.searchParams.set('outputToken', USDC_ETH_ADDR);
        swapUrl.searchParams.set('originChainId', String(opChain));
        swapUrl.searchParams.set('destinationChainId', String(ethChain));
        swapUrl.searchParams.set('amount', raw.toString());
        swapUrl.searchParams.set('depositor', address);
        swapUrl.searchParams.set('recipient', address);
        const swapResp = await fetch(swapUrl.toString()).then((r) => r.json());
        if (swapResp.error || !swapResp.swapTx) {
          throw new Error(swapResp.error || 'across /swap returned no tx');
        }

        // Build the Fusion order against the GUARANTEED delivery floor, not the
        // expected output. minOutputAmount is what Across contractually
        // guarantees will arrive (or revert + refund). Building against this
        // floor means: actual_arrived >= order.makingAmount, ALWAYS.
        // Any positive drift between expected and actual stays as residual
        // USDC in the user's Ethereum wallet (small, acceptable).
        const orderMakingAmount =
          swapResp.minOutputAmount || swapResp.expectedOutputAmount;
        if (!orderMakingAmount) {
          throw new Error('across /swap missing minOutputAmount / expectedOutputAmount');
        }

        const buildResp = await fetch('/api/fusion-build-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromTokenAddress: USDC_ETH_ADDR,
            toTokenAddress: selectedAsset.token!.address,
            amount: orderMakingAmount,
            walletAddress: address,
            preset: 'fast',
            source: 'etherfi-cash-across-poc',
          }),
        }).then((r) => r.json());
        if (buildResp.error || !buildResp.typedData) {
          throw new Error(buildResp.error || 'fusion order build failed');
        }

        // --------- SIGNATURE 1 of 2: Across deposit on Optimism ---------
        if (chainId !== opChain) await switchChain({ chainId: opChain });
        setPhase('fusion-confirm-bridge');
        const depositTxHash = await sendTransactionAsync({
          to: swapResp.swapTx.to as `0x${string}`,
          data: swapResp.swapTx.data as `0x${string}`,
          value: BigInt(swapResp.swapTx.value || '0'),
        });
        setOriginTxHash(depositTxHash);

        // --------- SIGNATURE 2 of 2: Fusion EIP-712 order on Ethereum ---------
        // Fires immediately after sig 1 resolves. No polling / no wait between.
        // The chain switch to Ethereum is silent on most wallets when the chain
        // is already known (it's just a context change for the typed-data
        // signature; no on-chain action).
        if (chainId !== ethChain) await switchChain({ chainId: ethChain });
        setPhase('fusion-confirm-order');
        // Strip EIP712Domain from types - wagmi/viem add it internally and
        // including it explicitly causes a duplicate-type error in some wallets.
        const signTypes = { ...(buildResp.typedData.types as Record<string, unknown>) };
        delete (signTypes as Record<string, unknown>).EIP712Domain;
        const signature = await signTypedDataAsync({
          domain: {
            name: buildResp.typedData.domain.name,
            version: buildResp.typedData.domain.version,
            chainId: buildResp.typedData.domain.chainId,
            verifyingContract: buildResp.typedData.domain.verifyingContract as `0x${string}`,
          },
          types: signTypes as Record<string, Array<{ name: string; type: string }>>,
          primaryType: buildResp.typedData.primaryType as 'Order',
          message: buildResp.typedData.message as Record<string, unknown>,
        });

        // --------- Step 4: Submit signed order to 1inch IMMEDIATELY ---------
        // Submit BEFORE polling for Across delivery. This is the key
        // robustness move: by submitting upfront, the order lives in 1inch's
        // system regardless of what happens to our browser session. If the
        // page refreshes, if our polling fails, if Across's indexer lags --
        // the order is already in the relayer's hands and resolvers will
        // fill it as soon as USDC arrives at the maker's wallet.
        //
        // The Fusion 'fast' preset has startAuctionIn=60s, meaning resolvers
        // wait 60 seconds before attempting fills. Across typically delivers
        // in ~2-4s, so by the time the auction starts, USDC has already
        // landed in the user's wallet. If Across is slower, the auction
        // window (180s) gives more buffer.
        setPhase('fusion-submitting');
        const submitResp = await fetch('/api/fusion-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: buildResp.order,
            signature,
            extension: buildResp.extension,
            quoteId: buildResp.quoteId,
            orderHash: buildResp.orderHash,
          }),
        }).then((r) => r.json());
        if (submitResp.error) throw new Error(submitResp.error);
        setFusionOrderHash(buildResp.orderHash);

        // Both signatures captured AND order submitted. From here on,
        // the trade lives in 1inch's system independent of our session.
        // --------- Step 5 (headless): wait for Across to deliver + resolver to fill ---------
        setPhase('fusion-bridging');

        // Extract depositId from the receipt for reliable status display.
        // SpokePool emits FundsDeposited with depositId as topics[2].
        let depositId: string | null = null;
        let depositIdSkipReason: string | null = null;
        try {
          if (!opPublicClient) {
            depositIdSkipReason = 'no public client for chain 10';
          } else {
            const receipt = await opPublicClient.waitForTransactionReceipt({
              hash: depositTxHash,
              timeout: 30_000,
            });
            // If the deposit tx reverted on-chain, status will be 'reverted'.
            // That's recoverable from the user's perspective: we already
            // submitted the Fusion order, but no USDC will arrive, so the
            // order will expire. Surface clearly.
            if (receipt.status === 'reverted') {
              throw new Error(
                `Across deposit transaction reverted on-chain. The Fusion order is in 1inch\u2019s system but no USDC will be bridged to fill it; the order will expire unfilled. ` +
                `Verify on Optimistic Etherscan: https://optimistic.etherscan.io/tx/${depositTxHash}. ` +
                `Common cause: stale USDC allowance to the SpokePool. Try Bebop or 1inch Aggregation for a known-good atomic route.`,
              );
            }
            const spokeLower = SPOKE_POOL_OP.toLowerCase();
            let sawSpokeLog = false;
            for (const log of receipt.logs) {
              if (log.address.toLowerCase() !== spokeLower) continue;
              if (log.topics.length < 3) continue;
              sawSpokeLog = true;
              const topic2 = log.topics[2];
              if (!topic2) continue;
              const asBigInt = BigInt(topic2);
              if (asBigInt > 0n && asBigInt < (1n << 53n)) {
                depositId = asBigInt.toString();
                break;
              }
            }
            if (!depositId) {
              depositIdSkipReason = sawSpokeLog
                ? 'SpokePool log topic[2] not depositId-shaped'
                : 'no SpokePool log in receipt';
            }
          }
        } catch (e) {
          // If we already threw the "reverted" error, re-throw it.
          if (e instanceof Error && e.message.includes('reverted on-chain')) throw e;
          depositIdSkipReason = `receipt parse failed: ${e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)}`;
          console.warn('[fusion] could not extract depositId from receipt:', e);
        }

        // Poll FUSION order status directly. This is the authoritative
        // outcome signal: if the order fills, Across must have delivered.
        // If the order expires, the trade failed (whether due to Across
        // delivery failure, no resolver coverage, or auction price
        // exhaustion is secondary; the result is the same).
        setPhase('fusion-auction');
        const startAuction = Date.now();
        const FUSION_TIMEOUT_MS = 420_000; // 7 min: 60s start + 180s auction + buffer
        const pollFusion = async () => {
          try {
            const r = await fetch(
              `/api/fusion-status?orderHash=${buildResp.orderHash}`,
              { cache: 'no-store' },
            );
            const j = await r.json();
            setFusionStatus(j);
            if (j?.status === 'filled') {
              setPhase('fusion-filled');
              return;
            }
            if (j?.status === 'expired' || j?.status === 'cancelled' || j?.status === 'false-predicate') {
              setPhase('fusion-expired');
              setError(
                `Fusion order ${j.status}. Order hash: ${buildResp.orderHash}. ` +
                (depositId
                  ? `Across deposit (id ${depositId}): https://optimistic.etherscan.io/tx/${depositTxHash}`
                  : `Verify Across deposit: https://optimistic.etherscan.io/tx/${depositTxHash}` +
                    (depositIdSkipReason ? ` (depositId unavailable: ${depositIdSkipReason})` : '')),
              );
              return;
            }
          } catch {}
          if (Date.now() - startAuction < FUSION_TIMEOUT_MS) {
            setTimeout(pollFusion, 3000);
          } else {
            // 7-min ceiling: order may still fill but we stop tracking
            setError(
              `Order still pending after 7 minutes. The order is in 1inch\u2019s system and may still fill. ` +
              `Order hash: ${buildResp.orderHash}. ` +
              `Verify Across deposit: https://optimistic.etherscan.io/tx/${depositTxHash}` +
              (depositId ? ` (depositId ${depositId})` : ''),
            );
            setPhase('error');
          }
        };
        setTimeout(pollFusion, 2000);
        return;
      } catch (e: any) {
        setError(friendlyError(String(e?.shortMessage || e?.message || e)));
        setPhase('error');
        return;
      }
    }

    // ==============================================================
    // BRANCH A: Bebop path (Buy of an Ondo GM stock with Bebop coverage).
    // ==============================================================
    if (stockQuote) {
      try {
        const originChain = ORIGIN_USDC.chainId; // Optimism
        if (chainId !== originChain) {
          await switchChain({ chainId: originChain });
        }
        // USDC.approve(SpokePool, max) only if current allowance < required inputAmount.
        if (needsStockApproval) {
          const spender = stockQuote.spokePool.replace(/^0x/, '').padStart(64, '0');
          const amt = (1n << 256n) - 1n;
          const amtHex = amt.toString(16).padStart(64, '0');
          const data = `0x095ea7b3${spender}${amtHex}` as `0x${string}`;
          setPhase('approving');
          await sendTransactionAsync({
            to: ORIGIN_USDC.address as `0x${string}`,
            data,
          });
        }
        setPhase('signing');
        const txHash = await sendTransactionAsync({
          to: stockQuote.transaction.to as `0x${string}`,
          data: stockQuote.transaction.data as `0x${string}`,
          value: BigInt(stockQuote.transaction.value || '0'),
        });
        setOriginTxHash(txHash);
        setPhase('filling');

        const start = Date.now();
        const poll = async () => {
          try {
            const r = await fetch(
              `/api/status?originChainId=${originChain}&depositTxHash=${txHash}`,
              { cache: 'no-store' },
            );
            if (r.ok) {
              const j = await r.json();
              if (j?.status === 'filled' || j?.fillTx) {
                setFillTxHash(j.fillTx || j.fillTxHash || null);
                setPhase('filled');
                return;
              }
            }
          } catch {}
          if (Date.now() - start < 120_000) setTimeout(poll, 2000);
        };
        setTimeout(poll, 1500);
        return;
      } catch (e: any) {
        setError(friendlyError(String(e?.shortMessage || e?.message || e)));
        setPhase('error');
        return;
      }
    }

    // ==============================================================
    // BRANCH B: Standard Across Swap API path (live assets + Sell of any asset).
    // ==============================================================
    if (!quote) return;
    try {
      const isBuy = mode === 'buy';
      const originChain = isBuy ? ORIGIN_USDC.chainId : selectedAsset.token.chainId;
      const inputTokenAddress = isBuy ? ORIGIN_USDC.address : selectedAsset.token.address;

      if (chainId !== originChain) {
        await switchChain({ chainId: originChain });
      }
      if (needsApproval && quote.swapTx?.to) {
        const spender = quote.swapTx.to.replace(/^0x/, '').padStart(64, '0');
        const amt = (1n << 256n) - 1n;
        const amtHex = amt.toString(16).padStart(64, '0');
        const data = `0x095ea7b3${spender}${amtHex}` as `0x${string}`;
        setPhase('approving');
        await sendTransactionAsync({
          to: inputTokenAddress as `0x${string}`,
          data,
        });
      }

      if (!quote.swapTx) throw new Error('missing swap transaction in quote');
      setPhase('signing');
      const txHash = await sendTransactionAsync({
        to: quote.swapTx.to as `0x${string}`,
        data: quote.swapTx.data as `0x${string}`,
        value: BigInt(quote.swapTx.value || '0'),
      });
      setOriginTxHash(txHash);
      setPhase('filling');

      const start = Date.now();
      const poll = async () => {
        try {
          const r = await fetch(
            `/api/status?originChainId=${originChain}&depositTxHash=${txHash}`,
            { cache: 'no-store' },
          );
          if (r.ok) {
            const j = await r.json();
            if (j?.status === 'filled' || j?.fillTx) {
              setFillTxHash(j.fillTx || j.fillTxHash || null);
              setPhase('filled');
              return;
            }
          }
        } catch {}
        if (Date.now() - start < 90_000) setTimeout(poll, 2000);
      };
      setTimeout(poll, 1500);
    } catch (e: any) {
      setError(friendlyError(String(e?.shortMessage || e?.message || e)));
      setPhase('error');
    }
  }

  const usdAmount = Number(amount || 0);
  // Total Balance reflects live USDC balance on OP minus the pending Buy amount
  // (so the demo visually shows the safe being debited in real time as the user types).
  const remainingBalance = Math.max(
    0,
    usdcOpBalanceNum - (mode === 'buy' ? usdAmount : 0),
  );

  return (
    <div className="min-h-screen bg-bg-900">
      <div className="max-w-[1400px] mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-4">
        <Sidebar />

        <main className="min-w-0 space-y-5">
          <DemoBanner />

          {/* Total Balance hero */}
          <section className="text-center py-2">
            <div className="font-serif text-lg gold-text mb-2 flex items-center justify-center gap-1.5">
              Total Balance
              <span className="text-cream-400">
                <EyeIcon />
              </span>
            </div>
            <div className="text-5xl md:text-6xl font-bold tabular text-cream-50 tracking-tighter">
              ${remainingBalance.toFixed(2)}
              <span className="text-cream-400 text-base ml-2 font-normal align-middle">
                USD
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <button className="btn-gold flex items-center gap-2 text-sm py-2.5 px-5">
                <PlusIcon /> Add Funds
              </button>
              <button className="btn-outline-gold flex items-center gap-2 text-sm py-2.5 px-5">
                <ArrowUpRightIcon /> Send
              </button>
              <button className="btn-outline-gold flex items-center gap-2 text-sm py-2.5 px-5">
                <SwapIcon /> Convert
              </button>
            </div>
          </section>

          {/* Spend with Cash · authentic ether.fi product framing (native section above the Across panel) */}
          <section className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <div className="font-serif text-lg text-cream-50 mb-0.5">Spend with Cash</div>
                <p className="text-xs text-cream-400">
                  Use your Ethereum-side assets with your Cash credit card.
                </p>
              </div>
              <button className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 text-xs text-cream-200 hover:bg-bg-700 transition-colors">
                <span className="gold-text">$</span> Direct Pay
              </button>
            </div>
            <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-xs">
              <span className="text-cream-400">In Direct Pay Mode, you can spend up to</span>
              <span className="text-cream-50 font-semibold tabular text-sm">$0.00</span>
            </div>
          </section>

          {/* Across · Buy or Sell on Ethereum (powered by Across Swap API) */}
          <section className="card p-7">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-5 gap-3">
              <div>
                <div className="font-serif text-xl gold-text">
                  {mode === 'buy' ? 'Buy on Ethereum' : 'Sell on Ethereum'}
                </div>
                <p className="text-xs text-cream-400 mt-1">
                  {mode === 'buy'
                    ? 'Spend USDC from your Cash safe on any Ethereum asset. One signature, ~2s settlement.'
                    : 'Sell an Ethereum-side position back into USDC on your Cash safe. Same flow, reversed.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Image src="/across-logo.png" alt="Across" width={20} height={20} />
                <span className="text-[10px] text-cream-400 tracking-wider">POWERED BY ACROSS</span>
              </div>
            </div>

            {/* Buy / Sell toggle */}
            <div className="inline-flex bg-bg-700 rounded-full p-1 mb-5 border border-white/[0.06]">
              <button
                onClick={() => setMode('buy')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  mode === 'buy' ? 'bg-gold-500 text-[#1A140A]' : 'text-cream-300 hover:text-cream-100'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setMode('sell')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  mode === 'sell' ? 'bg-gold-500 text-[#1A140A]' : 'text-cream-300 hover:text-cream-100'
                }`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-2">
              {/* Liquidity source toggle: only relevant for Bebop-buyable Ondo GM
                  stocks in Buy mode. Three options:
                  - Bebop RFQ: atomic via MulticallHandler, zero slippage
                  - 1inch Aggregation: atomic via MulticallHandler, multi-DEX route
                  - 1inch Fusion: async limit order, Dutch auction, market-hours dependent */}
              {isStockSelected && isBebopSelected && mode === 'buy' && (
                <div className="card-inner p-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-0.5">
                      Destination liquidity
                    </div>
                    <div className="text-[11px] text-cream-400 leading-tight">
                      {liquiditySource === 'oneinch-fusion' ? (
                        <>
                          Async pattern: sign the cross-chain transfer and the Fusion order
                          back-to-back upfront, then Across delivers USDC and resolvers fill via
                          Dutch auction. Two signatures.{' '}
                          <span className="text-cream-500">
                            Smart-wallet accounts (Coinbase Smart Wallet, Safe, Argent) or
                            EIP-7702-enabled EOAs (MetaMask post-Pectra, Rabby, others) collapse
                            this to a single prompt via EIP-5792.
                          </span>
                        </>
                      ) : (
                        <>
                          Across delivers USDC to MulticallHandler; this is what executes the swap atomically on Ethereum.
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center bg-bg-700 rounded-full p-0.5 border border-white/[0.05] flex-shrink-0 flex-wrap gap-y-0.5">
                    <button
                      type="button"
                      onClick={() => setLiquiditySource('bebop')}
                      className={
                        'px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight transition-colors ' +
                        (liquiditySource === 'bebop'
                          ? 'bg-gold-500 text-[#1A140A]'
                          : 'text-cream-300 hover:text-cream-100')
                      }
                    >
                      Bebop RFQ
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiquiditySource('oneinch-aggregation')}
                      className={
                        'px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight transition-colors ' +
                        (liquiditySource === 'oneinch-aggregation'
                          ? 'bg-gold-500 text-[#1A140A]'
                          : 'text-cream-300 hover:text-cream-100')
                      }
                    >
                      1inch Aggregation
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiquiditySource('oneinch-fusion')}
                      className={
                        'px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight transition-colors ' +
                        (liquiditySource === 'oneinch-fusion'
                          ? 'bg-gold-500 text-[#1A140A]'
                          : 'text-cream-300 hover:text-cream-100')
                      }
                    >
                      1inch Fusion
                    </button>
                  </div>
                </div>
              )}

              {/* FROM card */}
              <div className="card-inner p-5">
                <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-3">
                  {mode === 'buy' ? 'From · Cash safe on Optimism' : 'From · Your Ethereum address'}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-2xl md:text-3xl font-semibold outline-none tabular min-w-0"
                  />
                  {mode === 'buy' ? (
                    <TokenChip
                      symbol="USDC"
                      chainName="Optimism"
                      chainLogo={opChainLogo}
                      tokenLogo={RELIABLE_LOGOS.USDC}
                    />
                  ) : (
                    <AssetSelect
                      value={selectedSymbol}
                      onChange={setSelectedSymbol}
                      options={destOptions}
                      chainName="Ethereum"
                      chainLogo={ethChainLogo}
                      loading={dataLoading}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-cream-400">
                  {mode === 'buy' ? (
                    <>
                      <span>
                        Balance:{' '}
                        <span className="text-cream-200 tabular">
                          {isConnected
                            ? `${usdcOpBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`
                            : 'Connect wallet'}
                        </span>
                      </span>
                      <button
                        onClick={() => setAmount(String(usdcOpBalanceNum))}
                        disabled={!isConnected || usdcOpBalanceNum === 0}
                        className="px-2 py-0.5 rounded-full border border-white/10 text-cream-300 hover:bg-bg-500 disabled:opacity-40"
                      >
                        Max
                      </button>
                    </>
                  ) : (
                    <>
                      <span>
                        {isStockSelected ? 'Holdings' : 'Wallet balance'}:{' '}
                        <span className="text-cream-200 tabular">
                          {!isConnected
                            ? 'Connect wallet'
                            : `${destAssetBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedSymbol}`}
                        </span>
                      </span>
                      <button
                        onClick={() => setAmount(String(destAssetBalanceNum))}
                        disabled={!isConnected || destAssetBalanceNum === 0}
                        className="px-2 py-0.5 rounded-full border border-white/10 text-cream-300 hover:bg-bg-500 disabled:opacity-40"
                      >
                        Max
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Arrow between cards */}
              <div className="flex justify-center -my-3 relative z-10">
                <div className="w-9 h-9 rounded-full bg-bg-800 border border-white/[0.10] flex items-center justify-center">
                  <ArrowDownIcon />
                </div>
              </div>

              {/* TO card */}
              <div className="card-inner p-5">
                <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-3">
                  {mode === 'buy' ? 'To · Your Ethereum address' : 'To · Cash safe on Optimism'}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    readOnly
                    value={(() => {
                      // Fusion path: show midpoint of the Dutch auction range as the preview.
                      // Fusion has min/max amounts (auctionStartAmount, auctionEndAmount); the
                      // actual fill amount falls between them depending on when the resolver fills.
                      if (
                        isStockSelected && isBebopSelected && mode === 'buy' &&
                        liquiditySource === 'oneinch-fusion' && fusionQuote?.presets
                      ) {
                        const preset = fusionQuote.recommendedPreset && fusionQuote.presets[fusionQuote.recommendedPreset as 'fast' | 'medium' | 'slow'];
                        const fast = fusionQuote.presets.fast;
                        const chosen = preset || fast;
                        if (chosen?.auctionStartAmount && chosen?.auctionEndAmount) {
                          // Output token decimals: Ondo GM = 18, others read separately
                          const decimals = 18;
                          const start = BigInt(chosen.auctionStartAmount);
                          const end = BigInt(chosen.auctionEndAmount);
                          const mid = (start + end) / 2n;
                          return (Number(mid) / 10 ** decimals).toFixed(6);
                        }
                      }
                      // Bebop-buyable stock (Buy mode): show live destination-leg output amount,
                      // regardless of whether the source is Bebop or 1inch Aggregation.
                      if (isStockSelected && isBebopSelected && mode === 'buy' && stockQuote?.destination) {
                        return stockQuote.destination.outputAmountDecimal.toFixed(6);
                      }
                      // Preview-only stocks: compute from mock price (no live route).
                      if (isStockSelected && selectedAsset?.symbol) {
                        const n = Number(amount);
                        if (!n || n <= 0) return '';
                        const price = STOCK_MOCK_PRICE[selectedAsset.symbol] || 0;
                        if (price <= 0) return '';
                        // Buy: USDC -> shares (6 decimals); Sell: shares -> USDC (2 decimals)
                        return mode === 'buy'
                          ? (n / price).toFixed(6)
                          : (n * price).toFixed(2);
                      }
                      // Live (non-stock) assets: use Across Swap API quote.
                      return quote
                        ? formatUnits(quote.expectedOutputAmount, quote.outputToken.decimals, 6)
                        : '';
                    })()}
                    placeholder="0"
                    className="flex-1 bg-transparent text-2xl md:text-3xl font-semibold outline-none tabular min-w-0 text-cream-200"
                  />
                  {mode === 'buy' ? (
                    <AssetSelect
                      value={selectedSymbol}
                      onChange={setSelectedSymbol}
                      options={destOptions}
                      chainName="Ethereum"
                      chainLogo={ethChainLogo}
                      loading={dataLoading}
                    />
                  ) : (
                    <TokenChip
                      symbol="USDC"
                      chainName="Optimism"
                      chainLogo={opChainLogo}
                      tokenLogo={RELIABLE_LOGOS.USDC}
                    />
                  )}
                </div>
                <div className="text-xs text-cream-400 line-clamp-2">
                  {(() => {
                    if (mode !== 'buy') {
                      return 'Lands directly in the Cash safe on Optimism. Spendable on card immediately.';
                    }
                    // For Bebop-buyable Ondo GM stocks, the routing changes per
                    // source toggle. Strip the static "Routed via Bebop RFQ..."
                    // suffix from the asset description and append a sentence
                    // that reflects whatever source is currently selected.
                    if (isStockSelected && isBebopSelected) {
                      const base = (selectedAsset?.description || '')
                        .replace(/\s*Routed via[^.]*\.\s*$/, '')
                        .trim();
                      const routing =
                        liquiditySource === 'oneinch-fusion'
                          ? 'Routed via 1inch Fusion on Ethereum, Dutch auction filled by whitelisted resolvers.'
                          : liquiditySource === 'oneinch-aggregation'
                            ? 'Routed via 1inch Aggregation on Ethereum, multi-DEX routing atomic with the Across deposit.'
                            : 'Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.';
                      return `${base} ${routing}`;
                    }
                    // Non-Bebop-buyable stocks (preview only) and live yield
                    // assets keep their static descriptions from tokens.ts.
                    return selectedAsset?.description;
                  })()}
                </div>
              </div>
            </div>

            {/* Architecture-preview-only path: preview-only stocks (AAPLon, SPYon, QQQon)
                without Bebop secondary-market coverage, and Sell mode for any stock
                (Sell flow not yet wired). Bebop-buyable stocks in Buy mode fall through
                to the executable live-quote form below. */}
            {isStockSelected && (!isBebopSelected || mode === 'sell') ? (
              <StockArchitecturePreview
                symbol={selectedAsset?.symbol || ''}
                underlying={selectedAsset?.underlying}
                accentColor={selectedAsset?.accentColor}
                mode={mode}
                amount={amount}
                setAmount={setAmount}
                opChainLogo={opChainLogo}
                ethChainLogo={ethChainLogo}
                onSwitchToUsdy={() => setSelectedSymbol('TSLAon')}
              />
            ) : (
              <>
            {/* Quote summary */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <QuoteRow label="Route">
                <span className="flex items-center gap-1.5">
                  {mode === 'buy' ? (
                    <>
                      {opChainLogo && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={opChainLogo} alt="OP" className="w-4 h-4" />
                      )}
                      <span className="text-cream-200">OP</span>
                      <span className="text-cream-500">→</span>
                      {ethChainLogo && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={ethChainLogo} alt="ETH" className="w-4 h-4" />
                      )}
                      <span className="text-cream-200">ETH</span>
                    </>
                  ) : (
                    <>
                      {ethChainLogo && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={ethChainLogo} alt="ETH" className="w-4 h-4" />
                      )}
                      <span className="text-cream-200">ETH</span>
                      <span className="text-cream-500">→</span>
                      {opChainLogo && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={opChainLogo} alt="OP" className="w-4 h-4" />
                      )}
                      <span className="text-cream-200">OP</span>
                    </>
                  )}
                </span>
              </QuoteRow>
              <QuoteRow label="Settlement">
                <span className="text-cream-200">~2 seconds</span>
              </QuoteRow>
              <QuoteRow label="Fees">
                {isSponsored ? (
                  <span className="px-2 py-0.5 rounded-full bg-gold-500 text-[#1A140A] font-semibold text-[10px] tracking-wider">
                    SPONSORED · FREE
                  </span>
                ) : stockQuote ? (
                  <span className="text-cream-200 tabular">
                    {formatFeeUsd(usdAmount, stockQuote.bridge.acrossFeeBps / 100)}
                  </span>
                ) : (
                  <span className="text-cream-200 tabular">{formatFeeUsd(usdAmount, feePct ?? 0)}</span>
                )}
              </QuoteRow>
            </div>

            {/* Bebop RFQ preview row - only when on the Bebop path, shows the live
                executable price per share and the makers behind the order. */}
            {stockQuote?.destination && (
              <div className="mt-3 rounded-xl border border-white/[0.05] bg-bg-700/40 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-0.5">
                    Destination route
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs tabular text-cream-200">
                      {stockQuote.destination.sourceLabel} on Ethereum
                    </span>
                    <span className="text-[10px] text-cream-500">
                      ({stockQuote.destination.outputAmountDecimal.toFixed(6)} {selectedAsset?.symbol}
                      {stockQuote.destination.pricePerShare != null
                        ? ` @ $${stockQuote.destination.pricePerShare.toFixed(2)}/share`
                        : ''})
                    </span>
                  </div>
                </div>
                {stockQuote.destination.source === 'bebop' ? (
                  <span className="px-2 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/30 text-gold-300 font-semibold text-[10px] tracking-wider flex-shrink-0">
                    ZERO SLIPPAGE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-cream-500/15 border border-cream-500/25 text-cream-200 font-semibold text-[10px] tracking-wider flex-shrink-0">
                    MULTI-DEX
                  </span>
                )}
              </div>
            )}

            {/* Fusion destination route preview - only when on the Fusion path,
                shows the Dutch auction range and labels the async pattern. */}
            {liquiditySource === 'oneinch-fusion' && fusionQuote?.presets && !fusionQuote.marketHoursIssue && (
              <div className="mt-3 rounded-xl border border-white/[0.05] bg-bg-700/40 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-0.5">
                    Destination route
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs tabular text-cream-200">
                      1inch Fusion on Ethereum
                    </span>
                    {(() => {
                      const preset = fusionQuote.recommendedPreset && fusionQuote.presets?.[fusionQuote.recommendedPreset as 'fast' | 'medium' | 'slow'];
                      const chosen = preset || fusionQuote.presets?.fast;
                      if (!chosen?.auctionStartAmount || !chosen?.auctionEndAmount) return null;
                      const decimals = 18;
                      const start = Number(BigInt(chosen.auctionStartAmount)) / 10 ** decimals;
                      const end = Number(BigInt(chosen.auctionEndAmount)) / 10 ** decimals;
                      return (
                        <span className="text-[10px] text-cream-500">
                          ({end.toFixed(6)} to {start.toFixed(6)} {selectedAsset?.symbol}, ~{chosen.auctionDuration}s auction)
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-400/15 border border-purple-400/30 text-purple-200 font-semibold text-[10px] tracking-wider flex-shrink-0">
                  DUTCH AUCTION
                </span>
              </div>
            )}

            {/* Fusion market-hours notice - shows when resolvers are offline.
                Honest framing: explain why and what to do instead. */}
            {liquiditySource === 'oneinch-fusion' && fusionQuote?.marketHoursIssue && (
              <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3.5 py-2.5 flex items-start gap-2.5">
                <div className="text-amber-300 text-sm leading-none mt-0.5">!</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-amber-200 mb-0.5">
                    Fusion resolvers are offline
                  </div>
                  <div className="text-[11px] text-cream-400 leading-snug">
                    1inch Fusion resolvers stop quoting Ondo GM tokens when US markets are closed
                    (Mon-Fri 9:30-16:00 EST). They can&apos;t hedge the underlying equity exposure
                    off-hours. Use <button onClick={() => setLiquiditySource('bebop')} className="underline text-cream-200 hover:text-cream-100">Bebop RFQ</button> or <button onClick={() => setLiquiditySource('oneinch-aggregation')} className="underline text-cream-200 hover:text-cream-100">1inch Aggregation</button> for atomic routing while markets are closed.
                  </div>
                </div>
              </div>
            )}

            {/* Recipient disclosure - honest about where funds land in this PoC */}
            {isConnected && address && (
              <div className="mt-3 rounded-xl border border-white/[0.05] bg-bg-700/40 px-3.5 py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-0.5">
                    {mode === 'buy' ? `${selectedAsset?.symbol || 'Token'} recipient` : 'USDC recipient'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs tabular text-cream-200">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <span className="text-[10px] text-cream-500">(your wallet)</span>
                  </div>
                </div>
                <div className="text-[10px] text-cream-500 leading-snug text-right max-w-[55%]">
                  In production this could be the Cash safe contract on {mode === 'buy' ? 'Ethereum' : 'Optimism'}, or the user&rsquo;s wallet directly. ether.fi&rsquo;s call.
                </div>
              </div>
            )}

            {/* Action */}
            <div className="mt-6">
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button onClick={openConnectModal} className="btn-gold w-full">
                      Connect wallet to continue
                    </button>
                  )}
                </ConnectButton.Custom>
              ) : phase === 'filled' || phase === 'fusion-filled' ? (
                <FilledState
                  asset={selectedAsset?.symbol || ''}
                  mode={mode}
                  originTxHash={originTxHash}
                  fillTxHash={fillTxHash}
                />
              ) : (
                <button
                  onClick={execute}
                  disabled={
                    (!quote && !stockQuote && !fusionQuote) ||
                    (liquiditySource === 'oneinch-fusion' && fusionQuote?.marketHoursIssue) ||
                    phase === 'quoting' ||
                    phase === 'signing' ||
                    phase === 'filling' ||
                    phase === 'approving' ||
                    phase === 'fusion-approving-usdc' ||
                    phase === 'fusion-preparing' ||
                    phase === 'fusion-confirm-bridge' ||
                    phase === 'fusion-confirm-order' ||
                    phase === 'fusion-bridging' ||
                    phase === 'fusion-bridged' ||
                    phase === 'fusion-signing-order' ||
                    phase === 'fusion-submitting' ||
                    phase === 'fusion-auction'
                  }
                  className="btn-gold w-full"
                >
                  {phase === 'quoting' && 'Fetching quote...'}
                  {phase === 'approving' &&
                    `Approving ${mode === 'buy' ? 'USDC' : selectedAsset?.symbol}...`}
                  {phase === 'signing' && 'Confirm in wallet...'}
                  {phase === 'filling' &&
                    (mode === 'buy' ? 'Filling on Ethereum...' : 'Filling on Optimism...')}
                  {/* Fusion-specific phase labels (Option A Level 1 sequential UX) */}
                  {phase === 'fusion-approving-usdc' && 'Approving USDC for 1inch Router...'}
                  {phase === 'fusion-preparing' && 'Preparing your order...'}
                  {phase === 'fusion-confirm-bridge' && 'Step 1 of 2: Confirm cross-chain transfer'}
                  {phase === 'fusion-confirm-order' && 'Step 2 of 2: Sign purchase order'}
                  {phase === 'fusion-bridging' && 'Bridging and filling...'}
                  {phase === 'fusion-submitting' && 'Submitting to 1inch relayer...'}
                  {phase === 'fusion-auction' && `Resolver competing on Dutch auction...`}
                  {(phase === 'idle' || phase === 'quoted' || phase === 'error') &&
                    (mode === 'buy'
                      ? liquiditySource === 'oneinch-fusion' && fusionQuote && !fusionQuote.marketHoursIssue
                        ? `Bridge + buy ${selectedAsset?.symbol || ''} via Fusion`
                        : (stockQuote ? needsStockApproval : needsApproval)
                          ? `Approve & buy ${selectedAsset?.symbol || ''}`
                          : `Buy ${selectedAsset?.symbol || ''}`
                      : needsApproval
                        ? `Approve & sell ${selectedAsset?.symbol || ''}`
                        : `Sell ${selectedAsset?.symbol || ''}`)}
                </button>
              )}
              {mode === 'sell' && phase !== 'filled' && (
                <p className="mt-3 text-[11px] text-cream-500 leading-relaxed">
                  Sell mode shows a real, live Across quote in the return direction. Execution
                  requires actual Ethereum-side balance; in production this would fire from the
                  user&rsquo;s Ethereum address or the Cash safe contract.
                </p>
              )}
              {error && phase === 'error' && (
                <div className="mt-3 text-xs text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl p-3 leading-relaxed">
                  {/* Auto-link any https URLs so recovery links (e.g. Etherscan)
                      embedded in error messages become clickable. */}
                  {error.split(/(\s+)/).map((piece, i) => {
                    const trimmed = piece.replace(/[.,;:!?)]+$/, '');
                    if (/^https?:\/\//.test(trimmed)) {
                      const trailing = piece.slice(trimmed.length);
                      return (
                        <span key={i}>
                          <a
                            href={trimmed}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-red-300 hover:text-red-200 break-all"
                          >
                            {trimmed}
                          </a>
                          {trailing}
                        </span>
                      );
                    }
                    return <span key={i}>{piece}</span>;
                  })}
                </div>
              )}
              {originTxHash && phase === 'filling' && (
                <div className="mt-3 text-xs text-cream-400">
                  Origin tx:{' '}
                  <a
                    href={`${
                      mode === 'buy'
                        ? 'https://optimistic.etherscan.io/tx/'
                        : 'https://etherscan.io/tx/'
                    }${originTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="gold-text hover:underline"
                  >
                    {originTxHash.slice(0, 10)}...
                  </a>
                </div>
              )}
            </div>
              </>
            )}
          </section>

          {/* Assets list */}
          <section className="card p-7">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-serif text-xl gold-text">Assets</h3>
              <span className="text-xs gold-text cursor-default opacity-70 hover:opacity-100">
                Set Spend Priority
              </span>
            </div>
            <p className="text-[11px] text-cream-400 mb-5">
              Direct Pay mode uses USD or EUR asset balances for card purchases.
            </p>
            <div className="space-y-3">
              <AssetRow
                symbol="USDC"
                name="USD Coin"
                chain="Optimism"
                chainLogo={opChainLogo}
                tokenLogo={RELIABLE_LOGOS.USDC}
                balance={remainingBalance.toFixed(2)}
                usd={remainingBalance}
                highlight
              />
              <AssetRow
                symbol={selectedAsset?.symbol || 'TSLAon'}
                name={
                  selectedAsset?.kind === 'rwa-stock'
                    ? `${selectedAsset.underlying} (Ondo GM)`
                    : selectedAsset?.token?.name || 'Ondo USD Yield'
                }
                chain="Ethereum"
                chainLogo={ethChainLogo}
                tokenLogo={
                  selectedAsset?.kind === 'rwa-stock'
                    ? undefined
                    : selectedAsset?.symbol
                      ? LOCAL_LOGO_OVERRIDES[selectedAsset.symbol] || selectedAsset?.token?.logoUrl
                      : undefined
                }
                ticker={selectedAsset?.kind === 'rwa-stock' ? selectedAsset.underlying : undefined}
                tickerColor={selectedAsset?.kind === 'rwa-stock' ? selectedAsset.accentColor : undefined}
                balance={destAssetBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                usd={
                  // Stable-equivalents: balance ~= USD. Stocks: balance * price.
                  // Other (weETH, wstETH): skip USD display.
                  ['USDC', 'USDY', 'sDAI', 'sUSDe', 'USDS'].includes(selectedAsset?.symbol || '')
                    ? destAssetBalanceNum
                    : selectedAsset?.kind === 'rwa-stock'
                      ? destAssetBalanceNum * (STOCK_MOCK_PRICE[selectedAsset.symbol] || 0)
                      : 0
                }
                pending={destAssetBalanceNum === 0}
              />
            </div>
          </section>

          {!isStockSelected && (
            <FlowExplainer asset={selectedAsset?.symbol || ''} mode={mode} />
          )}
        </main>

        <RightRail />
      </div>
    </div>
  );
}

// ============ SIDEBAR ============

function Sidebar() {
  const items = [
    { name: 'Vault', icon: <HomeIcon />, active: true },
    { name: 'Earn', icon: <TrendUpIcon /> },
    { name: 'Cards', icon: <CardIcon /> },
    { name: 'Transactions', icon: <ExchangeIcon /> },
    { name: 'Promotions', icon: <TagIcon /> },
    { name: 'Travel', icon: <PalmIcon /> },
    { name: 'Refer & Earn', icon: <HeartIcon /> },
  ];
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-4 space-y-4">
        <Link href="/" className="flex items-center gap-2 px-3 py-2">
          <Image src="/etherfi-logo.png" alt="ether.fi" width={28} height={28} className="rounded-full" />
          <span className="text-lg font-semibold tracking-tight">ether.fi</span>
        </Link>
        <div className="px-3 flex items-center justify-between text-xs">
          <span className="text-cream-400">Membership</span>
          <span className="px-2.5 py-0.5 rounded-full bg-violet-400/15 violet-text font-semibold tracking-wider text-[10px]">
            LUXE
          </span>
        </div>
        <div className="divider" />
        <nav className="space-y-1">
          {items.map((item) => (
            <button
              key={item.name}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-colors ${
                item.active ? 'bg-bg-600 text-cream-50' : 'text-cream-300 hover:bg-bg-700'
              }`}
            >
              <span className={item.active ? 'gold-text' : 'text-cream-400'}>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
        <div className="divider" />
        <div className="px-3 space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-cream-400">PoC</div>
          <Link href="/" className="block text-xs text-violet-400 hover:underline">
            ← Integration deck
          </Link>
          <a
            href="https://docs.across.to"
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-cream-400 hover:text-cream-200"
          >
            Across docs ↗
          </a>
        </div>
      </div>
    </aside>
  );
}

// ============ RIGHT RAIL ============

function RightRail() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-4 space-y-4">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-widest text-cream-400 mb-1">Personal</div>
          <div className="text-sm font-semibold truncate">John Doe</div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="font-serif text-lg gold-text">Cashback</div>
            <div className="text-[10px] uppercase tracking-widest text-cream-400 mt-1">
              Earned this month
            </div>
          </div>
          <div className="text-2xl font-bold tabular mint-text mt-1">$1.55</div>
        </div>

        <div className="card p-5">
          <div className="font-serif text-lg gold-text mb-4">Your Cards</div>
          <div className="space-y-3">
            <CardRow last4="6139" name="JOHN DOE" />
            <CardRow last4="2530" name="JOHN DOE" />
          </div>
          <button className="btn-outline-gold w-full mt-4 text-xs py-2">Manage Cards</button>
        </div>

        <div className="card p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-violet-400/15 flex items-center justify-center flex-shrink-0">
              <HeartIcon />
            </div>
            <div>
              <div className="font-serif text-sm text-cream-50 leading-snug">
                Invite friends, get 1% cashback
              </div>
            </div>
          </div>
          <p className="text-[11px] text-cream-400 leading-relaxed mb-3">
            Get 1% cashback on purchases your friends make when they use their Cash credit card.
          </p>
          <button className="btn-outline-gold w-full text-xs py-2">Invite Friends</button>
        </div>
      </div>
    </aside>
  );
}

function CardRow({ last4, name }: { last4: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-6 rounded bg-gradient-to-br from-violet-500 to-bg-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-cream-200 truncate">{name}</div>
        <div className="text-[10px] text-cream-400 tabular">...{last4}</div>
      </div>
      <ChevronRightIcon />
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function DemoBanner() {
  return (
    <div className="card p-4 flex items-start gap-3 border-gold-500/20 bg-gold-500/[0.03]">
      <div className="w-2 h-2 rounded-full bg-gold-400 mt-1.5 animate-pulse" />
      <div className="text-sm leading-relaxed">
        <span className="font-semibold gold-text">Live PoC.</span>{' '}
        <span className="text-cream-200">
          Opens with TSLAon (Ondo&rsquo;s tokenized Tesla). User signs once and declares min
          output, Across delivers USDC to Ethereum, and the destination action completes the
          trade. For TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, CRCLon a three-way{' '}
          <span className="text-cream-50 font-semibold">destination liquidity toggle</span>{' '}
          appears next to the trade form: Bebop RFQ (atomic, zero slippage), 1inch Aggregation
          (atomic, multi-DEX; for Ondo GM typically routes via Bebop as a PMM), or 1inch
          Fusion (Dutch auction, best rates during US
          market hours). AAPLon, SPYon, QQQon render the architecture preview only (awaiting
          Bebop coverage). USDY and the live yield assets below use the direct Across Swap
          API path. Integration reference for ether.fi:{' '}
          <a href="/reference" className="gold-text hover:underline font-semibold">
            etherfi-cash-across-poc.vercel.app/reference
          </a>
          .
        </span>
      </div>
    </div>
  );
}

function QuoteRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card-inner p-3">
      <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-1">{label}</div>
      <div className="text-xs">{children}</div>
    </div>
  );
}

function TokenChip({
  symbol,
  chainName,
  chainLogo,
  tokenLogo,
  tokenColor = '#2775CA',
}: {
  symbol: string;
  chainName: string;
  chainLogo?: string;
  tokenLogo?: string;
  tokenColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-700 border border-white/[0.08]">
      {tokenLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tokenLogo} alt={symbol} className="w-7 h-7 rounded-full" />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: tokenColor }}
        >
          $
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{symbol}</div>
        <div className="flex items-center gap-1 text-[10px] text-cream-400">
          {chainLogo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={chainLogo} alt={chainName} className="w-3 h-3" />
          )}
          {chainName}
        </div>
      </div>
    </div>
  );
}

function AssetSelect({
  value,
  onChange,
  options,
  chainName,
  chainLogo,
  loading,
}: {
  value: string;
  onChange: (s: string) => void;
  options: Array<{
    symbol: string;
    tag: string;
    description: string;
    token?: AcrossToken;
    kind?: string;
    underlying?: string;
    accentColor?: string;
  }>;
  chainName: string;
  chainLogo?: string;
  loading: boolean;
}) {
  const selected = options.find((o) => o.symbol === value);
  const isRwaStock = selected?.kind === 'rwa-stock';
  const logoUrl = isRwaStock ? null : LOCAL_LOGO_OVERRIDES[value] || selected?.token?.logoUrl;
  // Layout mirrors TokenChip exactly. The native <select> is positioned absolutely
  // over the entire chip with zero opacity, so clicks open the browser dropdown
  // while the visible chip is entirely our styled markup. Guarantees pixel parity
  // with TokenChip across browsers.
  return (
    <div className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-700 border border-white/[0.08] cursor-pointer">
      {isRwaStock ? (
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white tracking-wider flex-shrink-0"
          style={{ background: selected?.accentColor || '#444' }}
        >
          {selected?.underlying || selected?.symbol.slice(0, 3)}
        </div>
      ) : logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={selected?.symbol || ''}
          className="w-7 h-7 rounded-full flex-shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-bg-500 flex items-center justify-center text-[10px] font-bold text-cream-200 flex-shrink-0">
          {selected?.symbol.slice(0, 3) || '?'}
        </div>
      )}
      <div className="min-w-0 pr-4">
        <div className="text-sm font-semibold leading-tight flex items-center gap-1">
          {selected?.symbol || '\u00a0'}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-cream-400">
          {chainLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chainLogo} alt={chainName} className="w-3 h-3" />
          )}
          {chainName}
        </div>
      </div>
      <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none text-cream-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || options.length === 0}
        aria-label="Select destination asset"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading && <option>Loading...</option>}
        {options.map((o) => (
          <option key={o.symbol} value={o.symbol} className="bg-bg-700">
            {o.symbol}
          </option>
        ))}
      </select>
    </div>
  );
}

function AssetRow({
  symbol,
  name,
  chain,
  chainLogo,
  tokenLogo,
  ticker,
  tickerColor,
  balance,
  usd,
  highlight,
  pending,
}: {
  symbol: string;
  name: string;
  chain: string;
  chainLogo?: string;
  tokenLogo?: string;
  ticker?: string;
  tickerColor?: string;
  balance: string;
  usd: number;
  highlight?: boolean;
  pending?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3.5 py-3 rounded-xl ${
        highlight ? 'bg-gold-500/[0.04] border border-gold-500/20' : 'border border-white/[0.04]'
      } ${pending ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          {ticker ? (
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center text-white text-[10px] font-bold tracking-wider"
              style={{ background: tickerColor || '#444' }}
            >
              {ticker}
            </div>
          ) : tokenLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={tokenLogo} alt={symbol} className="w-9 h-9 rounded-full" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#2775CA] flex items-center justify-center text-white text-xs font-bold">
              {symbol.slice(0, 2)}
            </div>
          )}
          {chainLogo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={chainLogo}
              alt={chain}
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border border-bg-800"
            />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-cream-50">{symbol}</div>
          <div className="text-[11px] text-cream-400">{name}</div>
        </div>
      </div>
      <div className="text-right tabular">
        <div className="text-sm font-semibold text-cream-50">{balance}</div>
        <div className="text-[11px] text-cream-400">
          ${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

function FilledState({
  asset,
  mode,
  originTxHash,
  fillTxHash,
}: {
  asset: string;
  mode: Mode;
  originTxHash: string | null;
  fillTxHash: string | null;
}) {
  const isBuy = mode === 'buy';
  const originUrlBase = isBuy
    ? 'https://optimistic.etherscan.io/tx/'
    : 'https://etherscan.io/tx/';
  const fillUrlBase = isBuy
    ? 'https://etherscan.io/tx/'
    : 'https://optimistic.etherscan.io/tx/';
  return (
    <div className="card p-5 border-gold-500/30 bg-gold-500/[0.04]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-gold-500 flex items-center justify-center text-[#1A140A] font-bold">
          ✓
        </div>
        <div className="font-serif text-lg gold-text">
          {isBuy
            ? `${asset} delivered to your Ethereum address.`
            : `${asset} sold. USDC credited to your Cash safe.`}
        </div>
      </div>
      <div className="text-xs text-cream-400 space-y-1">
        {originTxHash && (
          <div>
            Origin tx ·{' '}
            <a
              href={`${originUrlBase}${originTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="gold-text hover:underline"
            >
              {originTxHash.slice(0, 14)}...
            </a>
          </div>
        )}
        {fillTxHash && (
          <div>
            Fill tx ·{' '}
            <a
              href={`${fillUrlBase}${fillTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="gold-text hover:underline"
            >
              {fillTxHash.slice(0, 14)}...
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowExplainer({ asset, mode }: { asset: string; mode: Mode }) {
  const buySteps = [
    { i: '1', t: 'Cash safe debits', d: 'USDC leaves the OP safe via Across SpokePool. One user signature.' },
    { i: '2', t: 'Relayer fronts', d: 'Across relayer fronts the destination asset on Ethereum, settles in ~2 seconds.' },
    {
      i: '3',
      t: 'Atomic delivery',
      d: `${asset || 'The target asset'} is delivered to the recipient on Ethereum in the same transaction. Single-step token-to-token route via the Across Swap API; no destination action contract needed.`,
    },
    {
      i: '✓',
      t: 'Delivered',
      d: `${asset || 'The asset'} lands at the recipient address (user wallet or Cash safe). Same transaction.`,
    },
  ];
  const sellSteps = [
    {
      i: '1',
      t: 'User sells',
      d: `${asset || 'Asset'} is sent into the Across Swap API on Ethereum; user signs once.`,
    },
    { i: '2', t: 'Across routes', d: 'Swap API quotes the reverse direction; relayer fronts USDC on Optimism.' },
    { i: '3', t: 'Relayer fills', d: 'Across settles on Optimism in ~2 seconds. Same canonical USDC, no wrapped assets.' },
    { i: '✓', t: 'Safe credit', d: 'USDC lands in the Cash safe on OP. Spendable on the card immediately.' },
  ];
  const steps = mode === 'buy' ? buySteps : sellSteps;
  return (
    <div className="card-strong p-7">
      <div className="eyebrow mb-3">What happens under the hood</div>
      <h3 className="font-serif text-2xl gold-text mb-6">
        {mode === 'buy'
          ? 'One signature, four atomic steps.'
          : 'Same flow, opposite direction.'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s, idx) => (
          <div key={s.i} className={`card p-5 ${idx === 3 ? 'border-gold-500/40' : ''}`}>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-lg mb-3 ${
                idx === 3 ? 'bg-gold-500 text-[#1A140A] font-semibold' : 'bg-bg-600 text-cream-200'
              }`}
            >
              {s.i}
            </div>
            <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-1.5">{s.t}</div>
            <div className="text-xs text-cream-200 leading-relaxed">{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ STOCK ARCHITECTURE PREVIEW ============
// Shown for Ondo GM stocks that don't yet have Bebop secondary-market buy-side
// coverage (AAPLon, SPYon, QQQon), and for Sell mode on any stock. The architecture
// is identical to the 7 Bebop-buyable Ondo GM tickers (TSLAon, NVDAon, GOOGLon,
// COINon, HOODon, MSTRon, CRCLon), which execute end-to-end today.

function StockArchitecturePreview({
  symbol,
  underlying,
  accentColor,
  mode,
  amount,
  setAmount,
  opChainLogo,
  ethChainLogo,
  onSwitchToUsdy,
}: {
  symbol: string;
  underlying?: string;
  accentColor?: string;
  mode: Mode;
  amount: string;
  setAmount: (v: string) => void;
  opChainLogo?: string;
  ethChainLogo?: string;
  onSwitchToUsdy: () => void;
}) {
  const sharePrice = STOCK_MOCK_PRICE[symbol] || 100;
  const isBuy = mode === 'buy';
  const usdAmount = Number(amount) || 0;
  const shares = isBuy ? usdAmount / sharePrice : usdAmount;
  const usdValue = isBuy ? usdAmount : shares * sharePrice;

  const buySteps = [
    { n: '01', title: 'Cash safe debits USDC', sub: `${usdAmount.toLocaleString()} USDC leaves the Optimism Cash safe via Across SpokePool. One user signature.` },
    { n: '02', title: 'Across settles on Ethereum', sub: 'Relayer fronts USDC to the MulticallHandler in ~2 seconds. Canonical transfer, UMA-secured.' },
    { n: '03', title: 'MulticallHandler routes', sub: 'Approves the destination liquidity source and executes the swap atomically inside the same fill. No funds are ever held by Across.' },
    { n: '04', title: `${symbol} delivered`, sub: `${shares.toFixed(4)} ${symbol} (\u2248$${usdValue.toFixed(2)}) lands at the recipient on Ethereum (user wallet or Cash safe). Atomic with the deposit.` },
    { n: '\u2713', title: `${underlying || symbol} held, abstracted in Cash`, sub: `User sees ${shares.toFixed(4)} ${underlying || symbol} in Cash. Spendable via card on conversion back to USDC.` },
  ];
  const sellSteps = [
    { n: '01', title: `User sells ${symbol}`, sub: `${shares.toFixed(4)} ${symbol} (\u2248$${usdValue.toFixed(2)}) routed back to USDC on Ethereum.` },
    { n: '02', title: 'Across deposit, return leg', sub: 'USDC deposited into Across SpokePool on Ethereum.' },
    { n: '03', title: 'Relayer fills on Optimism', sub: 'USDC lands in the Cash safe on Optimism in ~2 seconds.' },
    { n: '\u2713', title: 'Spendable on card', sub: `${usdValue.toFixed(2)} USDC now in the OP Cash safe, immediately spendable.` },
  ];
  const steps = isBuy ? buySteps : sellSteps;

  return (
    <>
      {/* Architecture preview panel - replaces quote summary + action button */}
      <div className="mt-6 rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/[0.04] to-transparent p-5">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
            style={{ background: accentColor || '#444' }}
          >
            {underlying || symbol}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-gold-400 font-semibold">
            Permissioned RWA &middot; Ondo Global Markets
          </div>
        </div>
        <h3 className="font-serif text-xl text-cream-50 leading-snug mb-1.5">
          {isBuy ? `Buy ${underlying || symbol}, abstracted in Cash` : `Sell ${underlying || symbol} back to OP USDC`}
        </h3>
        <p className="text-xs text-cream-400 leading-relaxed mb-5 max-w-2xl">
          {isBuy
            ? `${symbol} is awaiting Bebop secondary-market coverage. The architecture below is identical to the seven already-live Ondo GM tickers (TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, CRCLon), which execute end-to-end today via the Across Swap API with Bebop RFQ on the destination leg.`
            : `${symbol} is redeemed back to USDC on Ethereum and returns to the Cash safe via Across. Same architecture as the Buy direction, in reverse.`}
        </p>

        {/* Step strip */}
        <div className={`grid grid-cols-1 ${isBuy ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-2.5`}>
          {steps.map((s, i) => (
            <div key={i} className="rounded-xl bg-bg-700 border border-white/[0.06] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold tabular ${
                  s.n === '\u2713' ? 'bg-gold-500 text-[#1A140A]' : 'bg-bg-500 text-cream-300'
                }`}>
                  {s.n}
                </div>
                <div className="text-[11px] font-semibold text-cream-100 leading-tight">{s.title}</div>
              </div>
              <div className="text-[10.5px] text-cream-400 leading-snug">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CTA: switch to a Bebop-buyable Ondo GM stock for live execution */}
        {isBuy && (
          <div className="mt-5 rounded-xl bg-bg-700/60 border border-white/[0.06] p-4 flex items-start gap-3">
            <div className="text-gold-400 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-cream-100 mb-1">
                Live execution: pick a Bebop-routable Ondo GM ticker
              </div>
              <div className="text-[11px] text-cream-400 leading-relaxed mb-3">
                TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, and CRCLon execute end-to-end on mainnet right now via the Across Swap API with Bebop RFQ on the destination leg. Same architecture as above, atomic, ~2 seconds, zero slippage on the RFQ fill.
              </div>
              <button
                onClick={onSwitchToUsdy}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-gold-500 text-[#1A140A] font-semibold hover:bg-gold-400 transition"
              >
                Run live demo with TSLAon &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ============ ICONS ============

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cream-300">
      <path d="M12 5v14M5 13l7 7 7-7" />
    </svg>
  );
}
function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16l-4-4 4-4M3 12h12M17 8l4 4-4 4M21 12H9" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12l9-9 9 9M5 10v10h14V10" />
    </svg>
  );
}
function TrendUpIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 17l6-6 4 4 8-8M17 7h4v4" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
function ExchangeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 3l4 4-4 4M20 7H4M8 13l-4 4 4 4M4 17h16" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}
function PalmIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22V11M5 7c0-3 3-5 7-5s7 2 7 5M12 11c-3-2-7-1-9 2M12 11c3-2 7-1 9 2" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="violet-text">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
