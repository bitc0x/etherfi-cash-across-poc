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
  if (s.includes('simulation_error')) return 'Simulation failed. Likely a destination call issue.';
  if (s.includes('insufficient')) return 'Insufficient balance or allowance.';
  if (s.includes('user rejected') || s.includes('user denied')) return 'Transaction rejected.';
  if (s.includes('not supported')) return 'This route is not currently supported.';
  return raw.length > 120 ? raw.slice(0, 120) + '...' : raw;
}
