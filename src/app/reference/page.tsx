import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Integration Reference · ether.fi × Across',
  description:
    'How to wire Across\u2019s Swap API with embedded destination actions to access market-maker and DEX-aggregator liquidity from any supported origin chain.',
  openGraph: {
    title: 'Integration Reference · ether.fi × Across',
    description:
      'How to wire Across\u2019s Swap API for 1inch, 0x, Bebop, Paraswap, Odos, Kyberswap, Hashflow, or any custom router. One integration, N liquidity sources.',
    images: ['/etherfi-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Integration Reference · ether.fi × Across',
    description:
      'One Across integration, N liquidity sources. 1inch, 0x, Bebop, Paraswap, Odos, Kyberswap, or custom routers.',
    images: ['/etherfi-logo.png'],
  },
};

export default function ReferencePage() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Header />
      <WhatThisIs />
      <Flow />
      <Mapping />
      <Invariants />
      <Atomic />
      <AnyLiquiditySource />
      <Hardening />
      <FooterCTA />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(0,0,0,0.72)] border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
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
          <Link href="/" className="btn-ghost text-sm">
            Back to deck
          </Link>
          <Link href="/cash" className="btn-gold text-sm">
            Live demo &rarr;
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Header() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-20 pb-12">
      <div className="eyebrow mb-6">Integration reference · for ether.fi engineering</div>
      <h1 className="font-serif text-5xl md:text-6xl gold-text mb-6 tracking-tightest leading-[1.05]">
        How to wire Across&rsquo;s Swap API with embedded destination actions.
      </h1>
      <p className="text-cream-300 max-w-3xl leading-relaxed text-lg">
        A complete integration guide for routing USDC from a Cash safe on Optimism into any
        Ethereum-side liquidity source through the Across Swap API. The destination action
        framework is liquidity-source-agnostic: the same pattern wires into 1inch, 0x, Bebop
        RFQ, Paraswap, Odos, Kyberswap, or a custom contract. We use Bebop in the examples
        because it&rsquo;s what the mainnet PoC executed.
      </p>
    </section>
  );
}

function WhatThisIs() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">01 &middot; What this is</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        One Across integration, many liquidity sources.
      </h2>
      <p className="text-cream-300 leading-relaxed mb-4">
        Across&rsquo;s MulticallHandler contract (
        <code className="inline-code">0x924a9f036260DdD5808007E1AA95f08eD08aA569</code> on
        Ethereum) accepts arbitrary destination-side calls encoded in the deposit&rsquo;s{' '}
        <code className="inline-code">message</code> field. The Swap API constructs this
        message automatically when you pass an <code className="inline-code">actions[]</code>{' '}
        array in the POST body.
      </p>
      <p className="text-cream-300 leading-relaxed mb-4">
        Once you&rsquo;ve set up the Across leg, choosing which liquidity source executes on
        the destination is a runtime decision: quote multiple aggregators in parallel, pick the
        best output, drop into <code className="inline-code">actions[0]</code>. The pattern is
        identical across every source we&rsquo;ve tested.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-7">
        <div className="card p-5">
          <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-2">
            What ether.fi builds
          </div>
          <ul className="space-y-2 text-sm text-cream-200 leading-relaxed">
            <li>&#9670; Quote fetching from your chosen liquidity sources</li>
            <li>&#9670; Calldata decoder (single utility per source)</li>
            <li>&#9670; Mapping into Across <code className="inline-code">actions[]</code> schema</li>
            <li>&#9670; Wallet signing flow (you likely already have this)</li>
          </ul>
        </div>
        <div className="card p-5 border-gold-500/30 bg-gold-500/[0.03]">
          <div className="text-[10px] uppercase tracking-widest gold-text font-semibold mb-2">
            What Across delivers
          </div>
          <ul className="space-y-2 text-sm text-cream-200 leading-relaxed">
            <li>&#9670; Cross-chain routing (USDC OP &rarr; USDC Ethereum, ~2s)</li>
            <li>&#9670; MulticallHandler executes the destination call atomically</li>
            <li>&#9670; Atomic revert if the destination call fails</li>
            <li>&#9670; Single user signature for the entire flow</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Flow() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">02 &middot; End-to-end flow</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        Five steps, one user signature.
      </h2>
      <pre className="code-block">
{`User on Cash UI                          Liquidity source (1inch/Bebop/etc.)        Across API
       │                                              │                                  │
       │  1. GET swap quote                           │                                  │
       │     taker = MulticallHandler                 │                                  │
       │     receiver = user wallet                   │                                  │
       ├────────────────────────────────────────────► │                                  │
       │  ◄── calldata for destination swap ──────────│                                  │
       │                                              │                                  │
       │  2. Decode calldata into (target, fn, args)  │                                  │
       │                                                                                 │
       │  3. POST /swap/approval with actions[] payload                                  │
       ├─────────────────────────────────────────────────────────────────────────────────►
       │  ◄── deposit transaction calldata ──────────────────────────────────────────────│
       │                                                                                 │
       │  4. wallet.sendTransaction(deposit)                                             │
       ├─────────────────────────────────────────────────────────────────────────────────►
       │                                                                                 │
       │              ~2 seconds later, atomic on Ethereum:                              │
       │  5. USDC bridged → MulticallHandler → destination swap → user receives output   │`}
      </pre>
    </section>
  );
}

