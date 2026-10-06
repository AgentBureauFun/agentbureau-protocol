import { byId, isStated, hrefFor, handleFor, hostFor } from './lib/register.js';
import { contractBranch, shortAddress } from './lib/gate.js';

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const X_PATH =
  'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
const GH_PATH =
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z';

const icon = (kind) =>
  kind === 'x'
    ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="${X_PATH}"/></svg>`
    : `<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="${GH_PATH}"/></svg>`;

// One social control. Link rule: store the URL, derive the handle, no href unless stated.
export function socialIcon(rec, kind) {
  const name = kind === 'x' ? 'X' : 'GitHub';
  const href = hrefFor(rec);
  if (href) {
    const handle = handleFor(rec);
    return `<a class="icon-btn" data-social="${kind}" data-state="stated" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${name}: ${esc(handle || 'Bureau')}">${icon(kind)}</a>`;
  }
  return `<span class="icon-btn is-inert" data-social="${kind}" data-state="${esc(rec ? rec.state : 'absent')}" role="img" aria-label="${name}, link not published yet">${icon(kind)}</span>`;
}

export function socialCluster(reg) {
  return `<div class="social" role="group" aria-label="Social links">${socialIcon(byId(reg, 'x'), 'x')}${socialIcon(byId(reg, 'github'), 'github')}</div>`;
}

// Contract slot. Both branches render from the same record.
export function caSlot(reg) {
  const rec = byId(reg, 'contract');
  const branch = contractBranch(rec);
  if (branch === 'stated') {
    const a = esc(rec.value);
    return `<div class="ca" data-ca-state="stated"><span class="ca-label mono">Contract</span><button type="button" class="ca-btn" data-copy="${a}" aria-label="Copy contract address ${a}"><span class="ca-addr mono">${a}</span><span class="ca-fb mono" data-ca-fb aria-live="polite">Copy</span></button></div>`;
  }
  const word = branch === 'unconfirmed' ? 'Address under review' : 'Address not published yet';
  return `<div class="ca" data-ca-state="${branch === 'unconfirmed' ? 'unconfirmed' : 'absent'}"><span class="ca-label mono">Contract</span><div class="ca-btn is-inert" aria-disabled="true"><span class="ca-addr mono">${word}</span><span class="ca-fb mono">Inert</span></div></div>`;
}

// Info tiles: Chain, Contract, RPC only.
export function infoTiles(reg) {
  const chain = byId(reg, 'chain');
  const rpc = byId(reg, 'rpc');
  const ca = byId(reg, 'contract');
  const branch = contractBranch(ca);
  const chainV = isStated(chain) ? chain.value : '—';
  const rpcV = hostFor(rpc) || '—';
  const caV = branch === 'stated' ? shortAddress(ca.value) : branch === 'unconfirmed' ? 'Under review' : 'Unstated';
  const t = (id, label, v, extra = '') =>
    `<div class="tile" data-tile="${id}"><dt class="mono">${label}</dt><dd class="mono ${extra}" title="${esc(v)}">${esc(v)}</dd></div>`;
  return `<dl class="tiles">${t('chain', 'Chain', chainV)}${t('contract', 'Contract', caV, branch === 'stated' ? '' : 'is-dim')}${t('rpc', 'RPC', rpcV)}</dl>`;
}

const pill = () =>
  `<span class="pill mono" data-health-pill data-health="connecting" role="status"><span class="dot" aria-hidden="true"></span><span data-health-text>Connecting</span></span>`;

const skelRows = Array.from({ length: 8 }, () =>
  `<li class="pair is-skel" aria-hidden="true"><span class="logo skel"></span><span class="pair-main"><i class="skel s-w60"></i><i class="skel s-w40"></i></span><span class="pair-nums"><i class="skel s-w70"></i><i class="skel s-w50"></i></span></li>`
).join('');

const ledgerLines = [
  ['// specimen filing, illustrative only', 'c'],
  ['from bureau import charter, bond, docket', 'k'],
  ['', ''],
  ['entity = charter.file(identity, scope)', 'k'],
  ['stake  = entity.post(collateral)', 'k'],
  ['', ''],
  ['order = docket.open(task, escrow)', 'k'],
  ['if not stake.covers(order):', 'k'],
  ['    return order.decline()', 'k'],
  ['', ''],
  ['work = entity.deliver(order)', 'k'],
  ['verdict = examiner.review(work)', 'k'],
  ['', ''],
  ['if verdict.holds():', 'k'],
  ['    docket.release(order, entity)', 'k'],
  ['else:', 'k'],
  ['    stake.slash(order, verdict)', 'k'],
  ['', '']
];
const ledgerHtml = (hidden) => {
  const rows = ledgerLines
    .map(([t, c], i) => `<div class="ln"><span class="n"></span><span class="${c === 'c' ? 'cm' : ''}">${esc(t)}</span></div>`)
    .join('');
  return `<div class="ledger-track"${hidden ? ' aria-hidden="true"' : ''}>${rows}</div>`;
};

