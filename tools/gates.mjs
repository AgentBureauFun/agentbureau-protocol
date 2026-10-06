// Gates: 30 checks, synthetic fixtures only, virtual clock. Exits non-zero on any failure.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, faviconSvg } from './build.mjs';
import { renderPage, caSlot, socialCluster, infoTiles } from '../src/page.js';
import { byId, hrefFor, handleFor, hostFor, validateRegister, publicRegister, STATES } from '../src/lib/register.js';
import { isBase58Address, contractBranch } from '../src/lib/gate.js';
import { nextDelay } from '../src/lib/backoff.js';
import { createPoller } from '../src/lib/poll.js';
import { nextHealth } from '../src/lib/health.js';
import { parseTvl } from '../src/lib/llama.js';
import { parsePairs } from '../src/lib/dex.js';
import { fmtInt, fmtCompactUsd, fmtPct, fmtPrice, easeOutCubic, DASH } from '../src/lib/format.js';
import { fetchSlot } from '../src/lib/solana.js';
import { samples, mixes, tokensCss, paletteHexes } from '../src/tokens.mjs';
import { readPng } from './png.mjs';
import { cspString, headerCsp, LIVE_ORIGINS } from '../src/csp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (...p) => readFileSync(join(root, ...p), 'utf8');
const TEXT = /\.(md|mjs|js|css|json|svg|html|txt|py)$|_headers$|LICENSE$/;
const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};

// ---- fixtures ----
let seed = 0x5eed;
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const rand58 = (n) => Array.from({ length: n }, () => B58[(rng() * B58.length) | 0]).join('');
const FIX_CA44 = rand58(44);
const FIX_CA32 = rand58(32);
const FIX_X = 'https://x.example-fixture.test/bureau_fixture/';
const FIX_GH = 'https://github.example-fixture.test/bureau-fixture?tab=x';
const clone = (o) => JSON.parse(JSON.stringify(o));
const withRec = (reg, id, patch) => {
  const r = clone(reg);
  Object.assign(byId(r, id), patch);
  return r;
};
const realReg = JSON.parse(rd('src', 'register.json'));
const pubReg = publicRegister(realReg);

// virtual clock env
function fakeEnv() {
  let now = 0;
  let seq = 0;
  const q = [];
  const listeners = {};
  const doc = {
    hidden: false,
    addEventListener: (t, f) => (listeners[t] ||= []).push(f),
    removeEventListener: (t, f) => (listeners[t] = (listeners[t] || []).filter((x) => x !== f)),
    fire: (t) => (listeners[t] || []).forEach((f) => f())
  };
  const env = {
    doc,
    rng: () => 0.5,
    setTimeout: (f, ms) => {
      const id = ++seq;
      q.push({ id, at: now + ms, f });
      return id;
    },
    clearTimeout: (id) => {
      const i = q.findIndex((t) => t.id === id);
      if (i >= 0) q.splice(i, 1);
    }
  };
  const flush = () => new Promise((r) => setImmediate(r));
  const advance = async (ms) => {
    const end = now + ms;
    await flush();
    for (;;) {
      q.sort((a, b) => a.at - b.at);
      if (!q.length || q[0].at > end) break;
      const t = q.shift();
      now = t.at;
      t.f();
      await flush();
    }
    now = end;
  };
  return { env, doc, advance, pending: () => q.length };
}

// ---- predicates reused by the mutation gates ----
const socialHtml = (html) => (html.match(/<div class="social"[\s\S]*?<\/div>/) || [''])[0];
const socialHasHref = (html) => /href=/.test(socialHtml(html));
const caIsInert = (html) => /ca-btn is-inert/.test(html) && /aria-disabled="true"/.test(html) && !/data-copy=/.test(html) && !/<button[^>]*class="ca-btn"/.test(html);
const caIsLive = (html, addr) => html.includes(`>${addr}</span>`) && html.includes(`data-copy="${addr}"`) && /<button[^>]*class="ca-btn"/.test(html) && !/is-inert/.test(html);
const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/g, ' ');

