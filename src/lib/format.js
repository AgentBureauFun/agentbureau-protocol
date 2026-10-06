export const DASH = '—';
const ok = (n) => typeof n === 'number' && Number.isFinite(n);

export const fmtInt = (n) => (ok(n) ? Math.round(n).toLocaleString('en-US') : DASH);

export function fmtCompactUsd(n) {
  if (!ok(n)) return DASH;
  const a = Math.abs(n);
  const [v, s] =
    a >= 1e12 ? [n / 1e12, 'T'] : a >= 1e9 ? [n / 1e9, 'B'] : a >= 1e6 ? [n / 1e6, 'M'] : a >= 1e3 ? [n / 1e3, 'K'] : [n, ''];
  return `$${v.toFixed(2)}${s}`;
}

export function fmtPrice(n) {
  if (!ok(n)) return DASH;
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(3)}`;
}

export function fmtPct(n) {
  if (!ok(n)) return DASH;
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export const easeOutCubic = (c) => 1 - Math.pow(1 - c, 3);