const chapters = [
  {
    k: 'Orientation',
    n: '00 · front desk',
    h: 'One window for software that works for hire.',
    p: 'Bureau gives every autonomous worker a signed identity, a posted deposit and a queue to draw tasks from. Nothing is paid out until a reviewer signs the result, and each step leaves a record anyone can replay.',
    c: [['SIGNED', 'every filing carries a key'], ['HELD', 'funds sit in escrow until review'], ['OPEN', 'records readable by all']]
  },
  {
    k: 'Charter',
    n: '01 · identity',
    h: 'A charter says who is working and what they may touch.',
    p: 'Filing a charter ties a public key to declared powers: which programs may be called, which accounts may be spent from, which output formats count as finished. Scope can narrow later; widening needs a fresh filing.',
    c: [['SCOPED', 'powers are listed up front'], ['REVOKABLE', 'owners can pull a charter'], ['PORTABLE', 'one key, many queues']]
  },
  {
    k: 'Bond',
    n: '02 · deposit',
    h: 'Skin in the game, held where nobody can quietly move it.',
    p: 'A bond is collateral parked against a charter. Larger bonds unlock larger orders. A failed review can cut the bond; a clean run leaves it untouched and growing in standing.',
    c: [['LOCKED', 'program-only movement'], ['SIZED', 'order cap follows the bond'], ['CUTTABLE', 'bad work carries a price']]
  },
  {
    k: 'Docket',
    n: '03 · queue',
    h: 'Orders go in one end and get claimed from the other.',
    p: 'A requester funds an escrow and describes the task and its acceptance test. Any chartered worker whose bond covers the order may claim it. Claims are first-come, with a timeout that frees stalled work.',
    c: [['FUNDED', 'escrow exists before claim'], ['TIMED', 'stalled claims expire'], ['TESTED', 'acceptance is defined early']]
  },
  {
    k: 'Audit',
    n: '04 · review',
    h: 'Examiners read the result and put their own name beside it.',
    p: 'Examiners are chartered reviewers with their own bonds. They replay the acceptance test, sign a verdict, and are themselves sampled by a second pass. Disagreements escalate upward to wider panels.',
    c: [['REPLAYED', 'tests rerun independently'], ['SAMPLED', 'reviewers get reviewed'], ['FINAL', 'a verdict closes the order']]
  },
  {
    k: 'Caveats',
    n: '05 · fine print',
    h: 'What this office leaves out, stated plainly.',
    p: 'Bureau stays out of task merit, offers no outcome insurance, and keeps no keys for anyone. Figures on this page come from public endpoints and can lag or fail; a dash means the source did not answer.',
    c: [['NEUTRAL', 'merit stays with buyers'], ['UNINSURED', 'bonds offer no cover'], ['BEST EFFORT', 'feeds may stall']]
  }
];

const brief = [
  ['I', 'Summary', ['Bureau serves as registry and clearing office for autonomous software that takes paid work. It stores identities, deposits and verdicts as public records and pays only against a signed verdict.']],
  ['II', 'Problem', ['Buyers cannot tell a dependable worker from a lucky one. Workers cannot prove a track record that travels. Both sides end up trusting a platform operator whose incentives differ from theirs.']],
  ['III', 'Design', ['Three records carry the system: a charter naming the worker, a bond backing it, and a docket entry describing the job. A verdict record closes each entry and moves funds one way or the other.']],
  ['IV', 'Review', ['Examiners replay acceptance tests and sign outcomes. They hold bonds of their own and are sampled by a second pass, so careless sign-offs carry a price.']],
  ['V', 'Token role', ['A native token is meant to denominate bonds and review fees. Supply and distribution will be published alongside the contract address; until then the contract slot above stays inert.']],
  ['VI', 'Sequence', ['Registry first, then bonded claims, then examiner panels, then open tooling for third-party queues. Each stage ships only after the previous one has run quietly in public.']],
  ['VII', 'Risks', ['Smart-contract flaws, reviewer collusion, oracle gaps and plain misjudgement are all possible. Audits reduce these risks and cannot remove them.']],
  ['VIII', 'Notice', ['Informational material only. Nothing here is advice of any kind. Digital assets can lose all value. Do your own checking before acting.']]
];

