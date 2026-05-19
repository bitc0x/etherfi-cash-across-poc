export type ChainKey = 'optimism' | 'mainnet' | 'arbitrum' | 'base';

export const CHAINS: Record<
  ChainKey,
  { id: number; name: string; slug: string; short: string }
> = {
  optimism: { id: 10, name: 'Optimism', slug: 'optimism', short: 'OP' },
  mainnet: { id: 1, name: 'Ethereum', slug: 'mainnet', short: 'ETH' },
  arbitrum: { id: 42161, name: 'Arbitrum', slug: 'arbitrum', short: 'ARB' },
  base: { id: 8453, name: 'Base', slug: 'base', short: 'BASE' },
};

export const chainLogo = (slug: string) =>
  `https://alexandria-blond.vercel.app/assets/chains/${slug}.svg`;

export type Token = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
  logo?: string;
  category?: 'stable' | 'yield' | 'rwa' | 'lst';
  description?: string;
};

// Origin: USDC on Optimism (what sits in the Cash vault)
export const ORIGIN_TOKEN: Token = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  decimals: 6,
  chainId: 10,
  logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  category: 'stable',
};

// Destination assets on Ethereum mainnet
export const DESTINATION_ASSETS: Token[] = [
  {
    symbol: 'sDAI',
    name: 'Savings DAI',
    address: '0x83F20F44975D03b1b09e64809B757c47f942BEeA',
    decimals: 18,
    chainId: 1,
    logo: 'https://assets.coingecko.com/coins/images/32254/large/sdai.png',
    category: 'yield',
    description: 'MakerDAO savings rate. ~5% APY, fully on-chain, freely transferable.',
  },
  {
    symbol: 'sUSDe',
    name: 'Staked USDe',
    address: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
    decimals: 18,
    chainId: 1,
    logo: 'https://assets.coingecko.com/coins/images/33669/large/sUSDe.png',
    category: 'yield',
    description: 'Ethena synthetic dollar with funding-rate yield. High-APY stable.',
  },
  {
    symbol: 'wstETH',
    name: 'Wrapped Staked ETH',
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    decimals: 18,
    chainId: 1,
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0/logo.png',
    category: 'lst',
    description: 'Lido staked ETH, wrapped. Liquid staking yield exposure.',
  },
  {
    symbol: 'weETH',
    name: 'Wrapped eETH',
    address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
    decimals: 18,
    chainId: 1,
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee/logo.png',
    category: 'lst',
    description: 'ether.fi liquid restaked ETH. Stake yield plus EigenLayer points.',
  },
  {
    symbol: 'USDS',
    name: 'Sky Dollar',
    address: '0xdC035D45d973E3EC169d2276DDab16f1e407384F',
    decimals: 18,
    chainId: 1,
    logo: 'https://assets.coingecko.com/coins/images/39926/large/usds.png',
    category: 'stable',
    description: 'Sky (MakerDAO rebrand) stablecoin. Yield-bearing variant of DAI.',
  },
];
