import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://etherfi-cash-across-poc-bitc0xs-projects.vercel.app'),
  title: 'ether.fi × Across · Ondo stocks in Cash, atomic',
  description:
    'USDC on Optimism to TSLAon, NVDAon, GOOGLon and the wider Ondo GM family in one signature on atomic routes. Three destination sources wired: Bebop RFQ, 1inch Aggregation, 1inch Fusion. Mainnet-proven.',
  icons: { icon: '/etherfi-logo.png' },
  openGraph: {
    title: 'ether.fi × Across · Ondo stocks in Cash',
    description:
      'Sign once. Declare the outcome. Across does the rest. Three destination liquidity sources wired in the PoC. Mainnet-proven.',
    images: ['/etherfi-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ether.fi × Across · Ondo stocks in Cash',
    description:
      'Sign once. Declare the outcome. Across does the rest. Three destination liquidity sources wired in the PoC. Mainnet-proven.',
    images: ['/etherfi-logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
