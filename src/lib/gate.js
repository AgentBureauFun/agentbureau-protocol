// Contract gate. Solana addresses are base58 strings of 32 to 44 characters.
// Never reject on any other property (suffix, prefix, casing patterns).
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const isBase58Address = (s) => typeof s === 'string' && BASE58.test(s);

// Returns 'stated' | 'absent' | 'unconfirmed' | 'invalid'
export function contractBranch(rec) {
  if (!rec) return 'absent';
  if (rec.state === 'stated') return isBase58Address(rec.value) ? 'stated' : 'invalid';
  return rec.state === 'unconfirmed' ? 'unconfirmed' : 'absent';
}

export function shortAddress(a) {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
