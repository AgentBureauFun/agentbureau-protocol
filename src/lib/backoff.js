// Exponential backoff with equal jitter. rng returns [0,1).
export function nextDelay(fails, { base = 2000, max = 60000, jitter = 0.5, rng = Math.random } = {}) {
  const exp = Math.min(max, base * 2 ** Math.max(0, fails));
  if (fails <= 0) return Math.round(exp * (0.9 + rng() * 0.2));
  return Math.round(exp * (1 - jitter) + rng() * exp * jitter);
}
