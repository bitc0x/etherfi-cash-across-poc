import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-static';

const GITHUB_URL =
  'https://github.com/bitc0x/etherfi-cash-across-poc/blob/main/docs/PATTERN_B_IMPLEMENTATION_GUIDE.md';

export const metadata: Metadata = {
  title: 'Pattern B Implementation Guide · ether.fi × Across',
  description:
    'Turnkey blueprint for single-signature 1inch Fusion fills via a smart-contract Safe acting as the order maker through ERC-1271.',
};

export default function PatternBGuidePage() {
  const md = fs.readFileSync(
    path.join(process.cwd(), 'docs', 'PATTERN_B_IMPLEMENTATION_GUIDE.md'),
    'utf8'
  );

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(0,0,0,0.72)] border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Image src="/etherfi-logo.png" alt="ether.fi" width={28} height={28} className="rounded-full" />
              <span className="font-semibold text-[15px] tracking-tight">ether.fi</span>
            </div>
            <span className="text-cream-400 text-sm">×</span>
            <div className="flex items-center gap-2">
              <Image src="/across-logo.png" alt="Across" width={28} height={28} />
              <span className="font-semibold text-[15px] tracking-tight">Across</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link href="/reference" className="btn-ghost text-sm">
              &larr; Reference
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
              View on GitHub &rarr;
            </a>
          </div>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        <div className="eyebrow mb-5">Integration blueprint · for integrator engineering</div>
        <div className="md-guide">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </div>
        <div className="divider my-12" />
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/reference" className="btn-gold text-sm">
            &larr; Back to reference
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-outline-gold text-sm">
            View raw on GitHub &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
