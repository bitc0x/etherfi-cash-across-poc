export function formatUnits(value: bigint | string, decimals: number, maxFractionDigits = 6): string {
  const v = typeof value === 'string' ? BigInt(value) : value;
  const negative = v < 0n;
  const abs = negative ? -v : v;
  const factor = 10n ** BigInt(decimals);
  const whole = abs / factor;
  const frac = abs % factor;
  let fracStr = frac.toString().padStart(decimals, '0');
  if (fracStr.length > maxFractionDigits) fracStr = fracStr.slice(0, maxFractionDigits);
  fracStr = fracStr.replace(/0+$/, '');
  const out = fracStr ? `${whole}.${fracStr}` : `${whole}`;
  return negative ? `-${out}` : out;
}

export function parseUnits(value: string, decimals: number): bigint {
  const [whole, fraction = ''] = value.split('.');
  const fracPadded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(fracPadded || '0');
}

export function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('amount_too_low')) return 'Amount too low for this route. Try a larger size.';
  if (s.includes('amount_too_high')) return 'Amount too high for this route. Try a smaller size.';
  if (s.includes('simulation_error')) return 'Simulation failed. Destination call may be invalid.';
  if (s.includes('slippage') && s.includes('insufficient'))
    return 'Slippage tolerance too low for this token pair.';
  if (s.includes('insufficient')) return 'Insufficient balance or allowance.';
  if (s.includes('user rejected') || s.includes('user denied')) return 'Transaction rejected.';
  if (s.includes('not supported') || s.includes('unsupported_route'))
    return 'This route is not currently supported.';
  if (s.includes('quote_fetch_failed') || s.includes('quote failed'))
    return 'Could not fetch a live quote. Try again in a moment.';
  // Long messages get truncated, but the limit must clear a full Ethereum tx
  // URL (https://optimistic.etherscan.io/tx/ + 66-char hash = ~100 chars) plus
  // surrounding context. If the cut would land inside an https URL, extend
  // it to the URL's end so the link stays clickable.
  const LIMIT = 500;
  if (raw.length <= LIMIT) return raw;
  let cut = LIMIT;
  const urlRegex = /https?:\/\/\S+/g;
  for (const m of raw.matchAll(urlRegex)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (start < LIMIT && end > LIMIT) {
      cut = end;
      break;
    }
  }
  return raw.slice(0, cut) + '...';
}
