export const HEALTH = { connecting: 'Connecting', live: 'Live', offline: 'Offline' };
export const OFFLINE_AFTER = 3;

// ev: { ok: true } | { ok: false, fails: n }
export function nextHealth(prev, ev) {
  if (ev.ok) return 'live';
  if (ev.fails >= OFFLINE_AFTER) return 'offline';
  return prev === 'live' ? 'live' : 'connecting';
}
