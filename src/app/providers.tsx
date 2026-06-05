'use client';

import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { arbitrum, base, mainnet, optimism, polygon } from 'wagmi/chains';

// Explicit transports for every chain. The wagmi/RainbowKit defaults (eth.merkle.io
// for mainnet, etc.) return responses without CORS headers, so any read from the
// browser is blocked by CORS policy in Brave, Chrome strict mode, and many other
// configs. This silently breaks every useReadContract and publicClient.readContract
// call from the browser, including the Fusion allowance preflight, and produces
// false-positive approval prompts even when the on-chain allowance is already
// sufficient.
//
// publicnode.com endpoints are CORS-enabled ("Access-Control-Allow-Origin: *")
// and free for public use. Verified working with direct eth_call queries returning
// the expected uint256.max allowance value.
const config = getDefaultConfig({
  appName: 'ether.fi x Across',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [optimism, mainnet, arbitrum, base, polygon],
  transports: {
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
    [optimism.id]: http('https://optimism-rpc.publicnode.com'),
    [arbitrum.id]: http('https://arbitrum-one-rpc.publicnode.com'),
    [base.id]: http('https://base-rpc.publicnode.com'),
    [polygon.id]: http('https://polygon-bor-rpc.publicnode.com'),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#C8A876',
            accentColorForeground: '#1A140A',
            borderRadius: 'large',
            fontStack: 'system',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