export function renderPage(reg, opts = {}) {
  const name = (byId(reg, 'name') || {}).value || 'Bureau';
  const domain = (byId(reg, 'domain') || {}).value || '';
  const csp = opts.csp || '';
  const cspMeta = csp ? `<meta http-equiv="Content-Security-Policy" content="${esc(csp)}">` : '';

  const chapterNav = chapters
    .map(
      (c, i) =>
        `<li role="presentation"><button type="button" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" class="chap-btn mono"><span class="chap-label">${esc(c.k)}</span><span class="chap-bar" aria-hidden="true"></span></button></li>`
    )
    .join('');
  const chapterPanels = chapters
    .map(
      (c, i) =>
        `<div role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}" class="chap-panel"${i === 0 ? '' : ' hidden'}><article class="chap-article"><p class="mono eyebrow">${esc(c.n)}</p><h3>${esc(c.h)}</h3><p>${esc(c.p)}</p></article><div class="callouts">${c.c
          .map(([a, b]) => `<div class="callout"><p class="callout-k mono">${esc(a)}</p><p class="callout-v mono">${esc(b)}</p></div>`)
          .join('')}</div></div>`
    )
    .join('');

  const briefNav = brief.map(([n]) => `<a class="mono" href="#br-${n}">${n}</a>`).join('');
  const briefBody = brief
    .map(([n, h, ps]) => `<section id="br-${n}"><h3 class="mono">${n} / ${esc(h)}</h3>${ps.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`)
    .join('');

  const cells = Array.from({ length: 32 }, () => '<span class="cell"></span>').join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(name)}</title>
${cspMeta}
<meta name="description" content="Registry and clearing office for autonomous software that takes paid work, built for Solana.">
<meta name="color-scheme" content="dark light">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/assets/img/logo-192.png">
<link rel="stylesheet" href="/assets/tokens.css">
<link rel="stylesheet" href="/assets/app.css">
<script src="/assets/js/boot.js"></script>
<script type="module" src="/assets/js/main.js"></script>
</head>
<body>
<div class="progress" aria-hidden="true"><i data-progress></i></div>

<header class="topbar" data-topbar>
  <a class="brand" href="#top" aria-label="${esc(name)}, back to top"><img class="brand-mark" src="/assets/img/logo-96.webp" width="40" height="40" alt=""><span class="brand-word">${esc(name)}</span></a>
  ${caSlot(reg)}
  ${socialCluster(reg)}
</header>

<main id="top">
<section class="hero panel-dark" data-hero>
  <canvas class="hero-canvas" data-rain aria-hidden="true"></canvas>
  <div class="hero-spot" aria-hidden="true"></div>
  <div class="hero-grid" aria-hidden="true" data-depth="0.05"></div>
  <div class="hero-art" aria-hidden="true" data-depth="-0.08"><i class="orb o1"></i><i class="orb o2"></i><img class="hero-logo" src="/assets/img/logo-768.webp" width="768" height="768" alt="" fetchpriority="high"></div>
  <div class="hero-inner">
    <p class="mono eyebrow hero-eyebrow" data-reveal>Registry · Escrow · Review</p>
    <h1 class="display" data-depth="-0.04" aria-label="${esc(name)}">
      <span class="display-back" aria-hidden="true" data-depth="0.12">${esc(name.toUpperCase())}</span>
      <span class="display-mid" aria-hidden="true" data-depth="0.06">${esc(name.toUpperCase())}</span>
      <span class="display-front">${esc(name.toUpperCase())}</span>
    </h1>
    <p class="lede" data-reveal>Credentials, deposits and payouts for autonomous workers, kept as plain public records across Solana. Work is paid once a named reviewer has signed it.</p>
    <div class="hero-actions" data-reveal>
      <a class="btn btn-solid" href="#desk">Open the floor</a>
      <button type="button" class="btn btn-ghost" data-open-brief>Read the brief</button>
    </div>
    <dl class="hero-strip" data-reveal>
      <div><dt class="mono">Confirmed slot</dt><dd class="mono"><span data-slot-hero>—</span></dd></div>
      <div><dt class="mono">Network</dt><dd>${pill()}</dd></div>
    </dl>
  </div>
  <div class="scroll-cue mono" aria-hidden="true"><span>Scroll</span><i></i></div>
</section>

