export type AcrossChain = {
  chainId: number;
  name: string;
  publicRpcUrl?: string;
  explorerUrl?: string;
  logoUrl?: string;
};

export type AcrossToken = {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
  priceUsd?: string;
};

// Origin: USDC on Optimism (what sits in the Cash safe).
export const ORIGIN_USDC = {
  symbol: 'USDC',
  address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  decimals: 6,
  chainId: 10,
};

// kind: 'rwa-stock'   = Ondo Global Markets tokenized equity/ETF. In this PoC, executed
//                       via Across SpokePool + MulticallHandler + Bebop RFQ on destination
//                       (when bebopBuyable=true), or shown as preview-only otherwise.
// kind: 'rwa-yield'   = Ondo yield product (USDY). Live-routable via Across Swap API directly.
// kind: 'live'        = Any Ethereum-only asset directly routable via Across Swap API.
//
// tokenAddress      = Destination token contract on Ethereum mainnet (required for stocks
//                     so the Bebop quote knows what to buy and the MulticallHandler
//                     payload can be built).
// bebopBuyable      = Whether Bebop RFQ currently has buy-side liquidity for this token.
//                     Verified live against api.bebop.xyz tokenlist.
export type DemoAsset = {
  symbol: string;
  kind: 'rwa-stock' | 'rwa-yield' | 'live';
  tokenAddress?: string;
  bebopBuyable?: boolean;
  tag: string;
  description: string;
  underlying?: string;
  accentColor?: string;
};

// Bebop addresses are verified against api.bebop.xyz/pmm/ethereum/v3/tokenlist (live).
// Coverage status checked 2026-05-29:
//   buyable via Bebop RFQ: TSLAon, NVDAon, GOOGLon, CRCLon, COINon, HOODon, MSTRon
//   sell-only on Bebop:    SPYon (canBuy=False)
//   not on Bebop yet:      AAPLon, QQQon (architecture preview only)
export const DEMO_DEST_SYMBOLS: DemoAsset[] = [
  // ---------- Ondo Global Markets stocks (Bebop-buyable, end-to-end executable) ----------
  {
    symbol: 'TSLAon',
    kind: 'rwa-stock',
    tokenAddress: '0xf6b1117ec07684D3958caD8BEb1b302bfD21103f',
    bebopBuyable: true,
    tag: 'Ondo GM',
    underlying: 'TSLA',
    accentColor: '#E31937',
    description: 'Tesla, tokenized. Ondo Global Markets. Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.',
  },
  {
    symbol: 'NVDAon',
    kind: 'rwa-stock',
    tokenAddress: '0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE',
    bebopBuyable: true,
    tag: 'Ondo GM',
    underlying: 'NVDA',
    accentColor: '#76B900',
    description: 'Nvidia, tokenized. Ondo Global Markets. Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.',
  },
  {
    symbol: 'GOOGLon',
    kind: 'rwa-stock',
    tokenAddress: '0xbA47214eDd2bb43099611b208f75E4b42FDcfEDc',
    bebopBuyable: true,
    tag: 'Ondo GM',
    underlying: 'GOOGL',
    accentColor: '#4285F4',
    description: 'Alphabet, tokenized. Ondo Global Markets. Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.',
  },
  {
    symbol: 'COINon',
    kind: 'rwa-stock',
    tokenAddress: '0xF042cfa86cf1D598a75Bdb55c3507a1F39f9493b',
    bebopBuyable: true,
    tag: 'Ondo GM',
    underlying: 'COIN',
    accentColor: '#0052FF',
    description: 'Coinbase, tokenized. Ondo Global Markets. Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.',
  },
  {
    symbol: 'HOODon',
    kind: 'rwa-stock',
    tokenAddress: '0x998f02A9E343EF6E3E6f28700d5A20F839fD74E6',
    bebopBuyable: true,
    tag: 'Ondo GM',
    underlying: 'HOOD',
    accentColor: '#00C805',
    description: 'Robinhood, tokenized. Ondo Global Markets. Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.',
  },
  {
    symbol: 'MSTRon',
    kind: 'rwa-stock',
    tokenAddress: '0xCabD955322dfbf94C084929ac5E9Eca3fEB5556F',
    bebopBuyable: true,
    tag: 'Ondo GM',
    underlying: 'MSTR',
    accentColor: '#F7931A',
    description: 'MicroStrategy, tokenized. Ondo Global Markets. Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.',
  },
  {
    symbol: 'CRCLon',
    kind: 'rwa-stock',
    tokenAddress: '0x3632DEa96A953C11dac2f00b4A05a32CD1063fAE',
    bebopBuyable: true,
    tag: 'Ondo GM',
    underlying: 'CRCL',
    accentColor: '#1FAB44',
    description: 'Circle, tokenized. Ondo Global Markets. Routed via Bebop RFQ on Ethereum, atomic with the Across deposit.',
  },

  // ---------- Ondo GM stocks awaiting Bebop coverage (preview-only) ----------
  {
    symbol: 'AAPLon',
    kind: 'rwa-stock',
    bebopBuyable: false,
    tag: 'Ondo GM',
    underlying: 'AAPL',
    accentColor: '#A2AAAD',
    description: 'Apple, tokenized. Ondo Global Markets. Awaiting Bebop secondary-market coverage; architecture preview only.',
  },
  {
    symbol: 'SPYon',
    kind: 'rwa-stock',
    tokenAddress: '0xFeDC5f4a6c38211c1338aa411018DFAf26612c08',
    bebopBuyable: false,
    tag: 'Ondo GM',
    underlying: 'SPY',
    accentColor: '#1E40AF',
    description: 'S&P 500 ETF, tokenized. Ondo Global Markets. Awaiting Bebop buy-side coverage; architecture preview only.',
  },
  {
    symbol: 'QQQon',
    kind: 'rwa-stock',
    bebopBuyable: false,
    tag: 'Ondo GM',
    underlying: 'QQQ',
    accentColor: '#7C3AED',
    description: 'Nasdaq-100 ETF, tokenized. Ondo Global Markets. Awaiting Bebop secondary-market coverage; architecture preview only.',
  },

  // ---------- Ondo yield product (live via Across Swap API directly) ----------
  { symbol: 'USDY', kind: 'rwa-yield', tag: 'Ondo', description: "Ondo's yield-bearing USD. Live-routable via Across Swap API directly." },

  // ---------- Other Ethereum-only assets the same Across path unlocks ----------
  { symbol: 'sUSDe', kind: 'live', tag: 'Yield', description: 'Staked USDe. Ethena synthetic dollar with funding-rate yield.' },
  { symbol: 'sDAI', kind: 'live', tag: 'Yield', description: 'Savings DAI. MakerDAO savings rate, freely transferable.' },
  { symbol: 'weETH', kind: 'live', tag: 'LST', description: "ether.fi's own liquid restaked ETH. Stake yield plus EigenLayer points." },
  { symbol: 'wstETH', kind: 'live', tag: 'LST', description: 'Lido staked ETH, wrapped. Liquid staking yield.' },
  { symbol: 'USDS', kind: 'live', tag: 'Stable', description: 'Sky Dollar. Yield-bearing successor to DAI.' },
  { symbol: 'USDC', kind: 'live', tag: 'Stable', description: 'Native canonical USDC on Ethereum.' },
];

