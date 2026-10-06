export const LIVE_ORIGINS = {
  connect: ['https://solana-rpc.publicnode.com', 'https://api.llama.fi', 'https://api.dexscreener.com'],
  img: ['https://cdn.dexscreener.com', 'https://dd.dexscreener.com']
};

export function cspString() {
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src 'self' data: ${LIVE_ORIGINS.img.join(' ')}`,
    `connect-src 'self' ${LIVE_ORIGINS.connect.join(' ')}`,
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'"
  ].join('; ');
}

// frame-ancestors is only honoured in headers, not meta tags.
export const headerCsp = () => `${cspString()}; frame-ancestors 'none'`;
