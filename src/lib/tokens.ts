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
  { symbol: 'USDC', tag: 'Stable', description: 'Native canonical USDC on Ethereum.' },
  { symbol: 'sDAI', tag: 'Yield', description: 'Savings DAI. MakerDAO savings rate, freely transferable.' },
  { symbol: 'sUSDe', tag: 'Yield', description: 'Staked USDe. Ethena synthetic dollar with funding-rate yield.' },
  { symbol: 'USDS', tag: 'Stable', description: 'Sky Dollar. Yield-bearing successor to DAI.' },
  { symbol: 'wstETH', tag: 'LST', description: 'Lido staked ETH, wrapped. Liquid staking yield.' },
  { symbol: 'weETH', tag: 'LST', description: 'ether.fi liquid restaked ETH. Stake yield plus EigenLayer points.' },
];
