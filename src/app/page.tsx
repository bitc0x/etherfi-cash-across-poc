import Image from 'next/image';
import Link from 'next/link';
import type { AcrossChain } from '@/lib/tokens';

async function getChains(): Promise<AcrossChain[]> {
  try {
    const r = await fetch('https://app.across.to/api/swap/chains', {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    return (await r.json()) as AcrossChain[];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const chains = await getChains();

  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <StatStrip />
      <LiveReceipt />
      <Unlock />
      <OndoStocks />
      <EmbeddedActions />
      <ReturnLeg />
      <Architecture />
      <PathRoadmap />
      <WhyAcross />
      <TrackRecord />
      <Coverage chains={chains} />
      <TrustedBy />
      <MoreCollaboration />
      <Credentials />
      <FinalCTA />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(0,0,0,0.72)] border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image src="/etherfi-logo.png" alt="ether.fi" width={28} height={28} className="rounded-full" />
            <span className="font-semibold text-[15px] tracking-tight">ether.fi</span>
          </div>
          <span className="text-cream-400 text-sm">×</span>
          <div className="flex items-center gap-2">
            <Image src="/across-logo.png" alt="Across" width={28} height={28} />
            <span className="font-semibold text-[15px] tracking-tight">Across</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <a href="https://docs.across.to" target="_blank" rel="noreferrer" className="btn-ghost text-sm">
            Docs
          </a>
          <Link href="/cash" className="btn-gold text-sm">
            Live demo →
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
      <div className="eyebrow mb-6">Integration proposal · ether.fi Cash</div>
      <h1 className="font-serif text-6xl sm:text-7xl md:text-[5.5rem] leading-[1.02] tracking-tightest mb-7 max-w-4xl gold-text">
        Tesla. Apple. Nvidia.<br />From your OP Cash safe.
      </h1>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.15] tracking-tight mb-8 max-w-3xl text-cream-100">
        Ondo's tokenized stocks, abstracted in Cash. Both directions.
      </h2>
      <p className="text-lg text-cream-300 max-w-3xl mb-10 leading-relaxed">
        Cash holds USDC on Optimism. TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, CRCLon and
        the wider Ondo Global Markets family live on Ethereum. The user declares the minimum
        acceptable output, Across delivers USDC to Ethereum, and how the trade finishes depends on
        the route.{' '}
        <span className="text-cream-100">
          Three liquidity sources wired in the PoC today: Bebop RFQ, 1inch Aggregation, 1inch
          Fusion.
        </span>{' '}
        The atomic paths (Bebop, Aggregation) complete inside the Across fill in one signature, ~2
        seconds, zero slippage on RFQ fills. The async path (Fusion) settles as a separate Ethereum
        order, two signatures today. No vault to deploy, no Ondo onboarding required. Same plumbing
        covers USDY, sUSDe, weETH, and anything else Ethereum-only.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/cash" className="btn-gold">
          Try the live PoC →
        </Link>
        <a href="#unlock" className="btn-outline-gold">
          What ether.fi gets
        </a>
      </div>
    </section>
  );
}