const gates = [];
const gate = (name, fn) => gates.push({ name, fn });
const ok = (c, m) => {
  if (!c) throw new Error(m);
};

// 1
gate('register: valid records, enum states, public copy has no bookkeeping', () => {
  ok(validateRegister(realReg).length === 0, validateRegister(realReg).join(';'));
  for (const r of realReg.records) ok(STATES.includes(r.state), r.id);
  ok(pubReg.records.every((r) => !('recorded' in r) && !('dated' in r)), 'bookkeeping leaked');
  ok(!JSON.stringify(pubReg).match(/\d{4}-\d{2}-\d{2}/), 'date in public register');
  ok(validateRegister({ records: [{ id: 'a', state: 'stated', value: null }] }).length > 0, 'validator blind to stated-without-value');
});
// 2
gate('contract gate: accepts every base58 string of 32-44 characters', () => {
  for (let n = 32; n <= 44; n++)
    for (let i = 0; i < 150; i++) ok(isBase58Address(rand58(n)), `rejected valid base58 length ${n}`);
  ok(isBase58Address(rand58(40) + 'pump'), 'rejected pump suffix');
  ok(isBase58Address('1' + rand58(43)), 'rejected leading 1');
  ok(isBase58Address('So11111111111111111111111111111111111111112'), 'rejected well-formed address');
});
// 3
gate('contract gate: rejects only wrong length or non-base58', () => {
  ok(!isBase58Address(rand58(31)) && !isBase58Address(rand58(45)), 'length bounds');
  for (const bad of ['0', 'O', 'I', 'l', '+', ' ']) ok(!isBase58Address(rand58(40) + bad + 'A'.repeat(1)), `accepted ${JSON.stringify(bad)}`);
  ok(!isBase58Address('0x' + 'a'.repeat(40)), 'accepted 0x hex');
  ok(!isBase58Address('') && !isBase58Address(null) && !isBase58Address(undefined) && !isBase58Address(5), 'non-strings');
});
// 4
gate('branch absent: contract slot inert, nothing copyable', () => {
  const html = caSlot(withRec(pubReg, 'contract', { state: 'absent', value: null }));
  ok(caIsInert(html), html);
  ok(contractBranch(byId(withRec(pubReg, 'contract', { state: 'absent', value: null }), 'contract')) === 'absent', 'branch');
});
// 5
gate('branch stated: full address, click-to-copy, 32 and 44 characters', () => {
  for (const a of [FIX_CA44, FIX_CA32]) {
    const html = caSlot(withRec(pubReg, 'contract', { state: 'stated', value: a }));
    ok(caIsLive(html, a), `stated slot wrong for ${a.length}`);
    ok(html.includes(`aria-label="Copy contract address ${a}"`) && html.includes('data-ca-fb'), 'copy feedback hooks');
  }
});
// 6
gate('branch unconfirmed: slot stays inert', () => {
  const html = caSlot(withRec(pubReg, 'contract', { state: 'unconfirmed', value: null }));
  ok(caIsInert(html), html);
});
// 7
gate('link rule: href only for stated records, handle derived from the stored URL', () => {
  const live = renderPage(pubReg);
  const hrefs = [...socialHtml(live).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const expected = ['x', 'github'].map((id) => hrefFor(byId(pubReg, id))).filter(Boolean);
  ok(JSON.stringify(hrefs) === JSON.stringify(expected), 'social hrefs ' + hrefs + ' != register ' + expected);
  for (const id of ['x', 'github']) {
    const rec = byId(pubReg, id);
    if (rec.state === 'stated') ok(socialHtml(live).includes('aria-label="' + (id === 'x' ? 'X' : 'GitHub') + ': ' + handleFor(rec) + '"'), id + ' handle label');
  }
  const none = withRec(withRec(pubReg, 'x', { state: 'absent', value: null }), 'github', { state: 'absent', value: null });
  ok(!socialHasHref(renderPage(none)), 'href while records absent');
  ok(hrefFor(byId(none, 'x')) === null && handleFor(byId(none, 'github')) === null, 'absent yields link');
  const reg = withRec(withRec(pubReg, 'x', { state: 'stated', value: FIX_X }), 'github', { state: 'stated', value: FIX_GH });
  const html = socialCluster(reg);
  ok(html.includes('href="' + FIX_X + '"') && html.includes('href="' + FIX_GH + '"'), 'stated href missing');
  ok(handleFor(byId(reg, 'x')) === 'bureau_fixture' && handleFor(byId(reg, 'github')) === 'bureau-fixture', 'handle derivation');
  ok(/rel="noopener noreferrer"/.test(html), 'rel');
  ok(!socialHasHref(socialCluster(withRec(none, 'x', { state: 'unconfirmed', value: null }))), 'unconfirmed linked');
  const x = byId(pubReg, 'x');
  if (x.state === 'stated') ok(/^https:\/\/x\.com\/[A-Za-z0-9_]+$/.test(x.value) && rd('dist', 'index.html').includes('href="' + x.value + '"'), 'X not wired in dist');
});
// 8
const hrefCount = (html) => (socialHtml(html).match(/href=/g) || []).length;
gate('mutation: flipping the current record flips output, restoring is exact', () => {
  for (const id of ['contract', 'x', 'github']) {
    const cur = byId(pubReg, id);
    const wasStated = cur.state === 'stated';
    const fixValue = id === 'contract' ? FIX_CA44 : id === 'x' ? FIX_X : FIX_GH;
    const flipped = withRec(pubReg, id, wasStated ? { state: 'absent', value: null } : { state: 'stated', value: fixValue });
    const before = renderPage(pubReg);
    const after = renderPage(flipped);
    ok(before !== after, id + ': flip changed nothing');
    if (id === 'contract') ok(wasStated ? caIsInert(caSlot(flipped)) : caIsLive(caSlot(flipped), FIX_CA44), 'contract flip direction');
    else ok(hrefCount(after) === hrefCount(before) + (wasStated ? -1 : 1), id + ' flip direction');
    const back = withRec(flipped, id, wasStated ? { state: 'stated', value: cur.value } : { state: 'absent', value: null });
    ok(renderPage(back) === before, id + ': restore differs');
  }
});
// 9
gate('mutation: predicates catch corrupted output (anchors read at runtime)', () => {
  // anchor: whichever social control is inert right now; if none is, make one inert first
  let reg9 = pubReg;
  if (!/icon-btn is-inert/.test(socialHtml(renderPage(reg9)))) reg9 = withRec(pubReg, 'github', { state: 'absent', value: null });
  const html = renderPage(reg9);
  const anchor = socialHtml(html).match(/<span class="icon-btn is-inert"/)[0];
  const corrupted = html.replace(anchor, anchor + ' href="https://evil.test"');
  ok(hrefCount(corrupted) === hrefCount(html) + 1, 'href predicate dead');
  const caNow = caSlot(pubReg);
  const inertNow = caIsInert(caNow);
  const broken = inertNow ? caNow.replace(' is-inert', '') : caNow.replace('data-copy=', 'data-x=');
  ok(caIsInert(broken) !== inertNow, 'ca predicate blind to corruption');
});
// 10
gate('info tiles: Chain, Contract, RPC only; no X or GitHub tile', () => {
  for (const reg of [pubReg, withRec(pubReg, 'contract', { state: 'stated', value: FIX_CA44 })]) {
    const t = infoTiles(reg);
    const labels = [...t.matchAll(/<dt[^>]*>([^<]*)<\/dt>/g)].map((m) => m[1]);
    ok(JSON.stringify(labels) === JSON.stringify(['Chain', 'Contract', 'RPC']), labels.join());
    ok(!/data-tile="(x|github)"/.test(t), 'social tile');
  }
  ok(infoTiles(withRec(pubReg, 'contract', { state: 'stated', value: FIX_CA44 })).includes('title="' + FIX_CA44.slice(0, 4)), 'contract tile follows record');
  ok(hostFor(byId(pubReg, 'rpc')) === 'solana-rpc.publicnode.com', 'rpc host derived');
});
// 11
gate('palette: every colour literal is a real logo pixel (coordinates re-read from the PNG)', () => {
  const png = readPng(join(root, 'brand', 'LOGO  BUREAU PNG.png'));
  ok(png.w === 2000 && png.h === 2000, 'logo size');
  const hex = (p) => '#' + p.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
  for (const smp of samples) {
    ok(Number.isInteger(smp.x) && Number.isInteger(smp.y) && smp.x >= 0 && smp.y >= 0 && smp.x < png.w && smp.y < png.h, smp.id + ' coordinate');
    ok(hex(png.px(smp.x, smp.y)) === smp.hex, smp.id + ' ' + smp.hex + ' is not the pixel at ' + smp.x + ',' + smp.y);
  }
  const css = tokensCss();
  const lits = [...css.matchAll(/#[0-9a-f]{6}\b/g)].map((m) => m[0]);
  ok(lits.length === samples.length && lits.every((h) => paletteHexes.includes(h)), 'literal outside sampled set');
  const ids = new Set(samples.map((x) => x.id));
  ok(mixes.every(([id, a, b, p]) => !ids.has(id) && ids.has(a) && ids.has(b) && p > 0 && p < 100), 'derived steps must mix sampled colours');
  for (let i = 0; i <= 13; i++) ok(css.includes('--k' + i + ':'), 'k' + i + ' undefined');
});
// 12
gate('palette: colour literals appear only in the tokens file; no ch units', () => {
  const bad = [];
  for (const f of walk(join(root, 'src'))) {
    if (f.endsWith('tokens.mjs') || !TEXT.test(f)) continue;
    const s = readFileSync(f, 'utf8');
    const hit = s.match(/#[0-9a-fA-F]{3,8}\b(?![\w-])|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(black|white|red|green|blue|gold|purple|pink|orange|yellow|gray|grey)\b\s*[;,)]/);
    if (hit) bad.push(relative(root, f) + ': ' + hit[0]);
    if (/(^|[^\w.])-?\d*\.?\d+ch\b/.test(s)) bad.push(relative(root, f) + ': ch unit');
  }
  ok(!bad.length, bad.join(' | '));
});
// 13
gate('favicon: 32x32 svg traced from the logo pixel grid, brand colours, no comments', () => {
  const svg = faviconSvg();
  ok(/width="32" height="32"/.test(svg) && /viewBox="0 0 32 32"/.test(svg), 'size');
  ok(!svg.includes('<!--') && !svg.includes('--'), 'comment or double hyphen');
  ok(!/<(path|circle|image|style|script)/.test(svg), 'non-pixel element');
  const rects = [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1" fill="(#[0-9a-f]{6})"\/>/g)];
  ok(rects.length > 40 && rects.every((r) => paletteHexes.includes(r[4])), 'fills outside the sampled palette');
  const mark = readPng(join(root, 'src', 'assets', 'img', 'mark-32.png'));
  const cover = new Set();
  for (const r of rects) for (let i = 0; i < +r[3]; i++) cover.add((+r[1] + i) + ',' + r[2]);
  let want = 0;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (mark.px(x, y)[3] >= 128) { want++; ok(cover.has(x + ',' + y), 'pixel ' + x + ',' + y + ' untraced'); }
  ok(cover.size === want, 'traced pixels beyond the mask');
  ok(/<link rel="icon"[^>]*favicon\.svg/.test(renderPage(pubReg)), 'not linked');
});
// 14
gate('csp: every live origin covered, no unsafe directives, no inline code', () => {
  const html = rd('dist', 'index.html');
  const headers = rd('dist', '_headers');
  for (const o of [...LIVE_ORIGINS.connect, ...LIVE_ORIGINS.img]) ok(html.includes(o) && headers.includes(o), `missing ${o}`);
  ok(!/unsafe-inline|unsafe-eval/.test(html + headers), 'unsafe directive');
  ok(headers.includes("frame-ancestors 'none'") && headerCsp().includes('connect-src'), 'header csp');
  const used = new Set();
  for (const f of ['src/lib/llama.js', 'src/lib/dex.js']) for (const m of rd(f).matchAll(/https:\/\/[a-z0-9.-]+/g)) used.add(m[0]);
  used.add(new URL(byId(pubReg, 'rpc').value).origin);
  for (const o of used) ok(cspString().includes(o) || /dexscreener\.com/.test(o) && cspString().includes('api.dexscreener.com') || o === 'https://dexscreener.com', `fetch origin ${o} not in connect-src`);
  ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html) && !/\sstyle="/.test(html) && !/\son[a-z]+="/.test(html), 'inline code in html');
});
// 15
gate('backoff: exponential, capped, jitter within bounds', () => {
  const o = { base: 1000, max: 20000 };
  let prev = 0;
  for (let f = 1; f <= 5; f++) {
    const exp = Math.min(20000, 1000 * 2 ** f);
    const lo = nextDelay(f, { ...o, rng: () => 0 });
    const hi = nextDelay(f, { ...o, rng: () => 0.999999 });
    ok(lo === Math.round(exp / 2) && hi <= exp && hi > lo, `bounds at ${f}`);
    ok(lo >= prev, 'not growing');
    prev = lo;
  }
  ok(nextDelay(12, { ...o, rng: () => 0.999999 }) <= 20000, 'cap');
  ok(nextDelay(0, { ...o, rng: () => 0.5 }) === 1000, 'steady cadence');
});
// 16
gate('poller: pauses while hidden, resumes with an immediate run', async () => {
  const c = fakeEnv();
  let runs = 0;
  let pauses = 0;
  const p = createPoller({ env: c.env, base: 1000, max: 8000, task: async () => ++runs, onPause: () => pauses++ });
  p.start();
  await c.advance(5000);
  ok(runs >= 4, `steady runs ${runs}`);
  c.doc.hidden = true;
  c.doc.fire('visibilitychange');
  const at = runs;
  await c.advance(600000);
  ok(runs === at && pauses === 1, 'ran while hidden');
  c.doc.hidden = false;
  c.doc.fire('visibilitychange');
  await c.advance(1);
  ok(runs === at + 1, 'no immediate resume');
  p.stop();
});
// 17
gate('poller + health: failures back off and go Offline, success recovers to Live', async () => {
  const c = fakeEnv();
  let n = 0;
  const times = [];
  let health = 'connecting';
  const seen = [];
  const p = createPoller({
    env: c.env,
    base: 1000,
    max: 60000,
    task: async () => {
      times.push(Date.now());
      if (++n <= 4) throw new Error('down');
      return 1;
    },
    onOk: () => seen.push((health = nextHealth(health, { ok: true }))),
    onError: (_e, fails) => seen.push((health = nextHealth(health, { ok: false, fails })))
  });
  p.start();
  await c.advance(600000);
  ok(seen[0] === 'connecting' && seen[2] === 'offline', seen.join());
  ok(seen.includes('offline') && seen[seen.length - 1] === 'live', 'no recovery');
  ok(p.fails === 0, 'fails not reset');
  ok(nextHealth('live', { ok: false, fails: 1 }) === 'live', 'one blip should not flip a live pill');
  p.stop();
});
// 18
gate('defillama: matches slug solana, dash on miss', () => {
  ok(parseTvl([{ name: 'Ethereum', tvl: 1e9 }, { name: 'Solana', tvl: 5e9 }]) === 5e9, 'match');
  ok(parseTvl([{ name: ' SOLANA ', tvl: 7 }]) === 7, 'case');
  ok(parseTvl([{ name: 'Solana Fake', tvl: 1 }]) === null && parseTvl({}) === null && parseTvl([{ name: 'Solana', tvl: 'x' }]) === null, 'miss');
});
// 19
gate('dexscreener: solana-tagged pairs, volume order, logo allow-list', () => {
  const mk = (id, chain, vol, img) => ({ chainId: chain, pairAddress: id, priceUsd: '1.5', volume: { h24: vol }, baseToken: { symbol: 'AAA' }, quoteToken: { symbol: 'BBB' }, dexId: 'd', url: 'https://dexscreener.com/solana/' + id, info: { imageUrl: img }, priceChange: { h24: 2 } });
  const out = parsePairs({ pairs: [mk('a', 'solana', 5, 'https://cdn.dexscreener.com/x.png'), mk('b', 'base', 99), mk('c', 'solana', 50, 'https://evil.test/x.png'), { chainId: 'solana', pairAddress: 'z', priceUsd: 'n/a', volume: { h24: 1 } }] }, 5);
  ok(out.map((p) => p.id).join() === 'c,a', out.map((p) => p.id).join());
  ok(out[0].img === null && out[1].img.startsWith('https://cdn.dexscreener.com/'), 'logo allow-list');
  ok(parsePairs(null).length === 0 && parsePairs({ pairs: 'x' }).length === 0, 'garbage');
  ok(parsePairs({ pairs: Array.from({ length: 20 }, (_, i) => mk('p' + i, 'solana', i)) }, 8).length === 8, 'limit');
});
// 20
gate('formatters: dash fallback, compact units, signed pct, easing', () => {
  for (const f of [fmtInt, fmtCompactUsd, fmtPct, fmtPrice]) ok(f(NaN) === DASH && f(null) === DASH && f(undefined) === DASH && f(Infinity) === DASH, f.name);
  ok(fmtCompactUsd(6.79e9) === '$6.79B' && fmtCompactUsd(2.5e6) === '$2.50M' && fmtCompactUsd(1500) === '$1.50K', 'compact');
  ok(fmtPct(1.234) === '+1.23%' && fmtPct(-0.5) === '-0.50%', 'pct');
  ok(easeOutCubic(0) === 0 && easeOutCubic(1) === 1 && easeOutCubic(0.5) > 0.5, 'easing');
});
// 21
gate('rpc: getSlot request shape, rejects bad answers', async () => {
  let sent;
  const good = async (url, init) => ((sent = JSON.parse(init.body)), { ok: true, json: async () => ({ result: 123 }) });
  ok((await fetchSlot(good, 'https://rpc.test')) === 123 && sent.method === 'getSlot', 'ok path');
  for (const bad of [async () => ({ ok: false, status: 500 }), async () => ({ ok: true, json: async () => ({ result: 'x' }) }), async () => ({ ok: true, json: async () => ({ error: {} }) })]) {
    let threw = false;
    try {
      await fetchSlot(bad, 'https://rpc.test');
    } catch {
      threw = true;
    }
    ok(threw, 'bad answer accepted');
  }
});
// 22
gate('dist: structure, local references resolve, live hooks and skeletons present', () => {
  const dist = join(root, 'dist');
  const html = rd('dist', 'index.html');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) ok(existsSync(join(dist, m[1])), `missing ${m[1]}`);
  for (const f of walk(join(dist, 'assets', 'js')))
    for (const m of readFileSync(f, 'utf8').matchAll(/from '(\.[^']+)'/g)) ok(existsSync(resolve(dirname(f), m[1])), `${relative(dist, f)} -> ${m[1]}`);
  for (const hook of ['data-slot', 'data-tvl', 'data-pairs', 'data-health-pill', 'data-matrix', 'data-rain', 'data-lattice', 'data-progress']) ok(html.includes(hook), hook);
  ok((html.match(/is-skel/g) || []).length >= 8, 'skeleton rows');
  const css = rd('dist', 'assets', 'app.css');
  for (const s of ['connecting', 'live', 'offline']) ok(css.includes(`[data-health='${s}']`), `pill ${s}`);
  ok(/@keyframes pulse/.test(css) && /@keyframes ping/.test(css), 'pulse keyframes');
  ok(existsSync(join(dist, '_headers')) && existsSync(join(dist, 'favicon.svg')), 'deploy files');
});
// 23
gate('dates: nothing date-like in anything shipped', () => {
  for (const f of walk(join(root, 'dist'))) {
    if (!TEXT.test(f)) continue;
    const s = readFileSync(f, 'utf8');
    ok(!/\b(19|20)\d\d[-/.]\d{1,2}[-/.]\d{1,2}\b/.test(s), `iso date in ${relative(root, f)}`);
    ok(!/\b(January|February|March|April|June|July|August|September|October|November|December)\s+(\d{1,2}(,|\s)\s*)?(19|20)\d\d\b/.test(s), `long date in ${f}`);
    ok(!/"recorded"/.test(s), `bookkeeping field in ${f}`);
  }
});
// 24
gate('social: both icons, top-right, icon-only, never hidden at any breakpoint', () => {
  const html = renderPage(pubReg);
  const header = html.match(/<header class="topbar"[\s\S]*?<\/header>/)[0];
  ok(header.trimEnd().replace(/<\/header>$/, '').trimEnd().endsWith('</div>') && header.lastIndexOf('class="social"') > header.lastIndexOf('class="ca"'), 'social not last');
  ok(/data-social="x"/.test(header) && /data-social="github"/.test(header), 'icons');
  for (const m of header.matchAll(/<(?:span|a) class="icon-btn[^>]*>([\s\S]*?)<\/(?:span|a)>/g)) ok(m[1].replace(/<svg[\s\S]*?<\/svg>/g, '').trim() === '', 'text label inside icon');
  ok(header.includes('M18.244 2.25h3.308') && header.includes('M8 0c4.42 0 8 3.58 8 8'), 'official marks');
  const css = rd('src', 'css', 'app.css');
  for (const m of css.matchAll(/[^{}]*(\.social|\.icon-btn)[^{}]*\{([^}]*)\}/g)) ok(!/display:\s*none|visibility:\s*hidden/.test(m[2]), `hidden: ${m[0].slice(0, 60)}`);
});
// 25
gate('logo: premultiplied resize, no dark fringes, shipped and referenced', () => {
  const cut = readPng(join(root, 'brand', 'LOGO  BUREAU PNG...png'));
  ok(cut.ct === 6, 'cut-out is not colour type 6');
  let a0black = 0;
  for (let i = 0; i < cut.data.length; i += 4) if (cut.data[i + 3] === 0 && cut.data[i] + cut.data[i + 1] + cut.data[i + 2] === 0) a0black++;
  ok(a0black > 1e6, 'expected pure-black transparent regions');
  const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  for (const f of ['logo-192.png', 'mark-32.png']) {
    const im = readPng(join(root, 'src', 'assets', 'img', f));
    let edge = 0, ne = 0, solid = 0, ns = 0;
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
      const p = im.px(x, y);
      if (p[3] === 255) { solid += lum(p); ns++; }
      else if (p[3] > 40) { edge += lum(p); ne++; }
    }
    ok(ns > 100 && ne > 5, f + ' has no edge pixels');
    ok(edge / ne >= 0.6 * (solid / ns), f + ' edge pixels are dark: fringe');
  }
  const html = rd('dist', 'index.html');
  for (const f of ['logo-768.webp', 'logo-96.webp']) ok(html.includes(f) && existsSync(join(root, 'dist', 'assets', 'img', f)), f);
  ok(existsSync(join(root, 'dist', 'assets', 'img', 'logo-192.png')), 'touch icon');
});
// 26
gate('reduced motion: global rule, canvases and counters honour it', () => {
  const css = rd('src', 'css', 'app.css');
  ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/.test(css), 'css rule');
  ok(/\.js \[data-reveal\] \{ opacity: 1/.test(css), 'reveal fallback');
  for (const f of ['rain.js', 'lattice.js', 'util.js', 'ui.js']) ok(/reduced\(\)/.test(rd('src', 'js', f)), `${f} ignores reduced motion`);
  ok(/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/.test(rd('src', 'js', 'util.js')), 'media query');
});
// 27
gate('tap targets: interactive controls declare at least 44px', () => {
  const css = rd('src', 'css', 'app.css');
  const need = ['.icon-btn', '.btn', '.zoom-btn', '.chap-btn', '.ca-btn', '.brief-btn', '.brief-x', '.brief-nav a', '.doc', '.pair', '.v-in', '.brand'];
  for (const sel of need) {
    const re = new RegExp('(^|\\n)' + sel.replace(/[.]/g, '\\.') + ' \\{([^}]*)\\}');
    const m = css.match(re);
    ok(m, `no rule for ${sel}`);
    const h = m[2].match(/min-height:\s*(\d+)px/) || m[2].match(/height:\s*(\d+)px/);
    ok(h && +h[1] >= 44, `${sel} height`);
  }
  for (const sel of ['.icon-btn', '.zoom-btn', '.brief-x']) ok(new RegExp(sel.replace('.', '\\.') + ' \\{[^}]*width: 44px').test(css), `${sel} width`);
});
// 28
gate('copy: no 2-gram shared with the reference site', () => {
  const ref = rd('reference', 'ref-text.txt').toLowerCase();
  const toks = (s) => s.toLowerCase().match(/[a-z0-9']+/g) || [];
  const grams = (s) => {
    const t = toks(s);
    const g = new Set();
    for (let i = 0; i < t.length - 1; i++) g.add(t[i] + ' ' + t[i + 1]);
    return g;
  };
  const refG = grams(ref);
  let ours = visibleText(rd('dist', 'index.html'));
  for (const f of walk(join(root, 'src', 'js'))) if (!f.includes('lib')) for (const m of readFileSync(f, 'utf8').matchAll(/['`]([^'`\n$]{6,})['`]/g)) if (/ /.test(m[1]) && /[a-z]{3}/i.test(m[1]) && !/[{}=;()]/.test(m[1])) ours += '\n' + m[1];
  const hits = [...grams(ours)].filter((g) => refG.has(g));
  ok(!hits.length, 'shared: ' + hits.join(' | '));
  for (const w of ['cortex', 'jev', 'desk-pink', 'degen', 'rug']) ok(!ours.toLowerCase().includes(w), `reference word ${w}`);
});
// 29
gate('repo hygiene: no CLAUDE.md, no .claude, no AI attribution', () => {
  ok(!existsSync(join(root, 'CLAUDE.md')) && !existsSync(join(root, '.claude')), 'forbidden path');
  const skip = (f) => /node_modules|[\\/]reference[\\/]|gates\.mjs$|extract-ref\.mjs$/.test(f);
  for (const f of walk(root)) {
    if (skip(f) || !/\.(md|mjs|js|css|json|svg|html|txt|_?headers)$|LICENSE$/.test(f)) continue;
    const s = readFileSync(f, 'utf8');
    ok(!/anthropic|claude|co-authored-by|generated (by|with)|\bas an ai\b|\bai[- ]generated\b/i.test(s), `attribution in ${relative(root, f)}`);
  }
});
// 30
gate('supporting files present, themed, licensed', () => {
  for (const f of ['README.md', 'docs/whitepaper.md', 'docs/tokenomics.md', 'docs/roadmap.md', 'docs/architecture.md', '.github/CONTRIBUTING.md', '.github/SECURITY.md', 'LICENSE']) {
    ok(existsSync(join(root, f)) && rd(f).length > 400, `${f} missing or thin`);
    if (f !== 'LICENSE') ok(/Bureau/.test(rd(f)), `${f} not themed`);
  }
  ok(/MIT License/.test(rd('LICENSE')), 'license');
  ok(existsSync(join(root, 'dist', 'docs', 'whitepaper.md')), 'docs not shipped');
});

build();
let failed = 0;
const t0 = Date.now();
for (let i = 0; i < gates.length; i++) {
  const g = gates[i];
  try {
    await g.fn();
    console.log(`ok   ${String(i + 1).padStart(2)}  ${g.name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${String(i + 1).padStart(2)}  ${g.name}\n       ${String(e.message).slice(0, 600)}`);
  }
}
const cur = (id) => `${id}=${byId(pubReg, id).state}`;
console.log(`\nbranches proven for contract, x, github (current: ${cur('contract')}, ${cur('x')}, ${cur('github')}); both flips exercised by gate 8`);
console.log(`${gates.length - failed}/${gates.length} gates passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(failed ? 1 : 0);