// Convenience: list of permissioned RWA stock symbols.
export const STOCK_SYMBOLS = DEMO_DEST_SYMBOLS.filter((a) => a.kind === 'rwa-stock').map((a) => a.symbol);
export const isStock = (symbol: string) => STOCK_SYMBOLS.includes(symbol);

// Symbols actually executable end-to-end via Bebop RFQ path (vs preview-only).
export const BEBOP_BUYABLE_SYMBOLS = DEMO_DEST_SYMBOLS.filter((a) => a.bebopBuyable).map((a) => a.symbol);
export const isBebopBuyable = (symbol: string) => BEBOP_BUYABLE_SYMBOLS.includes(symbol);

// Mock prices (USD) used for balance display in Sell mode and as fallback when live
// pricing isn't available. Real Ondo GM tokens track NYSE/Nasdaq pricing via Chainlink;
// these are illustrative for offline display. Bebop returns live prices via the quote
// API at swap time so user always sees the actual executable price.
export const STOCK_MOCK_PRICE: Record<string, number> = {
  TSLAon: 437,
  NVDAon: 132,
  GOOGLon: 178,
  COINon: 245,
  HOODon: 38,
  MSTRon: 1450,
  CRCLon: 95,
  AAPLon: 188,
  SPYon: 568,
  QQQon: 482,
};

// Local overrides for tokens whose API-provided logo renders badly on dark theme
// (e.g. black background, or generic placeholder). Keyed by symbol (case-sensitive).
export const LOCAL_LOGO_OVERRIDES: Record<string, string> = {
  ONDO: '/ondo-logo.png',
  USDY: '/usdy-logo.png',
};

// Reliable hardcoded logo URLs for tokens displayed outside the dynamic picker
// (e.g. the Optimism USDC chip on the Cash safe).
export const RELIABLE_LOGOS: Record<string, string> = {
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
};
