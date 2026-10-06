import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from '../src/page.js';
import { publicRegister, validateRegister } from '../src/lib/register.js';
import { tokensCss, paletteHexes } from '../src/tokens.mjs';
import { readPng } from './png.mjs';
import { cspString, headerCsp } from '../src/csp.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const src = join(root, 'src');

// Favicon: traced from the real 32x32 pixel grid of the logo (premultiplied resize),
// each pixel snapped to the nearest sampled brand colour, horizontal runs merged.
export function faviconSvg() {
  const png = readPng(join(src, 'assets', 'img', 'mark-32.png'));
  const pal = paletteHexes.map((h) => [h, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))]);
  const near = (rgb) => pal.reduce((best, p) => {
    const d = (p[1][0] - rgb[0]) ** 2 + (p[1][1] - rgb[1]) ** 2 + (p[1][2] - rgb[2]) ** 2;
    return d < best.d ? { d, h: p[0] } : best;
  }, { d: Infinity, h: '' }).h;
  const rects = [];
  for (let y = 0; y < 32; y++) {
    let run = null;
    for (let x = 0; x <= 32; x++) {
      const p = x < 32 ? png.px(x, y) : null;
      const fill = p && p[3] >= 128 ? near(p) : null;
      if (run && run.fill === fill) { run.w++; continue; }
      if (run && run.fill) rects.push(`<rect x="${run.x}" y="${y}" width="${run.w}" height="1" fill="${run.fill}"/>`);
      run = { x, w: 1, fill };
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">${rects.join('')}</svg>
`;
}

export function build() {
  const reg = JSON.parse(readFileSync(join(src, 'register.json'), 'utf8'));
  const errs = validateRegister(reg);
  if (errs.length) throw new Error('register invalid: ' + errs.join('; '));
  const pub = publicRegister(reg);

  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, 'assets', 'js'), { recursive: true });

  writeFileSync(join(dist, 'index.html'), renderPage(pub, { csp: cspString() }));
  writeFileSync(join(dist, 'assets', 'tokens.css'), tokensCss());
  writeFileSync(join(dist, 'assets', 'app.css'), readFileSync(join(src, 'css', 'app.css'), 'utf8'));
  cpSync(join(src, 'js'), join(dist, 'assets', 'js'), { recursive: true });
  cpSync(join(src, 'lib'), join(dist, 'assets', 'js', 'lib'), { recursive: true });
  writeFileSync(join(dist, 'assets', 'js', 'register.data.js'), `export default ${JSON.stringify(pub)};\n`);
  writeFileSync(join(dist, 'favicon.svg'), faviconSvg());
  mkdirSync(join(dist, 'assets', 'img'), { recursive: true });
  for (const f of ['logo-768.webp', 'logo-192.webp', 'logo-96.webp', 'logo-192.png']) cpSync(join(src, 'assets', 'img', f), join(dist, 'assets', 'img', f));
  writeFileSync(
    join(dist, '_headers'),
    `/*\n  Content-Security-Policy: ${headerCsp()}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=3600\n`
  );
  writeFileSync(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  if (existsSync(join(root, 'docs'))) cpSync(join(root, 'docs'), join(dist, 'docs'), { recursive: true });
  return dist;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build();
  console.log('built -> dist/');
}
