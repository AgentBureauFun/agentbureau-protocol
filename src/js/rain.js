import { cssVar, fitCanvas, reduced, whileVisible } from './util.js';

const GLYPHS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const LAYERS = [
  { size: 13, speed: 0.38, alpha: 0.2, depth: 0.04 },
  { size: 18, speed: 0.62, alpha: 0.34, depth: 0.09 },
  { size: 26, speed: 1, alpha: 0.6, depth: 0.16 }
];

// Matrix-style rain of base58 glyphs, three depth layers. Colours come from CSS variables.
export function mountRain(canvas) {
  const fg = cssVar(document.documentElement, '--k10');
  const bg = cssVar(document.documentElement, '--k0');
  let ctx;
  let w = 0;
  let h = 0;
  let cols = [];
  let raf = 0;
  let last = 0;
  let scrollY = 0;

  const build = () => {
    ({ ctx, w, h } = fitCanvas(canvas, 1.25));
    cols = LAYERS.map((L) => {
      const n = Math.ceil(w / (L.size * 1.15));
      return Array.from({ length: n }, (_, i) => ({ x: i * L.size * 1.15 + L.size * 0.2, y: Math.random() * h, v: 0.6 + Math.random() * 0.8, g: GLYPHS[(Math.random() * GLYPHS.length) | 0] }));
    });
    ctx.clearRect(0, 0, w, h);
    if (reduced()) frame(0, true);
  };

  const frame = (t, still = false) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = still ? 1 : 0.16;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.textBaseline = 'top';
    LAYERS.forEach((L, li) => {
      ctx.font = `${L.size}px ui-monospace, Menlo, Consolas, monospace`;
      const shift = scrollY * L.depth;
      for (const c of cols[li]) {
        if (still) {
          for (let k = 0; k < 9; k++) {
            ctx.globalAlpha = L.alpha * (1 - k / 10) * 0.8;
            ctx.fillStyle = fg;
            ctx.fillText(GLYPHS[((c.x * 7 + k * 13) | 0) % GLYPHS.length], c.x, ((c.y + k * L.size) % h) - shift);
          }
          continue;
        }
        c.y += L.speed * c.v * (L.size * 0.55);
        if (c.y > h + L.size && Math.random() > 0.975) {
          c.y = -L.size;
          c.v = 0.6 + Math.random() * 0.8;
        }
        if (Math.random() > 0.9) c.g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        ctx.globalAlpha = L.alpha;
        ctx.fillStyle = fg;
        ctx.fillText(c.g, c.x, c.y - shift);
        ctx.globalAlpha = Math.min(1, L.alpha * 1.8);
        ctx.fillRect(c.x, c.y - shift, 1, 1);
      }
    });
    ctx.globalAlpha = 1;
  };

  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    if (t - last < 40) return;
    last = t;
    frame(t);
  };

  build();
  window.addEventListener('resize', build);
  window.addEventListener('scroll', () => (scrollY = Math.min(window.scrollY, h)), { passive: true });
  if (!reduced()) {
    whileVisible(
      canvas,
      () => {
        if (!raf) raf = requestAnimationFrame(loop);
      },
      () => {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    );
  }
}