function Mapping() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">03 &middot; The mapping</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        Quote &rarr; Across actions schema.
      </h2>
      <p className="text-cream-300 leading-relaxed mb-5">
        Per Across&rsquo;s{' '}
        <a
          href="https://docs.across.to/introduction/embedded-actions/nested-parameters"
          target="_blank"
          rel="noreferrer"
          className="gold-text hover:underline"
        >
          nested parameters guide
        </a>
        , tuples in the <code className="inline-code">actions[].args[].value</code> field are
        passed as JSON arrays in ABI order. Worked example using Bebop&rsquo;s{' '}
        <code className="inline-code">swapSingle</code> (the function the PoC mainnet tx called):
      </p>

      <pre className="code-block">
{`function swapSingle(
  Single calldata order,           // 11-field tuple
  MakerSignature calldata sig,     // (bytes signatureBytes, uint256 signatureType)
  uint256 filledTakerAmount        // 0 for full fill
) external payable;

struct Single {
  uint256 expiry;
  address taker_address;     // must equal MulticallHandler
  address maker_address;
  uint256 maker_nonce;
  address taker_token;
  address maker_token;
  uint256 taker_amount;      // must equal Across expectedOutputAmount
  uint256 maker_amount;
  address receiver;          // user wallet or Cash safe
  uint256 packed_commands;
  uint256 flags;
}`}
      </pre>

      <p className="text-cream-300 leading-relaxed mt-5 mb-5">
        Mapped into the Across POST body:
      </p>

      <pre className="code-block">
{`{
  "actions": [{
    "target": "0xbbbbbBB520d69a9775E85b458C58c648259FAD5F",  // Bebop settlement
    "functionSignature": "function swapSingle((uint256,address,address,uint256,address,address,uint256,uint256,address,uint256,uint256),(bytes,uint256),uint256)",
    "args": [
      {
        "value": [
          "<expiry>",
          "<taker_address = MulticallHandler>",
          "<maker_address>",
          "<maker_nonce>",
          "<taker_token = USDC>",
          "<maker_token = Ondo GM token>",
          "<taker_amount = Across expectedOutputAmount>",
          "<maker_amount = output token amount>",
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
      { "value": "0", "populateDynamically": false }
    ],
    "value": "0",
    "isNativeTransfer": false,
    "populateCallValueDynamically": false
  }]
}`}
      </pre>

      <p className="text-cream-300 leading-relaxed mt-5">
        For 1inch, 0x, Paraswap, Odos, or Kyberswap, the pattern is identical. Only{' '}
        <code className="inline-code">target</code>,{' '}
        <code className="inline-code">functionSignature</code>, and{' '}
        <code className="inline-code">args[]</code> change. Each aggregator&rsquo;s swap
        endpoint takes a similar &ldquo;caller&rdquo; / &ldquo;receiver&rdquo; pair:
      </p>

      <pre className="code-block">
{`// 1inch v6
GET https://api.1inch.dev/swap/v6.0/1/swap
  ?src=<USDC>&dst=<output>&amount=<amount>
  &from=0x924a9f036260DdD5808007E1AA95f08eD08aA569   // MulticallHandler
  &receiver=<user wallet>
  &slippage=1

// 0x
GET https://api.0x.org/swap/v1/quote
  ?sellToken=<USDC>&buyToken=<output>&sellAmount=<amount>
  &takerAddress=0x924a9f036260DdD5808007E1AA95f08eD08aA569

// Bebop
GET https://api.bebop.xyz/pmm/ethereum/v3/quote
  ?sell_tokens=<USDC>&buy_tokens=<output>&sell_amounts=<amount>
  &taker_address=0x924a9f036260DdD5808007E1AA95f08eD08aA569
  &receiver_address=<user wallet>`}
      </pre>
    </section>
  );
}