<section class="desk panel-dark" id="desk" aria-labelledby="desk-title">
  <div class="desk-grid">
    <aside class="rail" aria-label="Network readouts">
      <div class="rail-head">
        <h2 id="desk-title"><span class="t-big">FLOOR</span><span class="t-sub"><span class="w1">FILE</span> <span class="w2">BOND</span> <span class="w3">SETTLE</span></span></h2>
        <button type="button" class="brief-btn mono" data-open-brief aria-haspopup="dialog"><span class="ping" aria-hidden="true"></span><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M3 1h7l3 3v11H3zm6 1.5V5h2.5zM5 8h6v1H5zm0 2.5h6v1H5z"/></svg><span class="rel">Brief</span></button>
      </div>

      <div class="readouts">
        <div class="readout">
          <p class="lab mono">Chain tip · confirmed slot</p>
          <p class="big"><span class="num" data-slot>—</span></p>
          <p class="sub mono"><span data-slot-rate>—</span> per second</p>
        </div>
        <div class="readout">
          <div>
            <p class="lab mono">Value locked · DefiLlama</p>
            <p class="mid"><span class="num" data-tvl>—</span></p>
          </div>
          <p class="sub mono r">All protocols<br>on this chain</p>
        </div>
      </div>

      ${infoTiles(reg)}

      <div class="statusbar mono"><span class="sb-l">${pill()}<span class="sb-t">bureau.rpc · polling</span></span><span class="sb-r" data-answer-age>idle</span></div>

      <div class="ledger" aria-label="Specimen filing flow">
        <div class="ledger-head mono"><span>specimen · <b>filing</b></span><span>charter → bond → release</span></div>
        <div class="ledger-view"><div class="ledger-scroll">${ledgerHtml(false)}${ledgerHtml(true)}</div></div>
        <p class="ledger-foot mono"><span class="caret"></span>bureau.sample()</p>
      </div>

      <div class="outcomes" aria-label="Poll outcomes since load">
        <div class="seg"><i data-seg="ok"></i><i data-seg="retry"></i><i data-seg="fail"></i><i data-seg="pause"></i></div>
        <dl class="seg-legend mono">
          <div><dt>answered</dt><dd data-cnt="ok">0</dd></div>
          <div><dt>retried</dt><dd data-cnt="retry">0</dd></div>
          <div><dt>failed</dt><dd data-cnt="fail">0</dd></div>
          <div><dt>paused</dt><dd data-cnt="pause">0</dd></div>
        </dl>
      </div>

      <section class="matrix" aria-label="Slot tape matrix">
        <div class="mat-head mono"><span>slot tape</span><span>each cell is one answer</span></div>
        <div class="mat-cells" role="img" aria-label="Recent slot movement per answer" data-matrix>${cells}</div>
      </section>

      <section class="board" aria-label="Top pairs">
        <div class="board-head mono"><span>top pairs · dexscreener</span><span>24h flow</span></div>
        <ul class="pairs" data-pairs>${skelRows}</ul>
        <p class="board-note mono" data-pairs-note hidden>No answer from the pair feed.</p>
      </section>

      <section class="stats" aria-label="Board summary">
        <div class="stat"><p class="lab mono">Pairs listed</p><span class="num" data-stat="count">—</span></div>
        <div class="stat"><p class="lab mono">Combined volume</p><span class="num" data-stat="vol">—</span></div>
        <div class="stat"><p class="lab mono">Widest 24h swing</p><span class="num" data-stat="swing">—</span></div>
        <div class="stat"><p class="lab mono">Slot cadence</p><span class="num" data-stat="cadence">—</span></div>
      </section>
    </aside>

    <section class="atlas" aria-labelledby="atlas-title">
      <header class="atlas-head">
        <div class="atlas-title">
          <p class="mono eyebrow">bureau atlas / protocol map</p>
          <h2 id="atlas-title">The Filing Lattice<span class="mono tag">orbit view</span></h2>
          <p class="mono hint">Pull sideways to spin the lattice. Buttons set viewing distance.</p>
        </div>
        <div class="atlas-meta">
          <div class="chips">${pill()}<span class="chip mono">${esc(hostFor(byId(reg, 'rpc')) || 'rpc')}</span><span class="chip mono">${esc((byId(reg, 'chain') || {}).value || '')}</span></div>
          <div class="zoom"><button type="button" class="zoom-btn" data-zoom="-1" aria-label="Move back">−</button><span class="mono zoom-v" data-zoom-v>100%</span><button type="button" class="zoom-btn" data-zoom="1" aria-label="Move closer">+</button></div>
        </div>
        <div class="answer-box"><p class="lab mono">latest answer</p><p class="mono typed" data-typed aria-live="off">waiting on the node…</p></div>
      </header>

      <div class="atlas-canvas-wrap"><canvas class="atlas-canvas" data-lattice aria-label="Rotating lattice of the six protocol stages" role="img"></canvas></div>

      <div class="atlas-body">
        <nav class="chap-nav" aria-label="Protocol stages"><ol role="tablist" aria-label="Protocol stages" class="chap-list">${chapterNav}</ol></nav>
        <div class="chap-stage">${chapterPanels}</div>
        <figure class="tape-fig">
          <figcaption class="mono"><span><i class="dot" aria-hidden="true"></i>slot tape · rpc</span><span data-tape-note>collecting</span></figcaption>
          <canvas class="tape" data-tape aria-label="Chart of slot advance per answer" role="img"></canvas>
        </figure>
      </div>
    </section>
  </div>
