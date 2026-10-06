// Breakpoint measurement through headless Edge/Chrome over CDP. Usage: node tools/measure.mjs [url] [shotDir]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:4517/';
const shotDir = process.argv[3] || '';
const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(existsSync);
if (!exe) throw new Error('no chromium browser found');
const port = 9333;
const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bm-'))}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    if (targets.length) break;
  } catch {}
  await sleep(200);
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) pending.get(d.id)(d);
};
const send = (method, params = {}, ms = 20000) =>
  new Promise((res, rej) => {
    const n = ++id;
    const t = setTimeout(() => rej(new Error(`timeout ${method}`)), ms);
    pending.set(n, (d) => (clearTimeout(t), d.error ? rej(new Error(d.error.message)) : res(d.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

const probe = `(() => {
  const w = innerWidth, q = (s) => document.querySelector(s);
  const off = [], small = [];
  for (const e of document.querySelectorAll('main *, header *')) {
    const r = e.getBoundingClientRect();
    if (!r.width || e.closest('.chap-list, .ledger-view, [data-hero], dialog')) continue;
    if (r.right > w + 0.5 || r.left < -0.5) off.push((e.className.baseVal === undefined ? e.className : 'svg') + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  }
  for (const e of document.querySelectorAll('a[href], button, input, [role=tab]')) {
    if (e.closest('dialog')) continue;
    const r = e.getBoundingClientRect();
    if (r.width && (r.width < 43.5 || r.height < 43.5)) small.push((e.className || e.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  const box = (s) => { const r = q(s).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  const ca = q('.ca-addr');
  return {
    vw: w, scrollW: document.documentElement.scrollWidth, noHScroll: document.documentElement.scrollWidth <= w,
    topbarH: q('[data-topbar]').offsetHeight, caFontPx: parseFloat(getComputedStyle(ca).fontSize), caBox: box('.ca-btn'),
    social: [...document.querySelectorAll('.social .icon-btn')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.width), Math.round(r.height)]; }),
    socialRightEdgeGap: Math.round(w - Math.max(...[...document.querySelectorAll('.social .icon-btn')].map((e) => e.getBoundingClientRect().right))),
    railW: Math.round(q('.rail').getBoundingClientRect().width), h1Px: parseFloat(getComputedStyle(q('.display')).fontSize),
    heroH: q('[data-hero]').offsetHeight, docH: document.documentElement.scrollHeight,
    overflowing: off.slice(0, 6), smallTargets: small.slice(0, 8),
    live: { health: q('[data-health-pill]').dataset.health, slot: q('[data-slot]').textContent, tvl: q('[data-tvl]').textContent, pairs: document.querySelectorAll('[data-pairs] a.pair').length, skeletonsLeft: document.querySelectorAll('[data-pairs] .is-skel').length },
    ctx: { fonts: getComputedStyle(document.body).fontFamily.slice(0, 24), anim: document.getAnimations().length }
  };
})()`;

const sizes = [[360, 800, 3, true], [390, 844, 3, true], [430, 932, 3, true], [1366, 768, 1, false], [1440, 900, 1, false]];
const out = [];
for (const [w, h, dpr, mobile] of sizes) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile });
  await send('Page.enable');
  await send('Page.navigate', { url });
  for (let i = 0; i < 40 && !(await evalJs("!!document.querySelector('[data-topbar]')").catch(() => false)); i++) await sleep(500);
  await sleep(4500);
  const t0 = Date.now();
  const m = await evalJs(probe);
  m.probeMs = Date.now() - t0;
  out.push(m);
  if (shotDir) {
    mkdirSync(shotDir, { recursive: true });
    const s = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(shotDir, `w${w}.png`), Buffer.from(s.data, 'base64'));
  }
}
console.log(JSON.stringify(out, null, 1));
ws.close();
proc.kill();
process.exit(0);
