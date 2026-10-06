export const LLAMA_URL = 'https://api.llama.fi/v2/chains';
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Match the chain entry whose slug equals the wanted slug.
export function parseTvl(payload, slug = 'solana') {
  if (!Array.isArray(payload)) return null;
  const hit = payload.find((c) => c && typeof c.name === 'string' && slugify(c.name) === slug);
  return hit && Number.isFinite(hit.tvl) && hit.tvl > 0 ? hit.tvl : null;
}
