import { easeOutCubic } from './lib/format.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function cssVar(el, name) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function restartClass(el, cls) {
  el.classList.remove('flash-up', 'flash-down');
  void el.offsetWidth;
  el.classList.add(cls);
}

// Count-up (700ms, cubic-out) with a flash on every later change.
export function setNumber(el, to, { format, dur = 700 } = {}) {
  if (!el) return;
  if (typeof to !== 'number' || !Number.isFinite(to)) {
    if (el._v === undefined) el.textContent = '—';
    return;
  }
  const first = el._v === undefined;
  const from = first ? 0 : el._v;
  if (!first && to === from) return;
  el._v = to;
  if (el._raf) cancelAnimationFrame(el._raf);
  if (!first) restartClass(el, to > from ? 'flash-up' : 'flash-down');
  if (reduced()) {
    el.textContent = format(to);
    return;
  }
  let t0 = 0;
  const step = (now) => {
    if (!t0) t0 = now;
    const c = Math.min(1, (now - t0) / dur);
    el.textContent = format(from + (to - from) * easeOutCubic(c));
    if (c < 1) el._raf = requestAnimationFrame(step);
    else el.textContent = format(to);
  };
  el._raf = requestAnimationFrame(step);
}

// Visibility helper for canvases: runs only while on screen and tab visible.
export function whileVisible(el, start, stop) {
  let onScreen = false;
  const sync = () => (onScreen && !document.hidden ? start() : stop());
  const io = new IntersectionObserver((es) => {
    onScreen = es[0].isIntersecting;
    sync();
  });
  io.observe(el);
  document.addEventListener('visibilitychange', sync);
}

export function fitCanvas(canvas, dprMax = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
