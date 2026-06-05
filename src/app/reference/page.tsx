import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Integration Reference · ether.fi × Across',
  description:
    'How to wire Across\u2019s Swap API with embedded destination actions. Three sources wired in the PoC: Bebop RFQ, 1inch Aggregation, 1inch Fusion. Same pattern extends to any contract.',
  openGraph: {
    title: 'Integration Reference · ether.fi × Across',
    description:
      'Sign once. Declare the outcome. Across does the rest. Three destination sources wired today: Bebop RFQ, 1inch Aggregation, 1inch Fusion.',
    images: ['/etherfi-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Integration Reference · ether.fi × Across',
    description:
      'Sign once. Declare the outcome. Across does the rest. Three destination sources wired today: Bebop RFQ, 1inch Aggregation, 1inch Fusion.',
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
      <AsyncPattern />
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
      <p className="text-cream-300 max-w-3xl leading-relaxed text-lg mb-5">
        A complete integration guide for routing USDC from a Cash safe on Optimism into any
        Ethereum-side liquidity source through the Across Swap API. The user signs once and
        declares the minimum acceptable output; Across handles routing plus whatever destination
        action completes the trade.
      </p>
      <p className="text-cream-300 max-w-3xl leading-relaxed text-lg">
        Three sources wired in the live PoC today: <span className="text-cream-100">Bebop RFQ,
        1inch Aggregation, 1inch Fusion</span>. Same pattern extends to 0x, Paraswap, Odos,
        Kyberswap, Hashflow, or a custom router. ether.fi picks the source per trade without
        ever touching the cross-chain layer.
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
        array in the POST body. Canonical Across reference for the{' '}
        <code className="inline-code">/swap/approval</code> endpoint:{' '}
        <a
          href="https://docs.across.to/api-reference/swap/approval/post"
          target="_blank"
          rel="noreferrer"
          className="gold-text hover:underline font-semibold"
        >
          docs.across.to/api-reference/swap/approval/post
        </a>
        .
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
      <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] px-4 py-3 mb-5 text-sm text-cream-200 leading-relaxed">
        <span className="font-semibold gold-text">Synchronous-source path.</span> This section
        describes the atomic flow that applies to <span className="text-cream-100">Bebop, 1inch
        Aggregation, 0x, Paraswap, Odos, Kyberswap, Hashflow</span>, and any custom router
        invoked via MulticallHandler. For <span className="text-cream-100">1inch Fusion</span>{' '}
        (async limit-order pattern), see section 07.
      </div>
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
      'For Bebop, Hashflow, and other RFQ sources, the market maker signs an order that commits to a specific filledTakerAmount. If you set populateDynamically: true, MulticallHandler would overwrite that field at execution time with the actual USDC balance it received, which no longer matches what the MM signed, and the order rejects on signature verification. Keep it false for RFQ. AMM aggregators (1inch Aggregation, Uniswap V3 router) can use dynamic population if the called function supports it, since AMMs price off pool state rather than a signed quote.',
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
        The user&rsquo;s USDC stays on the origin chain and is refunded to{' '}
        <code className="inline-code">fallbackRecipient</code> after the{' '}
        <code className="inline-code">fillDeadline</code> (Across&rsquo;s{' '}
        <code className="inline-code">/swap/approval</code> currently returns ~2 hours from
        deposit time by default; integrator-configurable).
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
      name: '1inch Aggregation',
      note: 'Multi-DEX routing across AMMs and PMMs. Atomic via the Aggregation Router v6 (0x111111125421cA6dc452d289314280a0f8842A65) on Ethereum. For Ondo GM tokens, 1inch typically routes through Bebop as one of its PMM sources, so the headline price is roughly equivalent to going to Bebop directly. Value lies in fallback diversification and broader coverage for assets Bebop doesn\u2019t quote. Wired in the PoC.',
    },
    {
      name: '1inch Fusion',
      note: 'Intent-based limit orders filled by resolvers via Dutch auction. Async pattern: Across delivers USDC to user wallet, user signs an EIP-712 order, resolver fills within auction window. Routes Ondo GM tokens during US market hours (Mon-Fri 9:30-16:00 EST) via the Ondo x 1inch partnership. Wired in the PoC.',
    },
    {
      name: 'Bebop RFQ',
      note: 'The PoC reference implementation. Strongest fit for tokenized equities like Ondo GM because MMs are Ondo-approved primary holders, so they quote 24/7 regardless of TradFi market hours. Wired in the PoC.',
    },
    {
      name: '0x / Matcha',
      note: 'The Swap API returns ABI-decodable calldata for RFQ-T orders alongside on-chain liquidity.',
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

function AsyncPattern() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">07 &middot; Async pattern</div>
      <h2 className="font-serif text-3xl md:text-4xl gold-text mb-5 tracking-tightest">
        When the liquidity source is intent-based.
      </h2>
      <p className="text-cream-300 leading-relaxed mb-5">
        Most destination liquidity sources (Bebop, 1inch Aggregation, 0x, Paraswap) are atomic:
        the swap calldata sits inside a MulticallHandler{' '}
        <code className="inline-code">actions[]</code> entry and executes in the same fill as
        the Across deposit. One signature, ~2 seconds, done. The user declares minimum output
        via the deposit&rsquo;s <code className="inline-code">minOutputAmount</code> plus the
        action&rsquo;s own slippage tolerance.
      </p>
      <p className="text-cream-300 leading-relaxed mb-5">
        Intent-based sources like 1inch Fusion work differently. The user signs an EIP-712 limit
        order off-chain and a whitelisted resolver fills it via a Dutch auction. Across&rsquo;s
        role is reduced to <span className="text-cream-100">reliable USDC delivery to the
        user&rsquo;s Ethereum wallet</span> &mdash; no embedded action needed. The Fusion order
        then settles independently once USDC has arrived. Min output is enforced inside the
        order&rsquo;s <code className="inline-code">auctionEndAmount</code>: resolvers cannot
        fill below it. Partial and multiple fills are{' '}
        <span className="text-cream-100">disabled at order construction</span> (
        <code className="inline-code">allowPartialFills: false</code>,{' '}
        <code className="inline-code">allowMultipleFills: false</code>) to match ether.fi&rsquo;s
        no-partial-fills requirement on the destination swap leg &mdash; the resolver either
        fills the entire <code className="inline-code">makingAmount</code> in one shot, or the
        order expires unfilled.
      </p>
      <p className="text-cream-300 leading-relaxed mb-5">
        This is two user signatures total: one for the Across deposit transaction on Optimism,
        one for the EIP-712 Fusion order on Ethereum. Plus one-time ERC20 approvals at first
        use. The PoC captures{' '}
        <span className="text-cream-100">both signatures back-to-back upfront</span>{' '}
        (Option A Level 1 sequential UX), then runs the Across delivery and Fusion submission
        headless with no user interaction in between. From the user&rsquo;s perspective: two
        wallet prompts in immediate succession, then a single &ldquo;bridging and filling&rdquo;
        progress state until the output token lands.
      </p>
      <p className="text-cream-300 leading-relaxed mb-5">
        The amount-drift risk that argues against signing upfront is mitigated by building the
        Fusion order against Across&rsquo;s guaranteed delivery floor (
        <code className="inline-code">swapResp.minOutputAmount</code>), not the
        <code className="inline-code">expectedOutputAmount</code>. By Across&rsquo;s atomic-fail
        contract, what arrives is always{' '}
        <code className="inline-code">&ge; minOutputAmount</code> (or the deposit reverts and
        refunds). So the resolver always has enough USDC to fill against{' '}
        <code className="inline-code">order.makingAmount = minOutputAmount</code>; any positive
        delta between expected and actual stays in the user&rsquo;s Ethereum wallet as small
        residual. The order&rsquo;s{' '}
        <code className="inline-code">auctionEndAmount</code> still enforces the user&rsquo;s
        minimum acceptable output token: resolvers cannot fill below it.
      </p>
      <p className="text-cream-300 leading-relaxed mb-5">
        Note for smart-wallet and EIP-7702 users: on Coinbase Smart Wallet, Safe, Argent,
        ZeroDev, any other EIP-5792-capable smart account, or any EOA that has delegated to a
        7702-compatible implementation (MetaMask post-Pectra, Rabby, and a growing list), the
        USDC OP approval and Across deposit can be batched into a single prompt via{' '}
        <code className="inline-code">wallet_sendCalls</code>, collapsing the flow to
        effectively one user interaction (the bundled OP-side batch, then the Ethereum-side
        Fusion signature). The PoC ships the Level 1 sequential path that works with vanilla
        EOAs today; the Level 2 batched path is a drop-in upgrade behind a{' '}
        <code className="inline-code">wallet_getCapabilities</code> feature detection.
      </p>

      {/* SDK install + package callout - engineers want exact npm command */}
      <div className="rounded-xl border border-white/[0.05] bg-bg-700/40 p-4 mb-7">
        <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-2">
          Fusion SDK package
        </div>
        <pre className="code-block !mb-2">{`npm install @1inch/fusion-sdk@2`}</pre>
        <div className="text-[11px] text-cream-400 leading-snug">
          NOT <code className="inline-code">@1inch/cross-chain-sdk</code> &mdash; that&rsquo;s
          Fusion+ for cross-chain swaps. We don&rsquo;t need it here because Across handles the
          cross-chain leg and Fusion runs the Ethereum-side swap only. Used server-side in the
          PoC (kept off the client bundle) to construct the EIP-712 order from quotes; the
          client signs via viem&rsquo;s <code className="inline-code">signTypedData</code>.
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.05] bg-bg-700/40 p-5 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-3">
          User-facing flow (Fusion path)
        </div>
        <ol className="space-y-2.5 text-sm text-cream-200">
          <li className="flex gap-3">
            <span className="text-gold-300 font-mono tabular flex-shrink-0">1</span>
            <span>
              <span className="text-cream-100 font-semibold">Pre-flight allowances (one-time per user).</span>{' '}
              USDC OP &rarr; Across SpokePool on Optimism (for the bridge leg), and USDC ETH &rarr;
              1inch Aggregation Router v6 at{' '}
              <code className="inline-code">0x111111125421cA6dc452d289314280a0f8842A65</code>{' '}
              on Ethereum (so the Fusion resolver can pull USDC during fill). The PoC uses
              standard ERC20 <code className="inline-code">approve()</code> transactions. USDC on
              Ethereum mainnet (Circle&rsquo;s FiatTokenV2.2) does support EIP-2612 permit
              (DOMAIN_SEPARATOR + nonces verified on-chain), so a production integration can
              batch the allowance grant into a signature via the Fusion order&rsquo;s{' '}
              <code className="inline-code">permit</code> field instead. We kept the explicit
              approve in the PoC for clarity.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold-300 font-mono tabular flex-shrink-0">2</span>
            <span>
              <span className="text-cream-100 font-semibold">Prepare both legs upfront.</span>{' '}
              No user signature yet. Fetch the Across deposit calldata via{' '}
              <code className="inline-code">/swap/approval</code> with{' '}
              <code className="inline-code">recipient = user&rsquo;s Ethereum wallet</code> and{' '}
              <code className="inline-code">no actions[]</code>, then call{' '}
              <code className="inline-code">sdk.createOrder()</code> with{' '}
              <code className="inline-code">amount = swapResp.minOutputAmount</code>,{' '}
              <code className="inline-code">allowPartialFills: false</code>, and{' '}
              <code className="inline-code">allowMultipleFills: false</code> &mdash; ether.fi
              requires no partial fills on the destination swap leg. The SDK
              returns the EIP-712 typed data plus encoded extension bytes (auction parameters,
              whitelisted resolvers, fee config).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold-300 font-mono tabular flex-shrink-0">3</span>
            <span>
              <span className="text-cream-100 font-semibold">Signature 1 of 2: confirm cross-chain transfer.</span>{' '}
              User signs and sends the Across deposit transaction on Optimism. UI shows
              &ldquo;Step 1 of 2&rdquo;.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold-300 font-mono tabular flex-shrink-0">4</span>
            <span>
              <span className="text-cream-100 font-semibold">Signature 2 of 2: sign the Fusion order.</span>{' '}
              Fires <span className="text-cream-100">immediately</span> after sig 1 resolves &mdash;
              no polling, no &ldquo;click to continue&rdquo;. Off-chain EIP-712 signature
              (no gas). UI shows &ldquo;Step 2 of 2&rdquo;. From here on, no further user
              interaction.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold-300 font-mono tabular flex-shrink-0">5</span>
            <span>
              <span className="text-cream-100 font-semibold">Submit the signed order first, then bridge and fill in parallel.</span>{' '}
              POST the freshly signed order to 1inch&rsquo;s relayer via{' '}
              <code className="inline-code">/api/fusion-submit</code>{' '}
              <span className="text-cream-100">immediately</span> after sig 2 resolves &mdash;{' '}
              before any bridge polling. The order&rsquo;s{' '}
              <code className="inline-code">startAuctionIn = 60s</code> means resolvers wait
              60 seconds before attempting fills, which is the buffer that lets Across
              deliver USDC (~2&ndash;4s typical) before the Dutch auction opens. The
              order lives in 1inch&rsquo;s order book from this moment on, decoupled from
              the browser session: if the page refreshes, if the bridge poll fails, if
              the indexer lags, the relayer is already holding the order and will fill
              it when USDC arrives. After submission, poll{' '}
              <code className="inline-code">/api/fusion-status</code> until the order
              settles (filled, expired, or cancelled). UI shows &ldquo;Bridging and
              filling...&rdquo; throughout.
            </span>
          </li>
        </ol>
      </div>

      <div className="rounded-2xl border border-white/[0.05] bg-bg-700/40 p-5 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-3">
          Status polling endpoints
        </div>
        <p className="text-sm text-cream-300 leading-relaxed mb-3">
          Two independent legs, two status streams. The PoC polls each on its own clock and
          drives the UI off a phase enum (<code className="inline-code">bridging</code> &rarr;{' '}
          <code className="inline-code">bridged</code> &rarr;{' '}
          <code className="inline-code">signing-order</code> &rarr;{' '}
          <code className="inline-code">submitting</code> &rarr;{' '}
          <code className="inline-code">auction</code> &rarr;{' '}
          <code className="inline-code">filled</code>).
        </p>
        <pre className="code-block !mb-3">{`# Across bridge leg (poll every 2-3s until status is "filled")
GET https://app.across.to/api/deposit/status
  ?originChainId=10
  &depositTxHash=0x...           # tx hash from the depositV3 call on Optimism
                                  # (alternative: ?depositId=... if you have the deposit id)

# Returns: { status, depositId, fillTx, destinationChainId, ... }
# status transitions: pending -> filled (typical ~2s) or expired (after fillDeadline)`}</pre>
        <pre className="code-block !mb-2">{`# Fusion order leg (poll every 3s until status is "filled" or "expired")
GET https://api.1inch.dev/fusion/orders/v2.0/{chainId}/order/status/{orderHash}
  Authorization: Bearer {1INCH_DEV_PORTAL_KEY}
  chainId = 1                     # Ethereum mainnet
  orderHash = sdk.createOrder(...).getOrderHash(1)

# Returns: { status, fills[], settlement, makingAmount, takingAmount, ... }
# status transitions: pending -> filled, or expired, or refunded
# (no partially-filled: the PoC sets allowPartialFills=false, allowMultipleFills=false)`}</pre>
        <p className="text-[11px] text-cream-400 leading-snug">
          The PoC wraps both endpoints in server-side Next.js routes (
          <code className="inline-code">/api/status</code> and{' '}
          <code className="inline-code">/api/fusion-status</code>) to keep the 1inch dev-portal
          API key off the client bundle.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.05] bg-bg-700/40 p-5 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-3">
          Market-hours nuance for tokenized equities
        </div>
        <p className="text-sm text-cream-300 leading-relaxed mb-3">
          Fusion resolvers quoting Ondo GM tokens only respond during US market hours
          (Mon&ndash;Fri 9:30&ndash;16:00 EST). Outside that window the quoter returns HTTP 500
          because resolvers can&rsquo;t hedge the underlying equity exposure when TradFi
          brokerages are closed.
        </p>
        <p className="text-sm text-cream-300 leading-relaxed">
          The PoC detects the 500, sets a <code className="inline-code">marketHoursIssue</code>{' '}
          flag in the quote response, and surfaces a clean fallback in the UI: switch to Bebop
          RFQ (Ondo-approved primary holders quote 24/7 regardless of TradFi hours) or 1inch
          Aggregation (typically routes through Bebop as one of its PMM sources). Same Across
          rails, different tool per market state.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.05] bg-bg-700/40 p-5 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-cream-500 mb-3">
          Failure modes &amp; refund semantics
        </div>
        <p className="text-sm text-cream-300 leading-relaxed mb-3">
          If the Fusion order expires unfilled (no resolver competes within the auction window
          or all resolver quotes fall below <code className="inline-code">auctionEndAmount</code>),
          the bridged USDC stays in the user&rsquo;s Ethereum wallet. No funds lost. The user can
          retry with another route (Bebop, 1inch Aggregation, manual swap) or wait for better
          market conditions.
        </p>
        <p className="text-sm text-cream-300 leading-relaxed">
          This is the structural trade-off for the Dutch auction&rsquo;s rate-discovery
          advantage. Atomic paths (Bebop, 1inch Aggregation) revert the entire deposit if the
          destination call fails &mdash; user gets USDC back on Optimism. The async path leaves
          USDC on Ethereum if the order expires. Both are safe; they fail in different states.
        </p>
      </div>

      <div className="rounded-2xl border border-gold-500/15 bg-gold-500/[0.02] p-5">
        <div className="text-[10px] uppercase tracking-widest gold-text font-semibold mb-3">
          Upgrade ladder beyond two prompts
        </div>
        <p className="text-sm text-cream-300 leading-relaxed mb-3">
          The PoC ships Option A Level 1 (two back-to-back prompts, works with any EOA today).
          Two cleaner UX states are reachable without architectural change:
        </p>
        <div className="space-y-3 mb-3">
          <div className="rounded-xl bg-bg-800/40 border border-white/[0.04] p-3.5">
            <div className="text-[11px] font-semibold text-cream-100 mb-1.5">
              Level 2 &middot; EIP-5792 batching (smart wallets + EIP-7702 EOAs)
            </div>
            <p className="text-xs text-cream-400 leading-relaxed">
              Two account types expose <code className="inline-code">wallet_sendCalls</code> to
              batch multiple operations into a single prompt: native smart accounts (Coinbase
              Smart Wallet, Safe, Argent, ZeroDev) and EIP-7702-delegating EOAs (MetaMask
              post-Pectra, Rabby, and a fast-growing list). The USDC OP approval + Across
              deposit collapse into one user-side batch on Optimism; the Fusion order
              signature follows on Ethereum. Feature-detect via{' '}
              <code className="inline-code">wallet_getCapabilities</code> and fall back to
              Level 1 for vanilla EOAs. Drop-in upgrade, no contract changes &mdash; and
              EIP-7702 means ether.fi doesn&rsquo;t need a full smart-account product to
              benefit; the existing EOA user base picks it up the moment their wallet
              supports it.
            </p>
          </div>
          <div className="rounded-xl bg-bg-800/40 border border-white/[0.04] p-3.5">
            <div className="text-[11px] font-semibold text-cream-100 mb-1.5">
              Pattern B &middot; single-signature Fusion via ERC-1271
            </div>
            <p className="text-xs text-cream-400 leading-relaxed">
              Have a custom MulticallHandler extension act as the Fusion maker itself, signing
              orders via on-chain ERC-1271 contract signature after Across delivers USDC. The
              user signs only the Across deposit; the handler authorizes the Fusion fill.
              Requires a custom handler contract and resolver-side ERC-1271 acceptance
              (supported by 1inch&rsquo;s settlement contract). Bigger lift, single-prompt UX
              for every wallet.
            </p>
          </div>
        </div>
        <p className="text-xs text-cream-500 leading-relaxed">
          ether.fi can ship Level 1 today, layer Level 2 once smart-wallet support is in scope,
          and reach Pattern B if single-sig UX becomes a hard product requirement.
        </p>
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
    'Track deposits via Across GET /api/deposit/status?originChainId=...&depositTxHash=... for confirmation UX. See section 07 for the exact endpoint shape.',
    'Handle the refund path if fillDeadline is reached without a fill. Rare but possible during extreme network conditions.',
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="eyebrow mb-3">08 &middot; Production hardening</div>
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
