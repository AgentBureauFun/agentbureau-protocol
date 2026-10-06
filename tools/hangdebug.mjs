// Temporary: bisects a main-thread stall by injecting CSS/JS switches. Usage: node tools/hangdebug.mjs <width> [css]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const w = Number(process.argv[2] || 360);
const css = process.argv[3] || '';
const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'hd-'))}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch('http://127.0.0.1:9335/json')).json(); if (targets.length) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) pending.get(d.id)(d); };
const send = (method, params = {}, ms = 8000) => new Promise((res, rej) => { const n = ++id; const t = setTimeout(() => rej(new Error('timeout ' + method)), ms); pending.set(n, (d) => { clearTimeout(t); res(d); }); ws.send(JSON.stringify({ id: n, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: w < 800 ? 3 : 1, mobile: w < 800 });
await send('Page.enable');
if (css) await send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.append(s)})` });
await send('Page.navigate', { url: 'http://localhost:4517/' });
await sleep(5000);
for (const e of ['1+1', 'document.body.offsetHeight', 'document.documentElement.scrollWidth']) {
  const t0 = Date.now();
  try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }, 8000); console.log(e, '=>', JSON.stringify(r.result?.result?.value), Date.now() - t0 + 'ms'); } catch (x) { console.log(e, 'HANG', x.message); break; }
}
proc.kill(); process.exit(0);