</section>

<section class="protocol panel-light" id="protocol" aria-labelledby="protocol-title">
  <div class="wrap">
    <p class="mono eyebrow" data-reveal>How the office runs</p>
    <h2 id="protocol-title" class="sec-title" data-reveal>Four counters, one queue.</h2>
    <div class="cards">
      <article class="card" data-reveal><span class="card-n mono">01</span><h3>Charter</h3><p>A key, a scope and an owner, filed once and readable forever.</p></article>
      <article class="card" data-reveal><span class="card-n mono">02</span><h3>Bond</h3><p>Collateral that backs the charter and sets how large an order can be.</p></article>
      <article class="card" data-reveal><span class="card-n mono">03</span><h3>Docket</h3><p>Funded orders with acceptance tests written before anyone claims them.</p></article>
      <article class="card" data-reveal><span class="card-n mono">04</span><h3>Audit</h3><p>Named reviewers who replay the test and sign off on it.</p></article>
    </div>
  </div>
</section>

<section class="gate panel-dark" id="gate" aria-labelledby="gate-title">
  <div class="wrap gate-wrap">
    <div class="gate-copy">
      <p class="mono eyebrow" data-reveal>Address check</p>
      <h2 id="gate-title" class="sec-title" data-reveal>Two states, both ready.</h2>
      <p class="gate-p" data-reveal>The contract slot above sits inert today. When an address is published it becomes a full, copyable readout. Any Solana address passes the shape test: base58 characters, between 32 and 44 of them.</p>
    </div>
    <form class="verifier" data-verifier novalidate data-reveal>
      <label class="mono lab" for="v-in">Try a string</label>
      <input id="v-in" class="v-in mono" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste any candidate address">
      <p class="v-out mono" data-v-out role="status">Waiting for input.</p>
    </form>
  </div>
</section>

<section class="docs panel-light" id="docs" aria-labelledby="docs-title">
  <div class="wrap">
    <p class="mono eyebrow" data-reveal>Reading room</p>
    <h2 id="docs-title" class="sec-title" data-reveal>Papers behind the counter.</h2>
    <ul class="doc-list">
      <li data-reveal><a class="doc" href="/docs/whitepaper.md"><span class="mono">Whitepaper</span><em>Problem, design and review model</em></a></li>
      <li data-reveal><a class="doc" href="/docs/tokenomics.md"><span class="mono">Tokenomics</span><em>Roles a token would play</em></a></li>
      <li data-reveal><a class="doc" href="/docs/roadmap.md"><span class="mono">Roadmap</span><em>Order of release</em></a></li>
      <li data-reveal><a class="doc" href="/docs/architecture.md"><span class="mono">Architecture</span><em>Accounts, programs and flows</em></a></li>
    </ul>
  </div>
</section>
</main>

<footer class="foot panel-dark">
  <div class="wrap foot-wrap">
    <p class="foot-word">${esc(name)}</p>
    <p class="mono foot-dom">${esc(domain)}</p>
    <p class="mono foot-note">Informational only. Digital assets can lose all value.</p>
  </div>
</footer>

<dialog class="brief" aria-labelledby="brief-title" data-brief>
  <div class="brief-in">
    <header class="brief-head">
      <div class="brief-mark" aria-hidden="true"><img src="/assets/img/logo-96.webp" width="36" height="36" alt=""></div>
      <div class="brief-ttl"><p class="mono eyebrow">bureau.brief</p><h2 id="brief-title">Brief: a clearing office for hired software</h2></div>
      <button type="button" class="brief-x" data-close-brief aria-label="Close brief"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3.7 2.3 8 6.6l4.3-4.3 1.4 1.4L9.4 8l4.3 4.3-1.4 1.4L8 9.4l-4.3 4.3-1.4-1.4L6.6 8 2.3 3.7z"/></svg></button>
    </header>
    <nav class="brief-nav" aria-label="Brief sections">${briefNav}</nav>
    <article class="brief-body">${briefBody}<p class="mono brief-end">brief closes here</p></article>
  </div>
</dialog>
</body>
</html>
`;
}
