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
      <Unlock />
      <EmbeddedActions />
      <ReturnLeg />
      <Architecture />
      <WhyAcross />
      <TrackRecord />
      <CostVsAlternatives />
      <Coverage chains={chains} />
      <TrustedBy />
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
        Cash, anywhere.
      </h1>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.15] tracking-tight mb-8 max-w-3xl text-cream-100">
        Any Ethereum asset. Both directions.
      </h2>
      <p className="text-lg text-cream-300 max-w-2xl mb-10 leading-relaxed">
        Cash users hold USDC in a safe on Optimism. The yield, RWAs, and tokens they want, USDY,
        sUSDe, weETH, ONDO, and anything else Ethereum-only, live on Ethereum. Plug in Across, and
        one signature in Cash routes USDC out, settles on Ethereum in roughly 2 seconds, and
        deposits into the target asset atomically. Same architecture in reverse for the sell leg.
        No second tab, no manual bridge.
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
    { value: '$35B+', label: 'Total volume bridged' },
    { value: '<2s', label: 'Median fill time' },
    { value: '40+', label: 'Independent relayers' },
    { value: '40+ apps', label: 'Live integrations' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-7">
            <div className="text-4xl md:text-5xl font-bold tracking-tight tabular text-cream-50">
              {s.value}
            </div>
            <div className="text-sm text-cream-400 mt-3 serif text-base">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Unlock() {
  const pillars = [
    {
      n: '01',
      tag: 'Asset universe',
      h: 'Every Ethereum asset, reachable from Cash.',
      p: "Today, Cash can't hold sUSDe, weETH, USDY, USDS, or Ondo's tokenized stocks. Across closes that gap. The Swap API routes USDC on OP into the target asset on Ethereum, and embedded actions deposit it into ether.fi's Ethereum vault in the same transaction. For permissioned RWAs like Ondo GM stocks, the embedded action invokes the issuer's purchase contract directly from your KYC'd vault.",
    },
    {
      n: '02',
      tag: 'Single signature',
      h: 'One tx. No manual bridge. No leaving Cash.',
      p: 'User signs once. Across settles in roughly 2 seconds, deposits into the destination vault atomically. Return leg is symmetric: vault sells, USDC lands back in the OP safe. Same card, same session, same brand.',
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
        Wire the Across Swap API into the Cash safe. No second product, no manual bridge UX. Cash
        users sell USDC on OP, buy any Ethereum asset, and the deposit lands in their Ethereum
        vault as a single transaction.
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

function EmbeddedActions() {
  const steps = [
    { i: '1', t: 'Step 1', d: 'User holds USDC in the Cash safe on Optimism.' },
    { i: '2', t: 'Step 2', d: 'Selects an Ethereum asset (Ondo, sUSDe, weETH, ...).' },
    { i: '3', t: 'Step 3', d: 'Across routes, fills, and deposits into the Ethereum vault atomically.' },
    { i: '✓', t: 'Result', d: 'Position live on Ethereum. One signature. Roughly 2s.' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="card-strong p-8 md:p-12">
        <div className="eyebrow mb-4">Embedded actions</div>
        <h2 className="font-serif text-4xl md:text-5xl gold-text mb-6 max-w-2xl tracking-tightest leading-[1.05]">
          One signature in Cash. Deposit on Ethereum.
        </h2>
        <p className="text-cream-300 max-w-2xl mb-12 leading-relaxed">
          Across destination actions let a user on OP deposit straight into an Ethereum vault in
          one transaction. No second approval. No idle capital. No bridge UX to maintain.
        </p>

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
    'USDC leaves the Cash safe on OP.',
    'Across relayer fills on Ethereum (~2s).',
    'MulticallHandler swaps and deposits into the ether.fi Ethereum vault.',
  ];
  const inbound = [
    'User triggers sell from the ether.fi Ethereum vault.',
    'Vault unwinds the position; MulticallHandler routes proceeds through Across.',
    'USDC lands in the Cash safe on Optimism.',
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Both directions</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        And back again. Same architecture, opposite direction.
      </h2>
      <p className="text-cream-300 max-w-2xl mb-14 leading-relaxed">
        Same Swap API, same MulticallHandler, same settlement guarantees. When a Cash user wants to
        liquidate an Ethereum-side position back to USDC on their OP safe, the call is identical
        with input and output reversed. No second integration to build, no separate UX.
      </p>

      <div className="card-strong p-8 md:p-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-full bg-gold-500 text-[#1A140A] flex items-center justify-center font-serif text-base font-semibold">
                ↑
              </div>
              <div className="font-serif text-2xl text-cream-50">Outbound · Buy</div>
            </div>
            <div className="text-sm text-cream-400 mb-5">Cash safe on OP → Ethereum vault</div>
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
                ↓
              </div>
              <div className="font-serif text-2xl text-cream-50">Return · Sell</div>
            </div>
            <div className="text-sm text-cream-400 mb-5">Ethereum vault → Cash safe on OP</div>
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
    'Ethereum vault contract',
    'UI abstraction across both safes',
    'KYC routing for permissioned assets',
    'Position accounting and yield display',
  ];
  const across = [
    'Cross-chain routing and swap execution',
    '40+ independent relayers',
    'SpokePool contracts, audited',
    'MulticallHandler for embedded actions',
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
            Four contracts and a UI. Familiar territory.
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
            Ten layers of cross-chain infrastructure. Live, audited, $35B+ proven.
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyAcross() {
  const features = [
    { t: 'Speed', d: 'Sub-2 second median fill time across all routes. Fastest in the category.' },
    { t: 'Cost', d: 'Lowest fees in the category, verifiable on-chain. Cash users keep more of their swap.' },
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
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-14 max-w-3xl tracking-tightest leading-[1.05]">
        The infrastructure under the cross-chain layer.
      </h2>

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

function CostVsAlternatives() {
  const benchRows = [
    {
      tag: 'USDC',
      title: 'Optimism → Ethereum',
      rows: [
        { name: 'Across', cost: '$0.014', detail: '1.4 bps · ~2s', badge: 'LOWEST' },
        { name: 'Relay', cost: '$0.048', detail: '4.8 bps · ~3s', badge: '3.4×' },
        { name: 'Li.Fi', cost: '$0.241', detail: '24.1 bps · ~4s', badge: 'AGG' },
        { name: 'deBridge', cost: '$2.87', detail: '287 bps · 30-90s', badge: '205×' },
      ],
    },
    {
      tag: 'USDC → sDAI',
      title: 'Optimism → Ethereum',
      rows: [
        { name: 'Across', cost: '$0.022', detail: '2.2 bps · ~2s', badge: 'LOWEST' },
        { name: 'Relay', cost: '$0.064', detail: '6.4 bps · ~3s', badge: '2.9×' },
        { name: 'Li.Fi', cost: '$0.288', detail: '28.8 bps · ~5s', badge: 'AGG' },
        { name: 'deBridge', cost: 'Unsupported', detail: '·', badge: '' },
      ],
    },
    {
      tag: 'USDC → sUSDe',
      title: 'Optimism → Ethereum',
      rows: [
        { name: 'Across', cost: '$0.024', detail: '2.4 bps · ~2s', badge: 'LOWEST' },
        { name: 'Relay', cost: '$0.071', detail: '7.1 bps · ~3s', badge: '2.96×' },
        { name: 'Li.Fi', cost: '$0.301', detail: '30.1 bps · ~5s', badge: 'AGG' },
        { name: 'deBridge', cost: 'Unsupported', detail: '·', badge: '' },
      ],
    },
    {
      tag: 'USDC → weETH',
      title: 'Optimism → Ethereum',
      rows: [
        { name: 'Across', cost: '$0.026', detail: '2.6 bps · ~2s', badge: 'LOWEST' },
        { name: 'Relay', cost: '$0.082', detail: '8.2 bps · ~3s', badge: '3.15×' },
        { name: 'Li.Fi', cost: '$0.295', detail: '29.5 bps · ~5s', badge: 'AGG' },
        { name: 'deBridge', cost: 'Unsupported', detail: '·', badge: '' },
      ],
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Cost vs alternatives</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        Cheapest on every route Cash needs.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-14 leading-relaxed">
        Live benchmark on the routes that matter for Cash: Optimism out to Ethereum, in stablecoins
        and yield assets. Across is the lowest cost on every one.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {benchRows.map((row) => (
          <div key={row.tag} className="card p-7">
            <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-white/[0.06]">
              <div>
                <div className="text-xs uppercase tracking-widest text-cream-400 mb-1">
                  {row.tag} · $100
                </div>
                <div className="text-sm text-cream-200 font-serif text-base">{row.title}</div>
              </div>
            </div>
            <div className="space-y-3">
              {row.rows.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={i === 0 ? 'font-semibold text-cream-50' : 'text-cream-300'}>
                      {r.name}
                    </span>
                    {r.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          r.badge === 'LOWEST'
                            ? 'bg-gold-500/15 text-gold-400'
                            : 'bg-bg-500 text-cream-400'
                        }`}
                      >
                        {r.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-right tabular">
                    <div className={i === 0 ? 'text-cream-50 font-semibold' : 'text-cream-300'}>
                      {r.cost}
                    </div>
                    <div className="text-[11px] text-cream-400">{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-cream-500 mt-6 leading-relaxed">
        Source: Across internal benchmark, May 2026. All-in cost includes bridge fee, protocol fee,
        and price impact. Live quotes against each protocol's public API, normalized to $100 input.
      </p>
    </section>
  );
}

// ether.fi cash-relevant chains (highlighted) — others are standard coverage
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
      <div className="eyebrow mb-4">Trusted by</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-14 max-w-3xl tracking-tightest leading-[1.05]">
        The leaders of crypto already ship Across.
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

function Credentials() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="eyebrow mb-4">Ready to integrate</div>
      <h2 className="font-serif text-5xl md:text-6xl gold-text mb-6 max-w-3xl tracking-tightest leading-[1.05]">
        ether.fi's production credentials.
      </h2>
      <p className="text-cream-300 max-w-3xl mb-14 leading-relaxed">
        Pre-provisioned by the Across team for ether.fi. Use these in any environment, from local
        builds to production deployments. Volume attributes back to ether.fi automatically.{' '}
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
          value="acx_oVArKo8JzULZIcCJfTDjr6B7ab9J0yM2"
          description="Pass as a Bearer token in the Authorization header."
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
          The PoC is already running.
        </h2>
        <p className="text-cream-300 mb-10 max-w-2xl mx-auto leading-relaxed text-lg">
          The Cash safe view, with the Across Swap API wired into a new "Buy on Ethereum" flow.
          Live quotes, live execution, on-chain settlement.
        </p>
        <Link href="/cash" className="btn-gold inline-block">
          Open the live PoC →
        </Link>
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
