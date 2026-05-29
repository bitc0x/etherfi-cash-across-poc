import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://etherfi-cash-across-poc.vercel.app'),
  title: 'ether.fi × Across · Ondo stocks in Cash, atomic',
  description:
    'USDC on Optimism to TSLAon, NVDAon, GOOGLon and the wider Ondo GM family in one signature. Across + Bebop RFQ. Mainnet-proven.',
  icons: { icon: '/etherfi-logo.png' },
  openGraph: {
    title: 'ether.fi × Across · Ondo stocks in Cash',
    description:
      'One signature, ~2 seconds, zero slippage on the RFQ leg. Mainnet-proven Path A live today.',
    images: ['/etherfi-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ether.fi × Across · Ondo stocks in Cash',
    description:
      'One signature, ~2 seconds, zero slippage on the RFQ leg. Mainnet-proven Path A live today.',
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