function StatStrip() {
  const stats = [
    { value: '$1.5B+', label: 'Ondo GM tokenized stock TVL' },
    { value: '260+', label: 'Tokenized stocks & ETFs' },
    { value: '<2s', label: 'Across settlement to Ethereum' },
    { value: '$35B+', label: 'Across lifetime volume' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-7">
            <div className="text-4xl md:text-5xl font-bold tracking-tight tabular text-cream-50">
              {s.value}
            </div>
            <div className="text-cream-400 mt-3 serif text-base">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Live receipt: real mainnet tx hashes proving the Phase 1 architecture works
// end-to-end. The single most compelling artifact in the deck.
function LiveReceipt() {
  const originTx = '0x189186f9e1bafeddd2e7cdce36e2218c8d9637d478cf3eb4ac8d6baff94d0df9';
  const fillTx = '0xc4879dd063bf7f6ec93eb62f1f74f572cffa7152a0a10deab8abf514ae50e5d0';
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="card-strong p-8 md:p-10 border-gold-500/30 bg-gradient-to-br from-gold-500/[0.04] to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
          <div className="text-[11px] uppercase tracking-widest gold-text font-semibold">
            Proof of execution
          </div>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl gold-text mb-4 tracking-tightest leading-[1.05]">
          Already executing on mainnet.
        </h2>
        <p className="text-cream-300 max-w-3xl mb-7 leading-relaxed">
          Across has already executed this end-to-end on Ethereum mainnet from a Cash-style
          USDC-on-Optimism flow. The Swap API delivered USDC to MulticallHandler, which called
          Bebop&rsquo;s RFQ settlement contract atomically and routed the TSLAon to the
          recipient. One signature, ~2 seconds, zero slippage on the RFQ fill. The same
          architecture now routes through{' '}
          <span className="text-cream-100">1inch Aggregation and 1inch Fusion</span> in the PoC,
          selectable per trade. Same Across rails throughout.
        </p>

        {/* Receipt summary: input -> output flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-bg-700 border border-white/[0.06] p-4">
            <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-1.5">Sent</div>
            <div className="text-xl tabular text-cream-50 font-semibold">1.312601 USDC</div>
            <div className="text-[11px] text-cream-400 mt-0.5">on Optimism, from Cash safe</div>
          </div>
          <div className="rounded-xl bg-bg-700 border border-white/[0.06] p-4">
            <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-1.5">Received</div>
            <div className="text-xl tabular text-cream-50 font-semibold">0.002685 TSLAon</div>
            <div className="text-[11px] text-cream-400 mt-0.5">on Ethereum, atomic, Bebop RFQ fill</div>
          </div>
          <div className="rounded-xl bg-bg-700 border border-white/[0.06] p-4">
            <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-1.5">Path</div>
            <div className="text-sm text-cream-100 leading-tight">
              Across SpokePool &rarr; MulticallHandler &rarr; Bebop RFQ &rarr; recipient
            </div>
            <div className="text-[11px] text-cream-400 mt-0.5">one transaction, atomic</div>
          </div>
        </div>

        {/* Tx hash links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href={`https://optimistic.etherscan.io/tx/${originTx}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/[0.06] hover:border-gold-500/30 bg-bg-700/40 p-4 transition-colors block"
          >
            <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-1.5">
              Origin tx &middot; Optimism
            </div>
            <div className="text-xs tabular gold-text break-all">
              {originTx.slice(0, 24)}...{originTx.slice(-8)}
            </div>
            <div className="text-[10px] text-cream-500 mt-1">Open in Optimistic Etherscan &rarr;</div>
          </a>
          <a
            href={`https://etherscan.io/tx/${fillTx}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/[0.06] hover:border-gold-500/30 bg-bg-700/40 p-4 transition-colors block"
          >
            <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-1.5">
              Fill tx &middot; Ethereum
            </div>
            <div className="text-xs tabular gold-text break-all">
              {fillTx.slice(0, 24)}...{fillTx.slice(-8)}
            </div>
            <div className="text-[10px] text-cream-500 mt-1">Open in Etherscan &rarr;</div>
          </a>
        </div>
      </div>
    </section>
  );
}

function Unlock() {
  const pillars = [
    {
      n: '01',
      tag: 'Ondo stocks, first',
      h: 'TSLAon, AAPLon, NVDAon, in Cash.',
      p: "Ondo Global Markets is the largest tokenized equity platform onchain, 260+ US stocks and ETFs live on Ethereum. ether.fi Cash users can't reach them today because Cash is on Optimism. Across closes the gap: USDC leaves the OP safe via the Swap API, settles on Ethereum at the MulticallHandler in ~2 seconds, and an embedded destination action delivers the requested Ondo GM token in the same transaction. Three sources wired and selectable per trade: Bebop RFQ (atomic, zero slippage; MMs are Ondo-approved primary holders so ether.fi inherits compliance at the MM layer), 1inch Aggregation (atomic, multi-DEX routing; for Ondo GM typically routes through Bebop as one of its PMM sources, with 1inch's routing layer as fallback and broader coverage for non-RFQ assets), and 1inch Fusion (Dutch auction, best rates during US market hours via the Ondo x 1inch partnership; off-hours falls back cleanly). Bebop and Aggregation run as embedded actions through the MulticallHandler, atomic inside the fill, one signature; Fusion instead delivers USDC to the user wallet and fills via a separate signed Ethereum order, two signatures today (single-signature Fusion via a smart-contract maker is designed, not yet built). Recipient is ether.fi's choice (user wallet or Cash safe). Same path covers USDY, sUSDe, weETH, USDS, and any other Ethereum-only asset.",
    },
    {
      n: '02',
      tag: 'One or two signatures',
      h: 'Atomic paths in one tx. No manual bridge. No leaving Cash.',
      p: 'On the atomic paths (Bebop, 1inch Aggregation) the user signs once: Across settles in roughly 2 seconds and the destination swap executes atomically inside the same fill. The async path (1inch Fusion) is two signatures today, the Across deposit plus a separate Fusion order on Ethereum; single-signature Fusion via a smart-contract maker is designed, not yet built. Return leg is symmetric: user sells, USDC lands back in the OP safe. Same card, same session, same brand.',
    },
    {
      n: '03',
      tag: 'Revenue',
      h: 'Monetize every cross-chain swap.',
      p: 'appFee on the Swap API lets ether.fi take a configurable cut of every cross-chain trade, on top of standard Cash fees. New revenue line, zero engineering on the take-rate side.',
    },
  ];
  return (
    <section id="unlock" className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">What ether.fi unlocks</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        One safe on Optimism. Every yield-bearing asset on Ethereum.
      </h2>
      <p className="text-cream-300 max-w-2xl mb-14 leading-relaxed">
        Wire the Across Swap API and MulticallHandler into the Cash safe. No second product, no
        manual bridge UX. Cash users sell USDC on OP, buy any Ethereum asset, and delivery happens
        in the same transaction.
      </p>

      <div className="grid md:grid-cols-3 gap-5">
        {pillars.map((c) => (
          <div key={c.n} className="card p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="font-serif text-4xl gold-text tabular">{c.n}</div>
              <div className="text-[11px] uppercase tracking-widest text-cream-400">{c.tag}</div>
            </div>
            <h3 className="font-serif text-2xl text-cream-50 mb-4 leading-tight">{c.h}</h3>
            <p className="text-cream-300 text-sm leading-relaxed flex-1">{c.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OndoStocks() {
  // Order: 7 Bebop-buyable Ondo GM tickers (live end-to-end today) first, then preview-only stocks.
  // 'live' marks the ones with confirmed Bebop secondary-market buy-side coverage.
  const stocks = [
    { sym: 'TSLAon', tkr: 'TSLA', name: 'Tesla', color: '#E31937', live: true },
    { sym: 'NVDAon', tkr: 'NVDA', name: 'Nvidia', color: '#76B900', live: true },
    { sym: 'GOOGLon', tkr: 'GOOGL', name: 'Alphabet', color: '#4285F4', live: true },
    { sym: 'COINon', tkr: 'COIN', name: 'Coinbase', color: '#0052FF', live: true },
    { sym: 'HOODon', tkr: 'HOOD', name: 'Robinhood', color: '#00C805', live: true },
    { sym: 'MSTRon', tkr: 'MSTR', name: 'MicroStrategy', color: '#F7931A', live: true },
    { sym: 'CRCLon', tkr: 'CRCL', name: 'Circle', color: '#1FAB44', live: true },
    { sym: 'AAPLon', tkr: 'AAPL', name: 'Apple', color: '#A2AAAD', live: false },
    { sym: 'SPYon', tkr: 'SPY', name: 'S&P 500 ETF', color: '#1E40AF', live: false },
    { sym: 'QQQon', tkr: 'QQQ', name: 'Nasdaq 100 ETF', color: '#7C3AED', live: false },
    { sym: 'NFLXon', tkr: 'NFLX', name: 'Netflix', color: '#E50914', live: false },
    { sym: '+250 more', tkr: '...', name: 'and counting', color: '#444', live: false },
  ];

  const arch = [
    { n: '01', t: 'USDC leaves OP', d: 'Cash safe debits via Across SpokePool. One user signature, declares min output.' },
    { n: '02', t: 'Across settles on ETH', d: 'Relayer fronts USDC to the MulticallHandler in ~2 seconds, UMA-secured.' },
    { n: '03', t: 'MulticallHandler routes', d: 'Approves the destination liquidity source and executes the swap atomically inside the same fill. Across never holds funds.' },
    { n: '04', t: 'Destination source fills', d: 'Bebop RFQ (atomic, zero slippage on the quoted amount) or 1inch Aggregation (atomic, multi-DEX; for Ondo GM typically routes through Bebop as a PMM, fallback for non-RFQ assets) fills inside this same MulticallHandler call. 1inch Fusion is the async exception: USDC is delivered to the user wallet and a separate signed order fills it (two signatures today). ether.fi picks per trade.' },
    { n: '\u2713', t: 'Abstracted in Cash UI', d: 'User sees TSLAon balance. Recipient is ether.fi\u2019s choice: user wallet or Cash safe. Sell path is symmetric.' },
  ];

  return (
    <section id="ondo-stocks" className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Direct answer to ether.fi's ask</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        Yes, Ondo stocks.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-12 leading-relaxed text-lg">
        Ondo Global Markets is the largest tokenized equities platform onchain.{' '}
        <span className="text-cream-100">$1.5B TVL, $18B cumulative volume, 70% market share,
        260+ stocks and ETFs across Solana, Ethereum, and BNB Chain.</span> The architecture below routes
        Cash users into any supported Ondo GM token from their OP safe: Across Swap API on the
        bridge leg, then a destination fill from Bebop RFQ or 1inch Aggregation (both atomic
        embedded actions, one signature) or 1inch Fusion (a separate Ethereum order, two
        signatures today). All three are wired in the PoC and selectable per trade.
        Seven tickers are end-to-end executable today. We&rsquo;ve already run a live mainnet
        TSLAon purchase.
      </p>

      {/* Stock grid */}
      <div className="mb-12">
        <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-4 flex items-center gap-3">
          <span>What ether.fi Cash unlocks via Ondo GM</span>
          <span className="px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-300 text-[9px] font-semibold tracking-wider">
            LIVE = executable today
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {stocks.map((s) => (
            <div
              key={s.sym}
              className={`card p-3.5 flex flex-col items-center text-center hover:border-gold-500/30 transition-colors relative ${
                s.live ? 'border-gold-500/20' : ''
              }`}
            >
              {s.live && (
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-gold-500 text-[#1A140A] text-[8px] font-bold tracking-wider">
                  LIVE
                </span>
              )}
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center text-white text-[11px] font-bold tracking-wider mb-2.5"
                style={{ background: s.color }}
              >
                {s.tkr}
              </div>
              <div className="text-xs font-semibold text-cream-100 leading-tight">{s.sym}</div>
              <div className="text-[10px] text-cream-400 mt-0.5 leading-tight">{s.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="card-strong p-8">
        <div className="eyebrow mb-3">How a Cash user buys TSLAon</div>
        <h3 className="font-serif text-2xl md:text-3xl gold-text mb-7 max-w-2xl tracking-tight">
          USDC on OP → TSLAon in Cash. Atomic path: one signature, ~2 seconds.
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {arch.map((a, i) => (
            <div key={i} className={`card p-4 ${i === arch.length - 1 ? 'border-gold-500/40' : ''}`}>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-base mb-3 ${
                  i === arch.length - 1 ? 'bg-gold-500 text-[#1A140A] font-semibold' : 'bg-bg-600 text-cream-200'
                }`}
              >
                {a.n}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-1.5">{a.t}</div>
              <div className="text-xs text-cream-200 leading-relaxed">{a.d}</div>
            </div>
          ))}
        </div>
        <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-bg-700 border border-white/[0.06] p-4">
            <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-1.5">Why no onboarding is needed</div>
            <div className="text-xs text-cream-200 leading-relaxed">
              Bebop&rsquo;s market makers are themselves Ondo-approved holders. ether.fi inherits
              compliance at the MM layer instead of deploying and onboarding a vault. Zero
              infrastructure lift; ship today.
            </div>
          </div>
          <div className="rounded-xl bg-bg-700 border border-white/[0.06] p-4">
            <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-1.5">Same path for live yield assets</div>
            <div className="text-xs text-cream-200 leading-relaxed">
              The architecture also handles USDY, sUSDe, sDAI, weETH, USDS without the Bebop
              leg. These are direct token-to-token routes via the Across Swap API. PoC demo
              shows them live.
            </div>
          </div>
          <div className="rounded-xl bg-bg-700 border border-white/[0.06] p-4">
            <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-1.5">Demo</div>
            <div className="text-xs text-cream-200 leading-relaxed">
              <Link href="/cash" className="gold-text hover:underline">Live PoC</Link> opens with
              TSLAon. Click Buy for an end-to-end execution against the production Across
              integrator ID. Mainnet tx hashes available on request.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmbeddedActions() {
  const steps = [
    {
      i: '1',
      t: 'User signs once',
      d: 'In Cash on Optimism. The signature declares input amount, minimum acceptable output, and a deadline. Nothing else.',
    },
    {
      i: '2',
      t: 'Across routes USDC',
      d: 'Relayer fronts USDC on Ethereum in ~2 seconds. UMA-secured, $35B+ bridged, zero exploits since launch.',
    },
    {
      i: '3',
      t: 'Action executes on Ethereum',
      d: 'MulticallHandler runs whatever code completes the trade: Bebop RFQ, 1inch Aggregation, a vault deposit, a Uniswap swap, any contract you point it at. (1inch Fusion is the async exception: it fills as a separate Ethereum order, not an embedded action.)',
    },
    {
      i: '✓',
      t: 'Outcome delivered',
      d: 'Final asset lands in the recipient address. One signature. ~2 seconds for atomic paths.',
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="card-strong p-8 md:p-12">
        <div className="eyebrow mb-4">Embedded actions</div>
        <h2 className="font-serif text-4xl md:text-5xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
          Sign once. Declare the outcome. Across does the rest.
        </h2>
        <p className="text-cream-300 max-w-3xl mb-6 leading-relaxed">
          The user signs a single intent on Optimism: input amount, minimum acceptable output,
          deadline. Across handles cross-chain routing and then executes whatever onchain code
          completes the trade on Ethereum. The destination logic is source-agnostic.
          ether.fi picks the right tool per trade without ever touching the cross-chain layer.
        </p>

        {/* Three wired liquidity sources displayed as pill chips so the
            "wired today" story is concrete and visible at a glance. */}
        <div className="flex flex-wrap gap-2 mb-12">
          <span className="px-3 py-1.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-200 text-xs font-semibold tracking-tight">
            Bebop RFQ &middot; atomic &middot; zero slippage
          </span>
          <span className="px-3 py-1.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-200 text-xs font-semibold tracking-tight">
            1inch Aggregation &middot; atomic &middot; multi-DEX
          </span>
          <span className="px-3 py-1.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-200 text-xs font-semibold tracking-tight">
            1inch Fusion &middot; async &middot; Dutch auction
          </span>
          <span className="px-3 py-1.5 rounded-full border border-white/15 text-cream-300 text-xs font-semibold tracking-tight">
            Or any contract you point it at
          </span>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {steps.map((s, idx) => (
            <div
              key={s.i}
              className={`relative card p-6 ${idx === 3 ? 'border-gold-500/40' : ''}`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-serif text-xl mb-4 ${
                  idx === 3 ? 'bg-gold-500 text-[#1A140A] font-semibold' : 'bg-bg-500 text-cream-200'
                }`}
              >
                {s.i}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-cream-400 mb-2">
                {s.t}
              </div>
              <div className="text-sm text-cream-200 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReturnLeg() {
  const outbound = [
    'USDC leaves the Cash safe on OP. One signature on the atomic paths (Bebop, Aggregation); declares min output.',
    'Across relayer fills on Ethereum (~2s).',
    'MulticallHandler executes the destination swap atomically for Bebop RFQ or 1inch Aggregation; the Ondo GM token is delivered to the recipient. 1inch Fusion fills async via a separate signed order (two signatures today) instead.',
  ];
  const inbound = [
    'User signs a sell of the Ondo GM token on Ethereum.',
    'Across Swap API routes the return leg; relayer fronts USDC on Optimism.',
    'USDC lands in the Cash safe on Optimism.',
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Both directions</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        And back again. Same architecture, opposite direction.
      </h2>
      <p className="text-cream-300 max-w-2xl mb-14 leading-relaxed">
        Same Swap API, same MulticallHandler, same settlement guarantees. When a Cash user wants
        to liquidate an Ethereum-side position back to USDC on their OP safe, the call is
        identical with input and output reversed. No second integration to build, no separate UX.
      </p>

      <div className="card-strong p-8 md:p-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-full bg-gold-500 text-[#1A140A] flex items-center justify-center font-serif text-base font-semibold">
                &uarr;
              </div>
              <div className="font-serif text-2xl text-cream-50">Outbound &middot; Buy</div>
            </div>
            <div className="text-sm text-cream-400 mb-5">Cash safe on OP &rarr; recipient on Ethereum</div>
            <ol className="space-y-3 text-sm text-cream-200">
              {outbound.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-gold-400 tabular font-semibold w-5 flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="md:border-l md:border-white/[0.06] md:pl-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-full bg-bg-500 text-cream-200 flex items-center justify-center font-serif text-base font-semibold border border-gold-400/40">
                &darr;
              </div>
              <div className="font-serif text-2xl text-cream-50">Return &middot; Sell</div>
            </div>
            <div className="text-sm text-cream-400 mb-5">Ethereum holdings &rarr; Cash safe on OP</div>
            <ol className="space-y-3 text-sm text-cream-200">
              {inbound.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-gold-400 tabular font-semibold w-5 flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="divider my-8" />

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm">
          <div className="eyebrow whitespace-nowrap">Try both</div>
          <p className="text-cream-300 leading-relaxed flex-1">
            The live demo has a Buy / Sell toggle. Quotes return for both directions against your
            production integrator ID.
          </p>
          <Link href="/cash" className="btn-outline-gold whitespace-nowrap">
            Open demo →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Architecture() {
  const ethfi = [
    'Recipient choice: Cash safe contract or user wallet',
    'UI abstraction across both safes',
    'Position accounting and yield display',
    'Optional vault for Path C primary-mint depth',
  ];
  const across = [
    'Cross-chain routing and swap execution',
    '40+ independent relayers',
    'SpokePool contracts, audited',
    'MulticallHandler for embedded actions',
    'Source-agnostic destination routing (Bebop, 1inch Aggregation, 1inch Fusion, or any contract)',
    'Settlement via UMA optimistic oracle',
    'Fill confirmation and status indexing',
    'Quote API with live pricing',
    'Fee accounting and appFee distribution',
    'DEX aggregation on destination',
    'Risk-bearing relayer capital',
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Don't reinvent the wheel</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        What ether.fi builds. What Across delivers.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-14 leading-relaxed">
        ether.fi keeps full control of the user-facing product and asset custody. Across is the
        cross-chain layer underneath. Nothing in this stack needs to be rebuilt.
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Image src="/etherfi-logo.png" alt="ether.fi" width={28} height={28} className="rounded-full" />
            <div className="font-serif text-2xl text-cream-50">ether.fi builds</div>
          </div>
          <ul className="space-y-3 flex-1">
            {ethfi.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-cream-200">
                <span className="text-gold-400 mt-0.5">◆</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t border-white/[0.06] text-xs text-cream-400 leading-relaxed">
            UI work + a recipient address. Path A ships in days.
          </div>
        </div>

        <div className="card p-8 border-gold-500/20 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Image src="/across-logo.png" alt="Across" width={28} height={28} />
            <div className="font-serif text-2xl gold-text">Across delivers</div>
          </div>
          <ul className="space-y-3 flex-1">
            {across.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-cream-200">
                <span className="text-gold-400 mt-0.5">◆</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t border-gold-500/15 text-xs gold-text leading-relaxed">
            Eleven layers of cross-chain infrastructure. Live, audited, $35B+ proven.
          </div>
        </div>
      </div>
    </section>
  );
}

function PathRoadmap() {
  const pathA = [
    'Across delivers USDC to Ethereum in ~2 seconds via the Swap API. Bebop and 1inch Aggregation ride along as embedded destination actions in the same transaction (one signature, atomic). 1inch Fusion runs as a separate destination order on Ethereum (two signatures today, async); single-signature Fusion via an ERC-1271 smart-contract maker is designed, not yet built.',
    'Three destination sources wired today: Bebop RFQ (atomic embedded action, zero slippage on the quoted amount, MMs are Ondo-approved primary holders), 1inch Aggregation (atomic embedded action, multi-DEX; for Ondo GM typically routes through Bebop as a PMM source, broader coverage for non-RFQ assets), 1inch Fusion (async order, Dutch auction, best rates during US market hours via the Ondo x 1inch partnership).',
    'ether.fi picks the source per trade. Same Across rails throughout. Toggle live in the PoC demo.',
    'Light lift on ether.fi\u2019s side. Drop the action payload into your existing Across Swap API call. Full integration reference open-sourced.',
    'Live coverage today: TSLAon, NVDAon, GOOGLon, COINon, HOODon, MSTRon, CRCLon.',
    'Already executed end-to-end on Ethereum mainnet through our production integrator ID.',
  ];
  const pathB = [
    'Across natively returns the Ondo GM destination action in the Swap API response.',
    'ether.fi calls one endpoint, gets back a ready-to-broadcast transaction for any covered Ondo GM token. No action payload to construct.',
    'Same on-chain primitives as Path A, even simpler integration shape.',
    'A natural upgrade once Path A volume is established.',
  ];
  const pathC = [
    'Unlocks the remaining ~250 Ondo GM tickers via primary mint (AAPLon, SPYon, QQQon, NFLXon, BABAon, SLVon, COPXon, and the long tail).',
    'Unlocks whale-size primary-mint depth above market-maker inventory.',
    'ether.fi deploys a vault and onboards with Ondo as an approved holder.',
    'Across continues to handle cross-chain routing and atomic destination execution. Same architecture, broader access.',
  ];

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Rollout</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        Three paths. Ship now, expand later.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-12 leading-relaxed text-lg">
        Path A is live today via the Across Swap API. Path B is the next improvement that makes
        Path A even simpler. Path C unlocks the full Ondo GM catalog. The three are independent:
        A doesn&rsquo;t block B, B doesn&rsquo;t block C, and Path A ships regardless.
      </p>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Path A: gold-accented, LIVE NOW */}
        <div className="card p-7 border-gold-500/30 bg-gold-500/[0.03] flex flex-col">
          <div className="flex items-start justify-between mb-5 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="font-serif text-4xl gold-text tabular leading-none flex-shrink-0">A</div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-widest gold-text font-semibold">Path A</div>
                <div className="font-serif text-lg text-cream-50 leading-tight">
                  Across Swap API with embedded action
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-gold-500 text-[#1A140A] font-semibold text-[10px] tracking-wider flex-shrink-0">
              LIVE NOW
            </span>
          </div>
          <ul className="space-y-3 flex-1">
            {pathA.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13px] text-cream-200">
                <span className="text-gold-400 mt-1 flex-shrink-0">&#9670;</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t border-gold-500/15">
            <Link
              href="/reference"
              className="text-xs gold-text hover:underline font-semibold"
            >
              Read the integration reference &rarr;
            </Link>
          </div>
        </div>

        {/* Path B: subtler, COMING SOON */}
        <div className="card p-7 flex flex-col">
          <div className="flex items-start justify-between mb-5 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="font-serif text-4xl text-cream-300 tabular leading-none flex-shrink-0">B</div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-widest text-cream-400 font-semibold">Path B</div>
                <div className="font-serif text-lg text-cream-50 leading-tight">
                  Ondo GM as a native Swap API output
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full border border-white/15 text-cream-400 text-[10px] tracking-wider flex-shrink-0">
              COMING
            </span>
          </div>
          <ul className="space-y-3 flex-1">
            {pathB.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13px] text-cream-200">
                <span className="text-cream-500 mt-1 flex-shrink-0">&#9670;</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t border-white/[0.06] text-xs text-cream-400 leading-relaxed">
            Roadmap on the Across side.
          </div>
        </div>

        {/* Path C: Phase 2 long-term ticker expansion */}
        <div className="card p-7 flex flex-col">
          <div className="flex items-start justify-between mb-5 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="font-serif text-4xl text-cream-300 tabular leading-none flex-shrink-0">C</div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-widest text-cream-400 font-semibold">Path C</div>
                <div className="font-serif text-lg text-cream-50 leading-tight">
                  Vault + Ondo onboarding for full coverage
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full border border-white/15 text-cream-400 text-[10px] tracking-wider flex-shrink-0">
              PHASE 2
            </span>
          </div>
          <ul className="space-y-3 flex-1">
            {pathC.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13px] text-cream-200">
                <span className="text-cream-500 mt-1 flex-shrink-0">&#9670;</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t border-white/[0.06] text-xs text-cream-400 leading-relaxed">
            Decide based on Path A traction and the volume profile Cash actually sees.
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyAcross() {
  const features = [
    { t: 'Speed', d: 'Sub-2 second median fill time across all routes. Verifiable on every transaction.' },
    { t: 'Cost', d: 'Single-digit basis points on Cash\u2019s routes, verifiable on-chain. Often free when sponsored.' },
    {
      t: 'Decentralization',
      d: '40+ independent relayers compete to fill. Funds escrowed in audited contracts, settled via UMA optimistic oracle. No single point of failure.',
    },
    {
      t: 'SLAs',
      d: 'Volume commitments, dedicated relayers, integrator-grade support and uptime guarantees for partners shipping in production.',
    },
    {
      t: 'Marketing',
      d: 'Co-launch announcements, X amplification, joint blog content, ecosystem placement across the Across partner network.',
    },
    {
      t: 'appFee',
      d: 'Configurable take-rate on every swap, paid out to an ether.fi-controlled address. New revenue stream with zero engineering on the take side.',
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Why Across</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        Cheapest. Fastest. Safest. Best UX.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-14 leading-relaxed text-lg">
        Single-digit bps on Cash&rsquo;s routes, sub-2 second fills, $35B+ bridged with zero
        exploits since launch, as little as one signature for the entire cross-chain action.
        Verifiable on every transaction, on-chain. The infrastructure under the cross-chain layer.
      </p>

      <div className="grid md:grid-cols-3 gap-5">
        {features.map((f) => (
          <div key={f.t} className="card p-7">
            <div className="font-serif text-2xl gold-text mb-3">{f.t}</div>
            <p className="text-cream-300 text-sm leading-relaxed">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrackRecord() {
  const stats = [
    { v: '$35B+', l: 'Bridged across all chains' },
    { v: '0', l: 'Exploits since launch' },
    { v: '0', l: 'User funds ever lost' },
    { v: 'UMA', l: 'Optimistic-oracle settled' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Track record</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        Zero exploits. Zero downtime. Zero compromise.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-14 leading-relaxed">
        Bridges have lost over $2.9 billion to exploits in the last four years. Across has lost
        none. Not luck, architecture. Users receive canonical assets, never wrapped representations.
        Relayers front capital and bear the transfer risk. Settlement is verified by the UMA
        optimistic oracle. The system stays secure with just one honest participant.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.l} className="card p-7">
            <div className="font-serif text-5xl gold-text tabular">{s.v}</div>
            <div className="text-sm text-cream-400 mt-3">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ether.fi cash-relevant chains (highlighted) (others are standard coverage)
const CASH_CHAIN_IDS = new Set([10, 1]);

function Coverage({ chains }: { chains: AcrossChain[] }) {
  // Sort: Cash chains first, then alphabetical
  const sorted = [...chains].sort((a, b) => {
    const aC = CASH_CHAIN_IDS.has(a.chainId) ? 0 : 1;
    const bC = CASH_CHAIN_IDS.has(b.chainId) ? 0 : 1;
    if (aC !== bC) return aC - bC;
    return a.name.localeCompare(b.name);
  });

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Coverage</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        Live on every chain Cash users hold capital.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-14 leading-relaxed">
        Across natively supports Optimism (where Cash lives) and Ethereum (where the asset universe
        lives). Plus every other chain a future Cash deployment might touch.{' '}
        <span className="text-cream-400 text-sm">
          ({sorted.length} chains, live from app.across.to)
        </span>
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {sorted.map((c) => (
          <div key={c.chainId} className="card p-4 flex flex-col items-center gap-2 text-center">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt={c.name} className="w-8 h-8" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-bg-400" />
            )}
            <span className="text-xs text-cream-200">{c.name}</span>
            {CASH_CHAIN_IDS.has(c.chainId) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-500/15 text-gold-400 font-semibold tracking-wider">
                CASH
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const partners = [
  { name: 'Circle', logo: '/circle-logo.png' },
  { name: 'Coinbase', logo: '/coinbase-logo.png' },
  { name: 'Uniswap', logo: '/uniswap-logo.png' },
  { name: 'MetaMask', logo: '/metamask-logo.png' },
  { name: 'PancakeSwap', logo: '/pancakeswap-logo.png' },
  { name: 'Hyperbeat', logo: '/hyperbeat-logo.png' },
];

function TrustedBy() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-14 max-w-3xl tracking-tightest leading-[1.05]">
        Trusted and integrated by.
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {partners.map((p, i) => (
          <div
            key={p.name}
            className="group relative overflow-hidden card aspect-[2.4/1] flex items-center justify-center transition-all duration-300 hover:border-gold-500/30 hover:-translate-y-0.5"
            style={{
              background:
                i % 2 === 0
                  ? 'linear-gradient(135deg, rgba(10,10,11,0.9), rgba(16,17,19,0.6))'
                  : 'linear-gradient(135deg, rgba(16,17,19,0.6), rgba(10,10,11,0.9))',
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 120%, rgba(200,168,118,0.12), transparent 60%)',
              }}
            />
            <div className="relative flex items-center gap-4 px-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt={p.name} className="h-10 w-10 object-contain" />
              <span className="text-base font-medium tracking-tight text-cream-100">{p.name}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MoreCollaboration() {
  const paths = [
    {
      n: '01',
      eyebrow: 'Deposits',
      title: 'Fund Cash from any token, any chain.',
      body: 'Power Cash deposits via the Across Swap API. USDT on Arbitrum, ETH on Mainnet, USDe on Base, any asset on any of 25+ chains lands as USDC in the Cash safe in ~2 seconds. One signature, atomic, cheap.',
    },
    {
      n: '02',
      eyebrow: 'Withdrawals',
      title: 'Exit Cash to any token, any chain.',
      body: 'Cash exits today are restricted to USDC on Optimism. With Across, users withdraw to any asset on any of 25+ chains in one signature, ~2s settlement.',
    },
    {
      n: '03',
      eyebrow: 'Deposit addresses',
      title: 'A funding address per user, on every chain.',
      body: "Counterfactual deposit addresses: each Cash user gets a unique funding endpoint on every supported chain. Send from any wallet, CEX, or payroll deposit; Across settles into the Cash safe automatically. No connect-wallet step. Hyperbeat ships this today.",
    },
    {
      n: '04',
      eyebrow: 'Gasless onboarding',
      title: 'No native gas on the origin chain.',
      body: "Paired with deposit addresses, users never sign a tx or hold ETH/MATIC/etc. to fund Cash. Kills the universal 'why is my deposit stuck' onboarding ticket.",
    },
    {
      n: '05',
      eyebrow: 'Card settlement',
      title: 'Swap API behind every Cash card swipe.',
      body: "Server-side Swap API call at swipe time converts the user's USDY, sUSDe, weETH, or tokenized stocks to USDC just-in-time for the merchant. Always-on yield, spendable anywhere Visa is accepted.",
    },
    {
      n: '06',
      eyebrow: 'Sponsored routes',
      title: '1:1 slippage-free route of your choice.',
      body: 'Across runs sponsored corridors at zero fee with 1:1 slippage-free pricing for users. Stablecoin issuers do this today on their highest-volume lanes. ether.fi picks any route Cash cares most about and we wire it up jointly.',
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Beyond Ondo · further integration paths</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        Across can power more of Cash.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-12 leading-relaxed text-lg">
        Ondo stocks is the headline ask, and it&rsquo;s live today via the Across Swap API. The
        same Swap API and MulticallHandler plumbing extends across the rest of the Cash product.
        Each path below is independently shippable. We&rsquo;d love to discuss any of them on
        our call.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paths.map((p) => (
          <div key={p.n} className="card p-6 hover:border-gold-500/30 transition-colors flex flex-col">
            <div className="flex items-baseline justify-between mb-4">
              <div className="font-serif text-3xl gold-text tabular leading-none">{p.n}</div>
              <div className="text-[10px] uppercase tracking-widest text-cream-500">{p.eyebrow}</div>
            </div>
            <div className="font-serif text-lg text-cream-50 mb-3 leading-snug tracking-tight">
              {p.title}
            </div>
            <p className="text-xs text-cream-300 leading-relaxed flex-1">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Credentials() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Ready to integrate</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        ether.fi's production credentials.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-14 leading-relaxed">
        Pre-provisioned by the Across team for ether.fi. The integrator ID attributes volume to
        ether.fi automatically on every Swap API call; the dedicated API key is shared privately
        and lives in the server environment, never in the client.{' '}
        <a
          href="https://docs.across.to"
          target="_blank"
          rel="noreferrer"
          className="gold-text hover:underline"
        >
          Read the integration docs →
        </a>
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        <CredCard
          label="Integrator ID"
          value="0x0162"
          description="Pass as the integratorId query parameter on every Swap API call."
        />
        <CredCard
          label="API Key"
          value="acx_••••••••••••••  ·  shared privately"
          description="Passed as a Bearer token in the Authorization header, server-side only. The full key is delivered to the ether.fi team directly, never embedded in this page or the client bundle."
        />
      </div>
    </section>
  );
}

function CredCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="card p-7">
      <div className="eyebrow mb-3">{label}</div>
      <p className="text-sm text-cream-400 mb-5 leading-relaxed">{description}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-bg-700 border border-white/[0.06] rounded-xl px-4 py-3 text-sm gold-text font-mono break-all">
          {value}
        </code>
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="card-strong p-12 md:p-16 text-center">
        <h2 className="font-serif text-4xl md:text-5xl gold-text mb-6 tracking-tightest">
          The infrastructure is ready. The PoC is already running.
        </h2>
        <p className="text-cream-300 mb-10 max-w-2xl mx-auto leading-relaxed text-lg">
          Three destination sources wired and selectable per trade. Mainnet tx hashes on record.
          Integration reference published with everything ether.fi engineering needs to ship.
          Same Across rails throughout, source-agnostic by design.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/cash" className="btn-gold inline-block">
            Open the live PoC &rarr;
          </Link>
          <Link href="/reference" className="btn-outline-gold inline-block">
            Read the integration reference &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-20">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-cream-400">
        <div>Built for ether.fi by Across. Risk Labs, 2026.</div>
        <div className="flex items-center gap-5">
          <Link href="/reference" className="hover:text-cream-100">
            Integration reference
          </Link>
          <a href="https://across.to" target="_blank" rel="noreferrer" className="hover:text-cream-100">
            across.to
          </a>
          <a href="https://docs.across.to" target="_blank" rel="noreferrer" className="hover:text-cream-100">
            docs.across.to
          </a>
          <a
            href="https://x.com/AcrossProtocol"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cream-100"
          >
            @AcrossProtocol
          </a>
        </div>
      </div>
    </footer>
  );
}
