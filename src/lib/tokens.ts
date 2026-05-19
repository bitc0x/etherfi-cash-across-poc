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

// Curated symbols we want to surface in the demo picker (Ethereum mainnet destination)
// The actual token metadata (logo, address, decimals) is hydrated from /api/tokens.
export const DEMO_DEST_SYMBOLS = [
  { symbol: 'USDY', tag: 'Ondo', description: "Ondo's yield-bearing USD. KYC-gated holder; routed via ether.fi vault." },
  { symbol: 'ONDO', tag: 'Ondo', description: 'Ondo governance token. Exposure to the Ondo ecosystem.' },
  { symbol: 'USDC', tag: 'Stable', description: 'Native canonical USDC on Ethereum.' },
  { symbol: 'sDAI', tag: 'Yield', description: 'Savings DAI. MakerDAO savings rate, freely transferable.' },
  { symbol: 'sUSDe', tag: 'Yield', description: 'Staked USDe. Ethena synthetic dollar with funding-rate yield.' },
  { symbol: 'USDS', tag: 'Stable', description: 'Sky Dollar. Yield-bearing successor to DAI.' },
  { symbol: 'wstETH', tag: 'LST', description: 'Lido staked ETH, wrapped. Liquid staking yield.' },
  { symbol: 'weETH', tag: 'LST', description: 'ether.fi liquid restaked ETH. Stake yield plus EigenLayer points.' },
];

// Local overrides for tokens whose API-provided logo renders badly on dark theme
// (e.g. black background, or generic placeholder). Keyed by symbol (case-sensitive).
export const LOCAL_LOGO_OVERRIDES: Record<string, string> = {
  ONDO: '/ondo-logo.png',
  USDY: '/ondo-logo.png',
};

// Reliable hardcoded logo URLs for tokens displayed outside the dynamic picker
// (e.g. the Optimism USDC chip on the Cash safe).
export const RELIABLE_LOGOS: Record<string, string> = {
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
};