function Invariants() {
  const items: [string, string][] = [
    [
      'caller / taker / from = MulticallHandler',
      'On-chain, MulticallHandler is the msg.sender for the destination call. If the liquidity source\u2019s quote was built for a different address, the call reverts. Pass MulticallHandler in the quote request.',
    ],
    [
      'destination output amount = Across expectedOutputAmount',
      'The Across leg delivers exactly expectedOutputAmount USDC to MulticallHandler. The destination swap must consume exactly that. For RFQ orders (Bebop, Hashflow), the maker signature locks the amount; for AMM aggregators (1inch, 0x), the amount is bound by the swap parameters.',
    ],
    [
      'receiver = end-user wallet (or Cash safe)',
      'This is where the output token lands. Not MulticallHandler. Set in the quote request.',
    ],
    [
      'ABI tuple field order is exact',
      'For nested tuples, the value array must follow the on-chain ABI ordering, not the JSON object ordering returned by the quote API. Always decode the returned calldata to verify field order.',
    ],
    [
      'populateDynamically: false for RFQ orders',
      'A maker signature is over the exact amounts. Dynamic balance population would invalidate it. AMM aggregators can use dynamic population if their swap function supports it.',
    ],
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">04 &middot; Invariants</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        Five things that must hold.
      </h2>
      <p className="text-cream-300 leading-relaxed mb-7">
        If any of these are violated at execution time, MulticallHandler reverts the entire fill
        atomically (see next section). No partial state, no stuck funds. Worth wiring as
        explicit checks in your build pipeline.
      </p>
      <div className="space-y-3">
        {items.map(([title, desc], i) => (
          <div key={title} className="card p-5 flex gap-4">
            <div className="font-serif text-2xl gold-text tabular leading-none flex-shrink-0 w-8">
              {String(i + 1).padStart(2, '0')}
            </div>
            <div>
              <div className="font-semibold text-cream-50 text-sm mb-1">{title}</div>
              <div className="text-sm text-cream-300 leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Atomic() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">05 &middot; Atomic-fail guarantee</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        Either all of it executes, or none of it does.
      </h2>
      <p className="text-cream-300 leading-relaxed mb-4">
        If any of the destination invariants are violated at execution time,
        MulticallHandler&rsquo;s{' '}
        <code className="inline-code">handleV3AcrossMessage</code> reverts the entire fill. The
        relayer&rsquo;s <code className="inline-code">fillV3Relay</code> transaction reverts.
        The user&rsquo;s USDC stays on the origin chain and is refunded after the
        <code className="inline-code">fillDeadline</code> (default 6 hours).
      </p>
      <p className="text-cream-300 leading-relaxed">
        No partial state. No stuck funds at MulticallHandler. Materially safer than a sequential
        &ldquo;bridge first, then swap&rdquo; architecture, where a failed swap leaves bridged
        funds stranded at the destination.
      </p>
    </section>
  );
}

function AnyLiquiditySource() {
  const sources: { name: string; note: string }[] = [
    {
      name: '1inch',
      note: 'Their swap endpoint returns calldata for the aggregated route, including Fusion RFQ orders where MMs sit alongside AMMs.',
    },
    {
      name: '0x / Matcha',
      note: 'The Swap API returns ABI-decodable calldata for RFQ-T orders alongside on-chain liquidity.',
    },
    {
      name: 'Bebop RFQ',
      note: 'The PoC reference implementation. Strongest fit for tokenized equities like Ondo GM because MMs are Ondo-approved holders.',
    },
    {
      name: 'Paraswap',
      note: 'Multi-DEX aggregator with similar swap-calldata semantics. Plug-and-play.',
    },
    {
      name: 'Odos / Kyberswap',
      note: 'Aggregators with their own routing engines. Same actions[] integration shape.',
    },
    {
      name: 'Hashflow',
      note: 'RFQ-only network. Good for sourcing institutional MM inventory on majors.',
    },
    {
      name: 'Custom router',
      note: 'Your own contract on the destination chain. Use this for Path C (vault + Ondo onboarding) when you want primary-mint access.',
    },
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">06 &middot; Liquidity sources</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        Any source, same pattern.
      </h2>
      <p className="text-cream-300 leading-relaxed mb-7">
        Sources we&rsquo;ve verified work cleanly with the actions[] pattern. Hold multiple
        integrations, quote in parallel, route per-trade to the best output. One bridge
        integration, N liquidity sources.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((s) => (
          <div key={s.name} className="card p-5">
            <div className="font-semibold text-cream-50 mb-1">{s.name}</div>
            <div className="text-sm text-cream-300 leading-relaxed">{s.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hardening() {
  const items = [
    'Cache quotes per-user with short TTL (15-30s). Quotes expire.',
    'Refresh RFQ quotes if user delays signing. Bebop and Hashflow quotes typically last ~60s.',
    'Quote multiple liquidity sources in parallel; pick the winner before constructing the deposit.',
    'Surface fees clearly. Across LP + relayer + destination gas. RFQ legs have zero slippage on the quoted amount; AMM legs have slippage tolerance you set.',
    'Show users the recipient address; offer choice between user wallet and Cash safe.',
    'Geo-restrict per asset jurisdiction policy where applicable (e.g. Ondo GM is APAC, Africa, LatAm currently).',
    'Track deposits via Across /deposit/status for confirmation UX.',
    'Handle the refund path if fillDeadline is reached without a fill. Rare but possible during extreme network conditions.',
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">07 &middot; Production hardening</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        Checklist for the real integration.
      </h2>
      <p className="text-cream-300 leading-relaxed mb-7">
        Beyond what the reference script demonstrates, here&rsquo;s what we&rsquo;d recommend
        for ether.fi&rsquo;s production integration.
      </p>
      <div className="card-strong p-7">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-cream-200 leading-relaxed">
              <span className="text-gold-400 mt-1 flex-shrink-0">&#9670;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <div className="card-strong p-10 md:p-12 text-center">
        <h2 className="font-serif text-3xl md:text-4xl gold-text mb-4 tracking-tightest">
          Ready to integrate.
        </h2>
        <p className="text-cream-300 mb-7 max-w-2xl mx-auto leading-relaxed">
          Runnable reference script, on-chain mainnet proof, and full Across docs. Ping us on
          a call when you&rsquo;re ready and we&rsquo;ll walk through specifics for ether.fi
          Cash.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/cash" className="btn-gold inline-block">
            Open the live PoC &rarr;
          </Link>
          <a
            href="https://github.com/bitc0x/etherfi-cash-across-poc/blob/main/scripts/path-a-reference.ts"
            target="_blank"
            rel="noreferrer"
            className="btn-outline-gold inline-block"
          >
            View the script &rarr;
          </a>
          <a
            href="https://docs.across.to"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost inline-block"
          >
            Across docs &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-10">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-cream-500">
          ether.fi × Across &middot; Integration reference
        </div>
        <div className="flex gap-4 text-xs text-cream-400">
          <Link href="/" className="hover:text-cream-100">
            Deck
          </Link>
          <Link href="/cash" className="hover:text-cream-100">
            Live PoC
          </Link>
          <a
            href="https://docs.across.to"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cream-100"
          >
            Across docs
          </a>
        </div>
      </div>
    </footer>
  );
}
