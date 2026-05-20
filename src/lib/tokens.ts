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

// Origin: USDC on Optimism (what sits in the Cash safe)
export const ORIGIN_USDC = {
  symbol: 'USDC',
  address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  decimals: 6,
  chainId: 10,
};

// Curated symbols for the demo picker. Ordered with Shivam's literal ask first:
// Ondo Global Markets tokenized stocks (TSLAon, AAPLon, NVDAon, MSFTon, SPYon, QQQon)
// followed by the "and the same path supports..." set of Ethereum-only live-routable assets.
//
// kind: 'rwa-stock'   = Ondo GM tokenized stock/ETF. Permissioned, KYC-gated. Architecture
//                       preview only in demo; live execution requires ether.fi's KYC'd
//                       Ethereum vault onboarded as an Ondo GM holder.
// kind: 'rwa-yield'   = Ondo yield product (USDY). Live-routable via Across Swap API.
// kind: 'live'        = Any Ethereum-only asset directly routable via Across Swap API.
//
// underlying: human ticker for stocks (e.g. "TSLA" for TSLAon) — used for visual styling.
export type DemoAsset = {
  symbol: string;
  kind: 'rwa-stock' | 'rwa-yield' | 'live';
  tag: string;
  description: string;
  underlying?: string;
  accentColor?: string;
};

export const DEMO_DEST_SYMBOLS: DemoAsset[] = [
  // Ondo Global Markets tokenized stocks (Shivam's example) — permissioned RWAs
  { symbol: 'TSLAon', kind: 'rwa-stock', tag: 'Ondo GM', underlying: 'TSLA', accentColor: '#E31937', description: 'Tesla, tokenized. Ondo Global Markets. Routed via KYC\u2019d ether.fi Ethereum vault.' },
  { symbol: 'AAPLon', kind: 'rwa-stock', tag: 'Ondo GM', underlying: 'AAPL', accentColor: '#A2AAAD', description: 'Apple, tokenized. Ondo Global Markets. Routed via KYC\u2019d ether.fi Ethereum vault.' },
  { symbol: 'NVDAon', kind: 'rwa-stock', tag: 'Ondo GM', underlying: 'NVDA', accentColor: '#76B900', description: 'Nvidia, tokenized. Ondo Global Markets. Routed via KYC\u2019d ether.fi Ethereum vault.' },
  { symbol: 'MSFTon', kind: 'rwa-stock', tag: 'Ondo GM', underlying: 'MSFT', accentColor: '#00A4EF', description: 'Microsoft, tokenized. Ondo Global Markets. Routed via KYC\u2019d ether.fi Ethereum vault.' },
  { symbol: 'SPYon', kind: 'rwa-stock', tag: 'Ondo GM', underlying: 'SPY', accentColor: '#1E40AF', description: 'S&P 500 ETF, tokenized. Ondo Global Markets. Routed via KYC\u2019d ether.fi Ethereum vault.' },
  { symbol: 'QQQon', kind: 'rwa-stock', tag: 'Ondo GM', underlying: 'QQQ', accentColor: '#7C3AED', description: 'Nasdaq-100 ETF, tokenized. Ondo Global Markets. Routed via KYC\u2019d ether.fi Ethereum vault.' },

  // Ondo yield product — live-quotable (same architecture, no KYC gate)
  { symbol: 'USDY', kind: 'rwa-yield', tag: 'Ondo', description: "Ondo's yield-bearing USD. Same architecture as Ondo GM stocks; live-routable today." },

  // Other Ethereum-only assets the same path unlocks
  { symbol: 'sUSDe', kind: 'live', tag: 'Yield', description: 'Staked USDe. Ethena synthetic dollar with funding-rate yield.' },
  { symbol: 'sDAI', kind: 'live', tag: 'Yield', description: 'Savings DAI. MakerDAO savings rate, freely transferable.' },
  { symbol: 'weETH', kind: 'live', tag: 'LST', description: "ether.fi's own liquid restaked ETH. Stake yield plus EigenLayer points." },
  { symbol: 'wstETH', kind: 'live', tag: 'LST', description: 'Lido staked ETH, wrapped. Liquid staking yield.' },
  { symbol: 'USDS', kind: 'live', tag: 'Stable', description: 'Sky Dollar. Yield-bearing successor to DAI.' },
  { symbol: 'USDC', kind: 'live', tag: 'Stable', description: 'Native canonical USDC on Ethereum.' },
];

// Convenience: list of permissioned RWA stock symbols
export const STOCK_SYMBOLS = DEMO_DEST_SYMBOLS.filter((a) => a.kind === 'rwa-stock').map((a) => a.symbol);
export const isStock = (symbol: string) => STOCK_SYMBOLS.includes(symbol);

// Mock prices (USD) for stock tokens — used for balance display in Sell mode.
// Real Ondo GM tokens track NYSE/Nasdaq pricing via Chainlink; these are illustrative
// for the demo and rounded to recognizable levels.
export const STOCK_MOCK_PRICE: Record<string, number> = {
  TSLAon: 245,
  AAPLon: 188,
  NVDAon: 132,
  MSFTon: 412,
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
