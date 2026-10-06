import { cssVar, fitCanvas } from './util.js';

const KEEP = 60;

// Line chart of slots advanced per second, one sample per answered poll.
export function mountTape(canvas) {
  const fg = cssVar(document.documentElement, '--k13');
  const mid = cssVar(document.documentElement, '--k6');
  const data = [];
  let ctx;
  let w = 0;
  let h = 0;

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = mid;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (h / 4) * i + 0.5);
      ctx.lineTo(w, (h / 4) * i + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (data.length < 2) return;
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const span = Math.max(hi - lo, 0.5);
    const pad = 16;
    const xy = (v, i) => [(i / (KEEP - 1)) * w + (w - (data.length - 1) * (w / (KEEP - 1))) , pad + (1 - (v - lo) / span) * (h - pad * 2)];
    ctx.beginPath();
    data.forEach((v, i) => {
      const [x, y] = xy(v, i);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();
    const [lx, ly] = xy(data[data.length - 1], data.length - 1);
    ctx.lineTo(lx, h);
    const [fx] = xy(data[0], 0);
    ctx.lineTo(fx, h);
    ctx.closePath();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const build = () => {
    ({ ctx, w, h } = fitCanvas(canvas));
    draw();
  };
  build();
  new ResizeObserver(build).observe(canvas);

  return {
    push(v) {
      data.push(v);
      if (data.length > KEEP) data.shift();
      draw();
    },
    get size() {
      return data.length;
    }
  };
}
