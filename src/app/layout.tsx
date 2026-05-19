import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://etherfi-cash-across-poc.vercel.app'),
  title: 'ether.fi × Across · Cash, anywhere',
  description:
    'One signature in your Cash safe. Any Ethereum asset. Powered by the Across Swap API.',
  icons: { icon: '/etherfi-logo.png' },
  openGraph: {
    title: 'ether.fi × Across',
    description: 'One signature in your Cash safe. Any Ethereum asset.',
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
