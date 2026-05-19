'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from 'wagmi';
import type { AcrossChain, AcrossToken } from '@/lib/tokens';
import { DEMO_DEST_SYMBOLS, LOCAL_LOGO_OVERRIDES, ORIGIN_USDC, RELIABLE_LOGOS } from '@/lib/tokens';
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

type Phase =
  | 'idle'
  | 'quoting'
  | 'quoted'
  | 'approving'
  | 'signing'
  | 'filling'
  | 'filled'
  | 'error';

type Mode = 'buy' | 'sell';

const SAFE_BALANCE_USDC = 5000;

// Mock Ethereum vault holdings shown in sell mode
const ETH_VAULT_BALANCES: Record<string, number> = {
  sDAI: 850,
  sUSDe: 600,
  USDS: 400,
  USDY: 350,
  wstETH: 0.45,
  weETH: 0.30,
  USDC: 1200,
  ONDO: 0,
};

export default function CashDemo() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  // Dynamic data
  const [destTokens, setDestTokens] = useState<AcrossToken[]>([]);
  const [chains, setChains] = useState<AcrossChain[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [mode, setMode] = useState<Mode>('buy');
  const [amount, setAmount] = useState('100');
  const [selectedSymbol, setSelectedSymbol] = useState('USDY');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [originTxHash, setOriginTxHash] = useState<string | null>(null);
  const [fillTxHash, setFillTxHash] = useState<string | null>(null);

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

  // Build destination asset options: combine curated metadata with live API token data
  const destOptions = useMemo(() => {
    return DEMO_DEST_SYMBOLS.map((curated) => {
      const match = destTokens.find(
        (t) => t.symbol.toUpperCase() === curated.symbol.toUpperCase(),
      );
      return {
        ...curated,
        token: match,
      };
    }).filter((o) => !!o.token);
  }, [destTokens]);

  const selectedAsset = useMemo(
    () => destOptions.find((o) => o.symbol === selectedSymbol) || destOptions[0],
    [destOptions, selectedSymbol],
  );

  const opChainLogo = useMemo(
    () => chains.find((c) => c.chainId === 10)?.logoUrl,
    [chains],
  );
  const ethChainLogo = useMemo(
    () => chains.find((c) => c.chainId === 1)?.logoUrl,
    [chains],
  );

  // Reset transient state when toggling mode
  useEffect(() => {
    setQuote(null);
    setPhase('idle');
    setError(null);
    setOriginTxHash(null);
    setFillTxHash(null);
  }, [mode]);

  // Fetch quote on input change. Direction depends on mode.
  useEffect(() => {
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
        // Build params per direction.
        // Buy: input USDC OP (6 decimals), output asset on ETH
        // Sell: input asset on ETH, output USDC OP
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
  }, [address, amount, selectedAsset, mode]);

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

  async function execute() {
    if (!quote || !address || !selectedAsset?.token) return;
    setError(null);
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
  const remainingBalance = Math.max(0, SAFE_BALANCE_USDC - usdAmount);

  return (
    <div className="min-h-screen bg-bg-900">
      <div className="max-w-[1400px] mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-4">
        <Sidebar />

        <main className="min-w-0 space-y-5">
          <DemoBanner />

          {/* Total Balance hero */}
          <section className="text-center py-6">
            <div className="font-serif text-2xl md:text-3xl gold-text mb-3 flex items-center justify-center gap-2">
              Total Balance
              <span className="text-cream-400">
                <EyeIcon />
              </span>
            </div>
            <div className="text-7xl md:text-8xl font-bold tabular text-cream-50 tracking-tighter">
              ${remainingBalance.toFixed(2)}
              <span className="text-cream-400 text-2xl md:text-3xl ml-2 font-normal align-middle">
                USD
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
              <button className="btn-gold flex items-center gap-2">
                <PlusIcon /> Add Funds
              </button>
              <button className="btn-outline-gold flex items-center gap-2">
                <ArrowUpRightIcon /> Send
              </button>
              <button className="btn-outline-gold flex items-center gap-2">
                <SwapIcon /> Convert
              </button>
            </div>
          </section>

          {/* Across · Buy or Sell on Ethereum (powered by Across Swap API) */}
          <section className="card p-7">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-5 gap-3">
              <div>
                <div className="font-serif text-2xl gold-text">
                  {mode === 'buy' ? 'Buy on Ethereum' : 'Sell on Ethereum'}
                </div>
                <p className="text-sm text-cream-400 mt-1">
                  {mode === 'buy'
                    ? 'Spend USDC from your Cash safe on any Ethereum asset. One signature, ~2s settlement.'
                    : 'Sell an Ethereum vault position back into USDC on your Cash safe. Same flow, reversed.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Image src="/across-logo.png" alt="Across" width={22} height={22} />
                <span className="text-xs text-cream-400 tracking-wider">POWERED BY ACROSS</span>
              </div>
            </div>

            {/* Buy / Sell toggle */}
            <div className="inline-flex bg-bg-700 rounded-full p-1 mb-6 border border-white/[0.06]">
              <button
                onClick={() => setMode('buy')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === 'buy' ? 'bg-gold-500 text-[#1A140A]' : 'text-cream-300 hover:text-cream-100'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setMode('sell')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === 'sell' ? 'bg-gold-500 text-[#1A140A]' : 'text-cream-300 hover:text-cream-100'
                }`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-2">
              {/* FROM card */}
              <div className="card-inner p-5">
                <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-3">
                  {mode === 'buy' ? 'From · Cash safe on Optimism' : 'From · Ethereum vault'}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-3xl md:text-4xl font-semibold outline-none tabular min-w-0"
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
                          {SAFE_BALANCE_USDC.toLocaleString()} USDC
                        </span>
                      </span>
                      <button
                        onClick={() => setAmount(String(SAFE_BALANCE_USDC))}
                        className="px-2 py-0.5 rounded-full border border-white/10 text-cream-300 hover:bg-bg-500"
                      >
                        Max
                      </button>
                    </>
                  ) : (
                    <>
                      <span>
                        Vault balance:{' '}
                        <span className="text-cream-200 tabular">
                          {(ETH_VAULT_BALANCES[selectedSymbol] ?? 0).toLocaleString()} {selectedSymbol}
                        </span>
                      </span>
                      <button
                        onClick={() =>
                          setAmount(String(ETH_VAULT_BALANCES[selectedSymbol] ?? 0))
                        }
                        disabled={(ETH_VAULT_BALANCES[selectedSymbol] ?? 0) === 0}
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
                  {mode === 'buy' ? 'To · Ethereum vault' : 'To · Cash safe on Optimism'}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    readOnly
                    value={
                      quote
                        ? formatUnits(quote.expectedOutputAmount, quote.outputToken.decimals, 6)
                        : ''
                    }
                    placeholder="0"
                    className="flex-1 bg-transparent text-3xl md:text-4xl font-semibold outline-none tabular min-w-0 text-cream-200"
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
                  {mode === 'buy'
                    ? selectedAsset?.description
                    : 'Lands directly in the Cash safe on Optimism. Spendable on card immediately.'}
                </div>
              </div>
            </div>

            {/* Quote summary */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <QuoteRow label="Across fee">
                {feePct === null ? (
                  <span className="text-cream-400">—</span>
                ) : isSponsored ? (
                  <span className="px-2 py-0.5 rounded-full bg-gold-500 text-[#1A140A] font-semibold text-[10px] tracking-wider">
                    SPONSORED · FREE
                  </span>
                ) : Math.abs(feePct) < 0.001 ? (
                  <span className="text-cream-200 tabular">~0.000 bps</span>
                ) : (
                  <span className="text-cream-200 tabular">{feePct.toFixed(3)} bps</span>
                )}
              </QuoteRow>
              <QuoteRow label="Destination action">
                <span className="text-cream-200">
                  {mode === 'buy' ? 'Vault deposit (atomic)' : 'Safe credit (atomic)'}
                </span>
              </QuoteRow>
            </div>

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
              ) : phase === 'filled' ? (
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
                    !quote ||
                    phase === 'quoting' ||
                    phase === 'signing' ||
                    phase === 'filling' ||
                    phase === 'approving'
                  }
                  className="btn-gold w-full"
                >
                  {phase === 'quoting' && 'Fetching quote...'}
                  {phase === 'approving' &&
                    `Approving ${mode === 'buy' ? 'USDC' : selectedAsset?.symbol}...`}
                  {phase === 'signing' && 'Confirm in wallet...'}
                  {phase === 'filling' &&
                    (mode === 'buy' ? 'Filling on Ethereum...' : 'Filling on Optimism...')}
                  {(phase === 'idle' || phase === 'quoted' || phase === 'error') &&
                    (mode === 'buy'
                      ? needsApproval
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
                  requires actual Ethereum-side balance; in production this would fire from
                  ether.fi's Ethereum vault contract.
                </p>
              )}
              {error && phase === 'error' && (
                <div className="mt-3 text-xs text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl p-3">
                  {error}
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
          </section>

          {/* Assets list */}
          <section className="card p-7">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-serif text-2xl gold-text">Assets</h3>
              <span className="text-sm gold-text cursor-default opacity-70">
                Set Spend Priority
              </span>
            </div>
            <p className="text-xs text-cream-400 mb-5">
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
                symbol={selectedAsset?.symbol || 'USDY'}
                name={selectedAsset?.token?.name || "Ondo USD Yield"}
                chain="Ethereum"
                chainLogo={ethChainLogo}
                tokenLogo={
                  selectedAsset?.symbol
                    ? LOCAL_LOGO_OVERRIDES[selectedAsset.symbol] || selectedAsset?.token?.logoUrl
                    : undefined
                }
                balance="0.00"
                usd={0}
                pending
              />
            </div>
          </section>

          <FlowExplainer asset={selectedAsset?.symbol || ''} mode={mode} />
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
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-1">Personal</div>
          <div className="text-sm font-semibold truncate">ether.fi user</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-serif text-lg gold-text">Cashback</div>
            <div className="text-[10px] uppercase tracking-widest text-cream-400">This month</div>
          </div>
          <div className="text-3xl font-bold tabular mint-text mt-2">$1.55</div>
        </div>

        <div className="card p-5">
          <div className="font-serif text-lg gold-text mb-4">Your Cards</div>
          <div className="space-y-3">
            <CardRow last4="6139" name="VICTOR BADRA" />
            <CardRow last4="2530" name="VICTOR MANUEL BADRA MARTINEZ" />
          </div>
          <button className="btn-outline-gold w-full mt-4 text-sm">Manage Cards</button>
        </div>

        <div className="card p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-violet-400/15 flex items-center justify-center">
              <HeartIcon />
            </div>
            <div>
              <div className="font-serif text-base text-cream-50 leading-tight">
                Invite friends, get 1% cashback
              </div>
            </div>
          </div>
          <p className="text-xs text-cream-400 leading-relaxed mb-3">
            Get 1% cashback on purchases your friends make when they use their Cash credit card.
          </p>
          <button className="btn-outline-gold w-full text-sm">Invite Friends</button>
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
          This is the ether.fi Cash safe view with a new <em className="not-italic font-semibold">Buy / Sell on Ethereum</em> panel
          powered by the Across Swap API. Connect a wallet, toggle Buy or Sell, pick an asset, sign once. Quotes are live in both
          directions; outbound execution settles on Ethereum in roughly 2 seconds, return leg lands USDC back on the Cash safe.
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
  options: Array<{ symbol: string; tag: string; description: string; token?: AcrossToken }>;
  chainName: string;
  chainLogo?: string;
  loading: boolean;
}) {
  const selected = options.find((o) => o.symbol === value);
  const logoUrl = LOCAL_LOGO_OVERRIDES[value] || selected?.token?.logoUrl;
  return (
    <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-bg-700 border border-white/[0.08]">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={selected?.symbol || ''}
          className="w-7 h-7 rounded-full"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-bg-500 flex items-center justify-center text-[10px] font-bold text-cream-200">
          {selected?.symbol.slice(0, 3) || '?'}
        </div>
      )}
      <div className="relative min-w-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || options.length === 0}
          className="appearance-none bg-transparent pr-6 text-sm font-semibold cursor-pointer outline-none disabled:opacity-50"
        >
          {loading && <option>Loading...</option>}
          {options.map((o) => (
            <option key={o.symbol} value={o.symbol} className="bg-bg-700">
              {o.symbol}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none text-cream-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-cream-400 mt-0.5">
          {chainLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chainLogo} alt={chainName} className="w-3 h-3" />
          )}
          {chainName}
        </div>
      </div>
    </div>
  );
}

function AssetRow({
  symbol,
  name,
  chain,
  chainLogo,
  tokenLogo,
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
  balance: string;
  usd: number;
  highlight?: boolean;
  pending?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-4 rounded-xl ${
        highlight ? 'bg-gold-500/[0.04] border border-gold-500/20' : 'border border-white/[0.04]'
      } ${pending ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          {tokenLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={tokenLogo} alt={symbol} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#2775CA] flex items-center justify-center text-white text-xs font-bold">
              {symbol.slice(0, 2)}
            </div>
          )}
          {chainLogo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={chainLogo}
              alt={chain}
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-bg-800"
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
            ? `${asset} deposited into your Ethereum vault.`
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
    { i: '2', t: 'Relayer fills', d: 'Across relayer fronts USDC on Ethereum, settles in ~2 seconds.' },
    {
      i: '3',
      t: 'Embedded action',
      d: `MulticallHandler routes USDC into ${asset || 'the target asset'} via 0x/Uniswap/LI.FI, atomically.`,
    },
    {
      i: '✓',
      t: 'Vault deposit',
      d: `${asset || 'The asset'} lands in the ether.fi Ethereum vault. Same transaction.`,
    },
  ];
  const sellSteps = [
    {
      i: '1',
      t: 'Vault sells',
      d: `User triggers liquidation; ether.fi Ethereum vault unwinds the ${asset || 'asset'} position.`,
    },
    { i: '2', t: 'Across routes', d: 'Vault calls the Swap API with reversed params; relayer fronts USDC on OP.' },
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
