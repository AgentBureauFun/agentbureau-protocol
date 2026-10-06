export const DEX_URL = 'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112';
const IMG_OK = /^https:\/\/(cdn|dd)\.dexscreener\.com\//;
const URL_OK = /^https:\/\/dexscreener\.com\//;
const num = (v) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

// Pairs tagged solana, ranked by 24h volume.
export function parsePairs(payload, limit = 8) {
  const list = payload && Array.isArray(payload.pairs) ? payload.pairs : [];
  return list
    .filter((p) => p && p.chainId === 'solana' && num(p.priceUsd) !== null && num(p.volume && p.volume.h24) !== null)
    .sort((a, b) => b.volume.h24 - a.volume.h24)
    .slice(0, limit)
    .map((p) => ({
      id: String(p.pairAddress),
      base: String((p.baseToken && p.baseToken.symbol) || '?'),
      quote: String((p.quoteToken && p.quoteToken.symbol) || '?'),
      dex: String(p.dexId || ''),
      price: num(p.priceUsd),
      vol24: p.volume.h24,
      chg24: num(p.priceChange && p.priceChange.h24),
      img: p.info && IMG_OK.test(p.info.imageUrl || '') ? p.info.imageUrl : null,
      url: URL_OK.test(p.url || '') ? p.url : null
    }));
}
