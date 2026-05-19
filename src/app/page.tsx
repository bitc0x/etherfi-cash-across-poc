import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(10,13,17,0.72)] border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Image src="/etherfi-logo.png" alt="ether.fi" width={28} height={28} className="rounded-full" />
              <span className="font-semibold text-[15px]">ether.fi</span>
            </div>
            <span className="text-haze-500 text-sm">×</span>
            <div className="flex items-center gap-2">
              <Image src="/across-logo.png" alt="Across" width={28} height={28} />
              <span className="font-semibold text-[15px]">Across</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <a href="https://docs.across.to" target="_blank" rel="noreferrer" className="btn-ghost text-sm">
              Docs
            </a>
            <Link href="/cash" className="btn-mint text-sm">
              Live demo →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="eyebrow mb-5">Integration proposal · ether.fi Cash</div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tightest leading-[1.02] mb-6 max-w-4xl">
          Cash, anywhere.
          <br />
          <span className="text-mint-500">Any Ethereum asset.</span>
        </h1>
        <p className="text-lg md:text-xl text-haze-300 max-w-2xl mb-10 leading-relaxed">
          Cash users hold USDC in a safe on Optimism. The assets they want, Ondo stocks, sUSDe,
          weETH, anything Ethereum-only, live on Ethereum. Plug in Across, and one signature in
          Cash routes USDC out, settles on Ethereum in roughly 2 seconds, and deposits into the
          target asset atomically. No second tab, no manual bridge.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/cash" className="btn-mint">
            Try the live PoC →
          </Link>
          <a href="#unlock" className="btn-ghost">
            What ether.fi gets
          </a>
        </div>
      </section>

      {/* Stat strip */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '$35B+', label: 'Total volume bridged' },
            { value: '<2s', label: 'Median fill time' },
            { value: '40+', label: 'Independent relayers' },
            { value: '40+ apps', label: 'Live integrations' },
          ].map((s) => (
            <div key={s.label} className="card p-6">
              <div className="text-3xl md:text-4xl font-bold tracking-tight tabular text-mint-500">
                {s.value}
              </div>
              <div className="text-sm text-haze-400 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Unlock pillars */}
      <section id="unlock" className="max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow mb-4">What ether.fi unlocks</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest mb-4 max-w-3xl">
          One safe on Optimism. Every yield-bearing asset on Ethereum.
        </h2>
        <p className="text-haze-400 max-w-2xl mb-12">
          Wire the Across Swap API into the Cash safe. No second product, no manual bridge UX. Cash
          users sell USDC on OP, buy any Ethereum asset, and the deposit lands in their Ethereum
          vault as a single transaction.
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              n: '01',
              tag: 'Asset universe',
              h: 'Every Ethereum asset, reachable from Cash.',
              p: "Today, Cash can't hold Ondo's tokenized stocks, sUSDe, weETH, USDS, or anything else Ethereum-only. Across closes that gap. The Swap API routes USDC on OP into the target asset on Ethereum via 0x, Uniswap, and LI.FI, and embedded actions deposit it into your Ethereum vault in the same transaction.",
            },
            {
              n: '02',
              tag: 'Single signature',
              h: 'One tx. No manual bridge. No leaving Cash.',
              p: "User signs once. Across settles in roughly 2 seconds, deposits into the destination vault atomically. Return leg is symmetric: vault sells, USDC lands back in the OP safe. Same card, same session, same brand.",
            },
            {
              n: '03',
              tag: 'Revenue',
              h: 'Monetize every cross-chain swap.',
              p: "appFee on the Swap API lets ether.fi take a configurable cut of every cross-chain trade, on top of standard Cash fees. New revenue line, zero engineering on the take-rate side.",
            },
          ].map((c) => (
            <div key={c.n} className="card p-7 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="text-3xl font-bold tabular text-mint-500">{c.n}</div>
                <div className="text-[11px] uppercase tracking-widest text-haze-500">{c.tag}</div>
              </div>
              <h3 className="text-xl font-semibold mb-3 leading-tight">{c.h}</h3>
              <p className="text-haze-400 text-sm leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Embedded actions deep-dive */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="card-strong p-8 md:p-12">
          <div className="eyebrow mb-4">Embedded actions</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tightest mb-4 max-w-2xl">
            One signature in Cash. Deposit on Ethereum.
          </h2>
          <p className="text-haze-400 max-w-2xl mb-10">
            Across destination actions let a user on OP deposit straight into an Ethereum vault in
            one transaction. No second approval. No idle capital. No bridge UX to maintain.
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { i: '1', t: 'Step 1', d: 'User holds USDC in the Cash safe on Optimism.' },
              { i: '2', t: 'Step 2', d: 'Selects an Ethereum asset (Ondo, sUSDe, weETH, ...).' },
              { i: '3', t: 'Step 3', d: 'Across routes, fills, and deposits into the Ethereum vault atomically.' },
              { i: '✓', t: 'Result', d: 'Position live on Ethereum. One signature. Roughly 2s.' },
            ].map((s, idx) => (
              <div
                key={s.i}
                className={`relative card p-5 ${idx === 3 ? 'border-mint-500/40' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold mb-4 ${
                    idx === 3 ? 'bg-mint-500 text-[#062119]' : 'bg-ink-700 text-haze-200'
                  }`}
                >
                  {s.i}
                </div>
                <div className="text-[11px] uppercase tracking-widest text-haze-500 mb-2">
                  {s.t}
                </div>
                <div className="text-sm text-haze-200 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Across */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow mb-4">Why Across</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest mb-12 max-w-3xl">
          The infrastructure under the cross-chain layer.
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              t: 'Speed',
              d: 'Sub-2 second median fill time across all routes. Fastest in the category.',
            },
            {
              t: 'Cost',
              d: 'Lowest fees in the category, verifiable on-chain. Cash users keep more of their swap.',
            },
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
          ].map((f) => (
            <div key={f.t} className="card p-6">
              <div className="text-mint-500 text-sm font-semibold mb-3">{f.t}</div>
              <p className="text-haze-300 text-sm leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Track record */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow mb-4">Track record</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest mb-4 max-w-3xl">
          Zero exploits. Zero downtime. Zero compromise.
        </h2>
        <p className="text-haze-400 max-w-3xl mb-12 leading-relaxed">
          Bridges have lost over $2.9 billion to exploits in the last four years. Across has lost
          none. Not luck, architecture. Users receive canonical assets, never wrapped
          representations. Relayers front capital and bear the transfer risk. Settlement is verified
          by the UMA optimistic oracle. The system stays secure with just one honest participant.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: '$35B+', l: 'Bridged across all chains' },
            { v: '0', l: 'Exploits since launch' },
            { v: '0', l: 'User funds ever lost' },
            { v: 'UMA', l: 'Optimistic-oracle settled' },
          ].map((s) => (
            <div key={s.l} className="card p-6">
              <div className="text-3xl md:text-4xl font-bold tracking-tight tabular text-mint-500">
                {s.v}
              </div>
              <div className="text-sm text-haze-400 mt-2">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cost vs alternatives */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow mb-4">Cost vs alternatives</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest mb-4 max-w-3xl">
          Cheapest on every route Cash needs.
        </h2>
        <p className="text-haze-400 max-w-3xl mb-12 leading-relaxed">
          Live benchmark on the routes that matter for Cash: Optimism out to Ethereum, in
          stablecoins and yield assets. Across is the lowest cost on every one.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {benchRows.map((row) => (
            <div key={row.title} className="card p-6">
              <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-white/[0.06]">
                <div>
                  <div className="text-xs uppercase tracking-widest text-haze-500 mb-1">
                    {row.tag} · $100
                  </div>
                  <div className="text-sm text-haze-200">{row.title}</div>
                </div>
              </div>
              <div className="space-y-3">
                {row.rows.map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={i === 0 ? 'font-semibold text-white' : 'text-haze-300'}>
                        {r.name}
                      </span>
                      {r.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            r.badge === 'LOWEST'
                              ? 'bg-mint-500/15 text-mint-500'
                              : r.badge === 'SPONSORED'
                                ? 'bg-mint-500 text-[#062119]'
                                : 'bg-ink-700 text-haze-400'
                          }`}
                        >
                          {r.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-right tabular">
                      <div className={i === 0 ? 'text-white font-semibold' : 'text-haze-300'}>
                        {r.cost}
                      </div>
                      <div className="text-[11px] text-haze-500">{r.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-haze-500 mt-6 leading-relaxed">
          Source: Across internal benchmark, May 2026. All-in cost includes bridge fee, protocol
          fee, and price impact. Live quotes against each protocol's public API, normalized to $100
          input.
        </p>
      </section>

      {/* Coverage */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow mb-4">Coverage</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest mb-4 max-w-3xl">
          Live on every chain Cash users hold capital.
        </h2>
        <p className="text-haze-400 max-w-3xl mb-12 leading-relaxed">
          Across natively supports Optimism (where Cash lives) and Ethereum (where the asset
          universe lives). Plus every other major chain a future Cash deployment might touch.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {chains.map((c) => (
            <div key={c.slug} className="card p-4 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://alexandria-blond.vercel.app/assets/chains/${c.slug}.svg`}
                alt={c.name}
                className="w-7 h-7"
              />
              <span className="text-xs text-haze-200">{c.name}</span>
              {c.cash && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-mint-500/15 text-mint-500 font-semibold tracking-wider">
                  CASH
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Trusted by */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow mb-4">Trusted by</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest mb-12 max-w-3xl">
          The leaders of crypto already ship Across.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {partners.map((p, i) => (
            <div
              key={p.name}
              className="group relative overflow-hidden card aspect-[2.2/1] flex items-center justify-center transition-all duration-300 hover:border-mint-500/30 hover:-translate-y-0.5"
              style={{
                background:
                  i % 2 === 0
                    ? 'linear-gradient(135deg, rgba(15,19,24,0.9), rgba(20,25,33,0.6))'
                    : 'linear-gradient(135deg, rgba(20,25,33,0.6), rgba(15,19,24,0.9))',
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 120%, rgba(72,229,194,0.10), transparent 60%)',
                }}
              />
              <div className="relative flex items-center gap-3 px-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo} alt={p.name} className="h-10 w-10 object-contain" />
                <span className="text-base font-semibold tracking-tight text-haze-100">
                  {p.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Credentials */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow mb-4">Ready to integrate</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest mb-4 max-w-3xl">
          ether.fi's production credentials.
        </h2>
        <p className="text-haze-400 max-w-3xl mb-12 leading-relaxed">
          Pre-provisioned by the Across team for ether.fi. Use these in any environment, from local
          builds to production deployments. Volume attributes back to ether.fi automatically.{' '}
          <a
            href="https://docs.across.to"
            target="_blank"
            rel="noreferrer"
            className="text-mint-500 hover:underline"
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

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="card-strong p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tightest mb-4">
            The PoC is already running.
          </h2>
          <p className="text-haze-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            The Cash safe view, with the Across Swap API wired into a new "Buy on Ethereum" flow.
            Live quotes, live execution, on-chain settlement.
          </p>
          <Link href="/cash" className="btn-mint inline-block">
            Open the live PoC →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-20">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-haze-500">
          <div>Built for ether.fi by Across. Risk Labs, 2026.</div>
          <div className="flex items-center gap-5">
            <a href="https://across.to" target="_blank" rel="noreferrer" className="hover:text-haze-200">
              across.to
            </a>
            <a href="https://docs.across.to" target="_blank" rel="noreferrer" className="hover:text-haze-200">
              docs.across.to
            </a>
            <a
              href="https://x.com/AcrossProtocol"
              target="_blank"
              rel="noreferrer"
              className="hover:text-haze-200"
            >
              @AcrossProtocol
            </a>
          </div>
        </div>
      </footer>
    </main>
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
    <div className="card p-6">
      <div className="text-xs uppercase tracking-widest text-haze-500 mb-3">{label}</div>
      <p className="text-sm text-haze-400 mb-4 leading-relaxed">{description}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-ink-850 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-mint-500 font-mono break-all">
          {value}
        </code>
        <button
          className="btn-ghost text-xs whitespace-nowrap"
          // eslint-disable-next-line react/no-unknown-property
          {...({ 'data-copy': value } as any)}
        >
          Copy
        </button>
      </div>
    </div>
  );
}

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

const partners = [
  { name: 'Circle', logo: '/circle-logo.png' },
  { name: 'Coinbase', logo: '/coinbase-logo.png' },
  { name: 'Uniswap', logo: '/uniswap-logo.png' },
  { name: 'MetaMask', logo: '/metamask-logo.png' },
  { name: 'PancakeSwap', logo: '/pancakeswap-logo.png' },
  { name: 'Hyperbeat', logo: '/hyperbeat-logo.png' },
];

const chains = [
  { name: 'Optimism', slug: 'optimism', cash: true },
  { name: 'Ethereum', slug: 'mainnet', cash: true },
  { name: 'Arbitrum', slug: 'arbitrum', cash: false },
  { name: 'Base', slug: 'base', cash: false },
  { name: 'Polygon', slug: 'polygon', cash: false },
  { name: 'Unichain', slug: 'unichain', cash: false },
  { name: 'Linea', slug: 'linea', cash: false },
  { name: 'Blast', slug: 'blast', cash: false },
  { name: 'Mode', slug: 'mode', cash: false },
  { name: 'BNB Chain', slug: 'bsc', cash: false },
  { name: 'Solana', slug: 'solana', cash: false },
  { name: 'Hyperliquid', slug: 'hyperevm', cash: false },
];
