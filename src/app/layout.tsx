import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ether.fi × Across',
  description:
    'Cash, anywhere. One transaction from your OP Cash vault to any Ethereum asset. Powered by Across Swap API.',
  icons: { icon: '/etherfi-logo.png' },
  openGraph: {
    title: 'ether.fi × Across',
    description: 'Cash, anywhere. One transaction from your OP Cash vault to any Ethereum asset.',
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
