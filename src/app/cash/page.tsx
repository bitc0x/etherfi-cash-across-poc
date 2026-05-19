'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from 'wagmi';
import { DESTINATION_ASSETS, ORIGIN_TOKEN } from '@/lib/tokens';
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
  checks?: { allowance?: { actual?: string; expected?: string }; balance?: { actual?: string; expected?: string } };
  steps?: { bridge?: { fees?: { pct?: string } } };
};

type Phase = 'idle' | 'quoting' | 'quoted' | 'approving' | 'signing' | 'filling' | 'filled' | 'error';

export default function CashDemo() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  const [amount, setAmount] = useState('100');
  const [selectedSymbol, setSelectedSymbol] = useState(DESTINATION_ASSETS[0].symbol);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [originTxHash, setOriginTxHash] = useState<string | null>(null);
  const [fillTxHash, setFillTxHash] = useState<string | null>(null);

  const selectedAsset = useMemo(
    () => DESTINATION_ASSETS.find((t) => t.symbol === selectedSymbol)!,
    [selectedSymbol],
  );

  // Fetch quote when inputs change
  useEffect(() => {
    if (!address || !amount || Number(amount) <= 0) {
      setQuote(null);
      setPhase('idle');
      return;
    }
    const ctrl = new AbortController();
    const fetchQuote = async () => {
      setPhase('quoting');
      setError(null);
      try {
        const raw = parseUnits(amount, ORIGIN_TOKEN.decimals);
        const params = new URLSearchParams({
          inputToken: ORIGIN_TOKEN.address,
          outputToken: selectedAsset.address,
          originChainId: String(ORIGIN_TOKEN.chainId),
          destinationChainId: String(selectedAsset.chainId),
          amount: raw.toString(),
          depositor: address,
          recipient: address,
        });
        const r = await fetch(`/api/swap?${params}`, { signal: ctrl.signal });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `quote failed (${r.status})`);
        }
        const j = await r.json();
        setQuote(j);
        setPhase('quoted');
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        setError(friendlyError(String(e?.message || e)));
        setPhase('error');
        setQuote(null);
      }
    };
    const t = setTimeout(fetchQuote, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [address, amount, selectedAsset]);

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
    if (!quote || !address) return;
    setError(null);
    try {
      if (chainId !== ORIGIN_TOKEN.chainId) {
        await switchChain({ chainId: ORIGIN_TOKEN.chainId });
      }

      if (needsApproval && quote.approvalTxns?.[0]) {
        setPhase('approving');
        const a = quote.approvalTxns[0];
        await sendTransactionAsync({
          to: a.to as `0x${string}`,
          data: a.data as `0x${string}`,
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

      // Poll status
      const start = Date.now();
      const poll = async () => {
        const params = new URLSearchParams({
          originChainId: String(ORIGIN_TOKEN.chainId),
          depositTxHash: txHash,
        });
        try {
          const r = await fetch(`/api/status?${params}`, { cache: 'no-store' });
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

  return (
    <div className="min-h-screen bg-ink-950">
      <CashNav />

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <CashSidebar />

        <div className="space-y-6 min-w-0">
          <DemoBanner />

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-6 min-w-0">
            <SafeView amount={amount} />

            <div className="card-strong p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-mint-500 mb-1">
                    Across · Buy on Ethereum
                  </div>
                  <h2 className="text-xl font-semibold">From your Cash safe</h2>
                </div>
                <ConnectButton.Custom>
                  {({ account, openConnectModal }) => (
                    <button
                      onClick={openConnectModal}
                      className={account ? 'btn-ghost text-xs' : 'btn-mint text-xs'}
                    >
                      {account ? `${account.displayName}` : 'Connect'}
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>

              <FromField amount={amount} setAmount={setAmount} />

              <div className="flex items-center justify-center my-2">
                <div className="w-9 h-9 rounded-lg bg-ink-850 border border-white/[0.06] flex items-center justify-center text-haze-400">
                  ↓
                </div>
              </div>

              <ToField
                selectedSymbol={selectedSymbol}
                setSelectedSymbol={setSelectedSymbol}
                quote={quote}
              />

              <div className="mt-5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-haze-500">Route</span>
                  <span className="text-haze-200">
                    Optimism → Ethereum · single tx
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-haze-500">Settlement</span>
                  <span className="text-haze-200">~2 seconds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-haze-500">Across fee</span>
                  {feePct === null ? (
                    <span className="text-haze-400">—</span>
                  ) : isSponsored ? (
                    <span className="px-2 py-0.5 rounded-full bg-mint-500 text-[#062119] font-semibold text-[10px] tracking-wider">
                      SPONSORED · FREE
                    </span>
                  ) : (
                    <span className="text-haze-200 tabular">{feePct.toFixed(3)} bps</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-haze-500">Destination action</span>
                  <span className="text-haze-200">Deposit into vault (atomic)</span>
                </div>
              </div>

              <div className="mt-6">
                {!isConnected ? (
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button onClick={openConnectModal} className="btn-mint w-full">
                        Connect wallet to continue
                      </button>
                    )}
                  </ConnectButton.Custom>
                ) : phase === 'filled' ? (
                  <FilledState
                    asset={selectedAsset.symbol}
                    originTxHash={originTxHash}
                    fillTxHash={fillTxHash}
                  />
                ) : (
                  <button
                    onClick={execute}
                    disabled={!quote || phase === 'quoting' || phase === 'signing' || phase === 'filling' || phase === 'approving'}
                    className="btn-mint w-full"
                  >
                    {phase === 'quoting' && 'Fetching quote...'}
                    {phase === 'approving' && 'Approving USDC...'}
                    {phase === 'signing' && 'Confirm in wallet...'}
                    {phase === 'filling' && 'Filling on Ethereum...'}
                    {(phase === 'idle' || phase === 'quoted' || phase === 'error') &&
                      (needsApproval ? `Approve & buy ${selectedAsset.symbol}` : `Buy ${selectedAsset.symbol}`)}
                  </button>
                )}
                {error && phase === 'error' && (
                  <div className="mt-3 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    {error}
                  </div>
                )}
                {originTxHash && phase === 'filling' && (
                  <div className="mt-3 text-xs text-haze-400">
                    Origin tx:{' '}
                    <a
                      href={`https://optimistic.etherscan.io/tx/${originTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-mint-500 hover:underline"
                    >
                      {originTxHash.slice(0, 10)}...
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <FlowExplainer asset={selectedAsset.symbol} />
        </div>
      </div>
    </div>
  );
}

function CashNav() {
  return (
    <nav className="border-b border-white/[0.06] bg-[rgba(10,13,17,0.72)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image src="/etherfi-logo.png" alt="ether.fi" width={28} height={28} className="rounded-full" />
            <span className="font-semibold text-[15px]">ether.fi</span>
          </div>
          <span className="text-haze-500 text-sm">×</span>
          <div className="flex items-center gap-2">
            <Image src="/across-logo.png" alt="Across" width={28} height={28} />
            <span className="font-semibold text-[15px]">Across</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn-ghost text-xs">
            ← Back to deck
          </Link>
        </div>
      </div>
    </nav>
  );
}

function CashSidebar() {
  const items = [
    { name: 'Safe', active: true },
    { name: 'Cash' },
    { name: 'Save' },
    { name: 'Grow' },
    { name: 'Spend' },
    { name: 'History' },
    { name: 'Settings' },
  ];
  return (
    <aside className="hidden lg:block">
      <div className="card p-3 sticky top-24">
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.name}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active
                  ? 'bg-mint-500/10 text-mint-500 font-semibold'
                  : 'text-haze-300 hover:bg-ink-800'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="divider my-4" />
        <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-haze-500">
          PoC
        </div>
        <Link
          href="/"
          className="block px-3 py-2 rounded-lg text-xs text-haze-400 hover:bg-ink-800 hover:text-haze-200"
        >
          Integration deck →
        </Link>
        <a
          href="https://docs.across.to"
          target="_blank"
          rel="noreferrer"
          className="block px-3 py-2 rounded-lg text-xs text-haze-400 hover:bg-ink-800 hover:text-haze-200"
        >
          Across docs ↗
        </a>
      </div>
    </aside>
  );
}

function DemoBanner() {
  return (
    <div className="card p-4 flex items-start gap-3 border-mint-500/20 bg-mint-500/[0.03]">
      <div className="w-2 h-2 rounded-full bg-mint-500 mt-1.5 animate-pulse" />
      <div className="text-sm leading-relaxed">
        <span className="font-semibold text-mint-500">Live PoC.</span>{' '}
        <span className="text-haze-200">
          This is the ether.fi Cash safe view, with a new <em className="not-italic font-semibold">Buy on Ethereum</em> panel
          powered by the Across Swap API. Connect a wallet, pick an asset, sign once. Quotes are live;
          execution settles on Ethereum in roughly 2 seconds via Across.
        </span>
      </div>
    </div>
  );
}

function SafeView({ amount }: { amount: string }) {
  const balance = Math.max(0, 5000 - Number(amount || 0));
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-haze-500 mb-1">
            Cash safe · Optimism
          </div>
          <h2 className="text-xl font-semibold">Holdings</h2>
        </div>
        <div className="text-xs text-haze-400">
          0xCa5h...e7fA
        </div>
      </div>

      <div className="space-y-2">
        <HoldingRow
          symbol="USDC"
          name="USD Coin"
          balance={balance.toFixed(2)}
          usd={balance}
          highlight
        />
        <HoldingRow symbol="USDT" name="Tether USD" balance="0.00" usd={0} />
        <HoldingRow symbol="ETH" name="Ether" balance="0.00" usd={0} />
        <div className="divider my-4" />
        <div className="text-[11px] uppercase tracking-widest text-haze-500 mb-2 px-1">
          Ethereum vault · target positions
        </div>
        <HoldingRow symbol="sDAI" name="Savings DAI" balance="0.00" usd={0} pending />
        <HoldingRow symbol="sUSDe" name="Staked USDe" balance="0.00" usd={0} pending />
      </div>

      <div className="card p-4 mt-5 bg-ink-850/40">
        <div className="text-[11px] uppercase tracking-widest text-haze-500 mb-1">Total balance</div>
        <div className="text-3xl font-bold tabular">${(balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        <div className="text-xs text-haze-500 mt-1">Across panel routes from this safe.</div>
      </div>
    </div>
  );
}

function HoldingRow({
  symbol,
  name,
  balance,
  usd,
  highlight,
  pending,
}: {
  symbol: string;
  name: string;
  balance: string;
  usd: number;
  highlight?: boolean;
  pending?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-3 rounded-lg ${
        highlight ? 'bg-mint-500/[0.04] border border-mint-500/15' : 'border border-white/[0.04]'
      } ${pending ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-ink-700 flex items-center justify-center text-[10px] font-bold text-haze-200">
          {symbol.slice(0, 4)}
        </div>
        <div>
          <div className="text-sm font-semibold">{symbol}</div>
          <div className="text-[11px] text-haze-500">{name}</div>
        </div>
      </div>
      <div className="text-right tabular">
        <div className="text-sm font-semibold">{balance}</div>
        <div className="text-[11px] text-haze-500">${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
      </div>
    </div>
  );
}

function FromField({ amount, setAmount }: { amount: string; setAmount: (s: string) => void }) {
  return (
    <div className="card p-4 bg-ink-850">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest text-haze-500">From · Cash safe</span>
        <span className="text-[11px] text-haze-500">
          Balance: <span className="text-haze-300 tabular">5,000 USDC</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="flex-1 bg-transparent text-3xl font-semibold outline-none tabular min-w-0"
        />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-800 border border-white/[0.06]">
          <div className="w-6 h-6 rounded-full bg-[#2775CA] flex items-center justify-center text-[9px] font-bold text-white">
            U
          </div>
          <div>
            <div className="text-sm font-semibold">USDC</div>
            <div className="text-[10px] text-haze-500">Optimism</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToField({
  selectedSymbol,
  setSelectedSymbol,
  quote,
}: {
  selectedSymbol: string;
  setSelectedSymbol: (s: string) => void;
  quote: Quote | null;
}) {
  const asset = DESTINATION_ASSETS.find((t) => t.symbol === selectedSymbol)!;
  const out = quote
    ? formatUnits(quote.expectedOutputAmount, quote.outputToken.decimals, 6)
    : '';

  return (
    <div className="card p-4 bg-ink-850">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest text-haze-500">
          To · Ethereum vault
        </span>
        <span className="text-[11px] text-haze-500">{asset.description}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          readOnly
          value={out}
          placeholder="0"
          className="flex-1 bg-transparent text-3xl font-semibold outline-none tabular min-w-0 text-haze-300"
        />
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-2 rounded-lg bg-ink-800 border border-white/[0.06] text-sm font-semibold cursor-pointer outline-none"
        >
          {DESTINATION_ASSETS.map((t) => (
            <option key={t.symbol} value={t.symbol}>
              {t.symbol}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilledState({
  asset,
  originTxHash,
  fillTxHash,
}: {
  asset: string;
  originTxHash: string | null;
  fillTxHash: string | null;
}) {
  return (
    <div className="card p-5 border-mint-500/30 bg-mint-500/[0.04]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-mint-500 flex items-center justify-center text-[#062119] font-bold text-sm">
          ✓
        </div>
        <div className="font-semibold text-mint-500">
          {asset} deposited into your Ethereum vault.
        </div>
      </div>
      <div className="text-xs text-haze-400 space-y-1">
        {originTxHash && (
          <div>
            Origin tx ·{' '}
            <a
              href={`https://optimistic.etherscan.io/tx/${originTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-mint-500 hover:underline"
            >
              {originTxHash.slice(0, 14)}...
            </a>
          </div>
        )}
        {fillTxHash && (
          <div>
            Fill tx ·{' '}
            <a
              href={`https://etherscan.io/tx/${fillTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-mint-500 hover:underline"
            >
              {fillTxHash.slice(0, 14)}...
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowExplainer({ asset }: { asset: string }) {
  const steps = [
    { i: '1', t: 'Cash safe debits', d: 'USDC leaves the OP safe via Across SpokePool. One user signature.' },
    { i: '2', t: 'Relayer fills', d: 'Across relayer fronts USDC on Ethereum, settles in ~2 seconds.' },
    { i: '3', t: 'Embedded action', d: `MulticallHandler swaps USDC into ${asset} via 0x/Uniswap/LI.FI, atomically.` },
    { i: '✓', t: 'Vault deposit', d: `${asset} lands in the ether.fi Ethereum vault. Same transaction.` },
  ];
  return (
    <div className="card-strong p-6">
      <div className="text-[11px] uppercase tracking-widest text-mint-500 mb-2">
        What happens under the hood
      </div>
      <h3 className="text-xl font-semibold mb-5">One signature, four atomic steps.</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s, idx) => (
          <div
            key={s.i}
            className={`card p-4 ${idx === 3 ? 'border-mint-500/40' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold mb-3 text-sm ${
                idx === 3 ? 'bg-mint-500 text-[#062119]' : 'bg-ink-700 text-haze-200'
              }`}
            >
              {s.i}
            </div>
            <div className="text-[11px] uppercase tracking-widest text-haze-500 mb-1.5">{s.t}</div>
            <div className="text-xs text-haze-300 leading-relaxed">{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
