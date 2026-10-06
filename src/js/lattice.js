import { cssVar, fitCanvas, reduced, whileVisible } from './util.js';

const N = 150;
const LINK = 0.4;
const NODES = 6;

// Orbitable point lattice. Six larger nodes mark the six protocol stages.
export function mountLattice(canvas, { onZoom } = {}) {
  const fg = cssVar(document.documentElement, '--k13');
  const mid = cssVar(document.documentElement, '--k8');
  const dark = cssVar(document.documentElement, '--k0');
  const pts = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    pts.push([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r]);
  }
  const edges = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]);
      if (d < LINK) edges.push([i, j]);
    }
  const nodes = Array.from({ length: NODES }, (_, k) => {
    const a = (k / NODES) * Math.PI * 2;
    return [Math.cos(a) * 1.28, Math.sin(a * 2) * 0.34, Math.sin(a) * 1.28];
  });

  let w = 0;
  let h = 0;
  let ctx;
  let rotY = 0.6;
  let rotX = -0.35;
  let zoom = 1;
  let active = 0;
  let raf = 0;
  let drag = null;
  let pulse = 0;

  const build = () => {
    ({ ctx, w, h } = fitCanvas(canvas));
    draw();
  };

  const project = (p) => {
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cx - z1 * sx;
    const z2 = p[1] * sx + z1 * cx;
    const f = 3 / (3 - z2);
    const s = Math.min(w, h) * 0.3 * zoom;
    return { x: w / 2 + x1 * s * f, y: h / 2 + y2 * s * f, z: z2, f };
  };

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const P = pts.map(project);
    ctx.lineWidth = 1;
    ctx.strokeStyle = mid;
    for (const [i, j] of edges) {
      const z = (P[i].z + P[j].z) / 2;
      ctx.globalAlpha = 0.04 + 0.2 * ((z + 1) / 2);
      ctx.beginPath();
      ctx.moveTo(P[i].x, P[i].y);
      ctx.lineTo(P[j].x, P[j].y);
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    for (const p of P) {
      ctx.globalAlpha = 0.15 + 0.7 * ((p.z + 1) / 2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8 + 1.4 * p.f * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const NP = nodes.map(project);
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    NP.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.font = '700 11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    NP.forEach((p, i) => {
      const on = i === active;
      const r = (on ? 11 : 7) * p.f;
      ctx.globalAlpha = on ? 1 : 0.35 + 0.4 * ((p.z + 1.3) / 2.6);
      ctx.fillStyle = on ? fg : mid;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.globalAlpha = Math.max(0, 0.6 - pulse);
        ctx.strokeStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + pulse * 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = dark;
      } else {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = dark;
      }
      ctx.fillText(String(i), p.x, p.y + 0.5);
    });
    ctx.globalAlpha = 1;
  }

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!drag) rotY += 0.0035;
    pulse = (pulse + 0.012) % 1;
    draw();
  };

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    rotY += (e.clientX - drag.x) * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - drag.y) * 0.006));
    drag = { x: e.clientX, y: e.clientY };
    if (reduced()) draw();
  });
  const end = () => (drag = null);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  build();
  new ResizeObserver(build).observe(canvas);
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

  return {
    setChapter(i) {
      active = i;
      pulse = 0;
      if (reduced()) draw();
    },
    zoomBy(d) {
      zoom = Math.max(0.6, Math.min(1.8, +(zoom + d * 0.2).toFixed(2)));
      if (onZoom) onZoom(zoom);
      if (reduced()) draw();
    }
  };
}
