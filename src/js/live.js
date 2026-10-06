import { $, $$, setNumber, reduced } from './util.js';
import { createPoller } from './lib/poll.js';
import { nextHealth, HEALTH } from './lib/health.js';
import { fetchSlot } from './lib/solana.js';
import { LLAMA_URL, parseTvl } from './lib/llama.js';
import { DEX_URL, parsePairs } from './lib/dex.js';
import { fmtInt, fmtCompactUsd, fmtPrice, fmtPct, DASH } from './lib/format.js';

const env = { doc: document, setTimeout: (f, ms) => window.setTimeout(f, ms), clearTimeout: (t) => window.clearTimeout(t), rng: Math.random };
const getJson = async (url) => {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`http ${r.status}`);
  return r.json();
};
const fmtRate = (n) => `${n.toFixed(2)}`;

export function startLive({ rpcUrl, tape, onAnswer }) {
  let health = 'connecting';
  const counts = { ok: 0, retry: 0, fail: 0, pause: 0 };
  let prev = null;
  let lastAt = 0;
  let cell = 0;
  let rate = null;
  const cells = $$('[data-matrix] .cell');

  const setHealth = (ev) => {
    health = nextHealth(health, ev);
    for (const p of $$('[data-health-pill]')) {
      p.dataset.health = health;
      $('[data-health-text]', p).textContent = HEALTH[health];
    }
  };
  const paintCounts = () => {
    const total = Math.max(1, counts.ok + counts.retry + counts.fail + counts.pause);
    for (const k of Object.keys(counts)) {
      $(`[data-cnt="${k}"]`).textContent = String(counts[k]);
      $(`[data-seg="${k}"]`).style.width = `${(counts[k] / total) * 100}%`;
    }
  };

  // typewriter, 14ms per character
  let typeTimer = 0;
  const typed = $('[data-typed]');
  const typeOut = (text) => {
    clearTimeout(typeTimer);
    if (reduced()) {
      typed.textContent = text;
      return;
    }
    let i = 0;
    const tick = () => {
      typed.textContent = text.slice(0, ++i);
      if (i < text.length) typeTimer = setTimeout(tick, 14);
    };
    tick();
  };

  setInterval(() => {
    if (!lastAt) return;
    $('[data-answer-age]').textContent = `answered ${Math.round((performance.now() - lastAt) / 1000)}s ago`;
  }, 1000);

  const slot = createPoller({
    env,
    base: 2000,
    max: 60000,
    task: () => fetchSlot(fetch.bind(window), rpcUrl),
    onOk: (n) => {
      const now = performance.now();
      counts.ok++;
      setHealth({ ok: true });
      for (const el of $$('[data-slot], [data-slot-hero]')) setNumber(el, n, { format: fmtInt });
      if (prev) {
        const dt = (now - prev.t) / 1000;
        const d = n - prev.n;
        rate = dt > 0 ? d / dt : null;
        const lvl = d <= 0 ? 0 : Math.min(4, 1 + Math.floor(d / 3));
        const c = cells[cell++ % cells.length];
        c.dataset.l = String(lvl);
        c.classList.remove('ping');
        void c.offsetWidth;
        c.classList.add('ping');
        if (rate !== null) {
          setNumber($('[data-slot-rate]'), rate, { format: fmtRate });
          setNumber($('[data-stat="cadence"]'), rate, { format: (v) => `${v.toFixed(2)}/s` });
          tape.push(rate);
          $('[data-tape-note]').textContent = `${tape.size} samples`;
        }
      }
      prev = { n, t: now };
      lastAt = now;
      typeOut(`tip acknowledged at slot ${fmtInt(n)}`);
      paintCounts();
      if (onAnswer) onAnswer(n);
    },
    onError: (_e, fails) => {
      counts.retry++;
      if (fails >= 3) counts.fail++;
      setHealth({ ok: false, fails });
      if (fails >= 3) typeOut('node not answering; retrying with longer gaps');
      paintCounts();
    },
    onPause: () => {
      counts.pause++;
      paintCounts();
    }
  });

  let haveTvl = false;
  const tvl = createPoller({
    env,
    base: 120000,
    max: 600000,
    task: async () => {
      const v = parseTvl(await getJson(LLAMA_URL), 'solana');
      if (v === null) throw new Error('no slug match');
      return v;
    },
    onOk: (v) => {
      haveTvl = true;
      setNumber($('[data-tvl]'), v, { format: fmtCompactUsd });
    },
    onError: () => {
      if (!haveTvl) $('[data-tvl]').textContent = DASH;
    }
  });

  const rows = new Map();
  const list = $('[data-pairs]');
  const note = $('[data-pairs-note]');
  let havePairs = false;
  const mkRow = (p) => {
    const li = document.createElement('li');
    li.className = 'pair-li';
    const a = document.createElement(p.url ? 'a' : 'div');
    a.className = 'pair row-in';
    if (p.url) {
      a.href = p.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    const logo = document.createElement('span');
    logo.className = 'logo';
    const letter = () => {
      logo.textContent = p.base.slice(0, 2).toUpperCase();
    };
    if (p.img) {
      const im = new Image();
      im.alt = '';
      im.width = 28;
      im.height = 28;
      im.loading = 'lazy';
      im.referrerPolicy = 'no-referrer';
      im.addEventListener('error', () => {
        im.remove();
        letter();
      });
      im.src = p.img;
      logo.append(im);
    } else letter();
    const main = document.createElement('span');
    main.className = 'pair-main';
    main.innerHTML = '<b></b><small></small>';
    const nums = document.createElement('span');
    nums.className = 'pair-nums';
    nums.innerHTML = '<b class="num"></b><small class="num"></small>';
    a.append(logo, main, nums);
    li.append(a);
    return li;
  };
  const paintRow = (li, p) => {
    const [b, s] = li.querySelectorAll('.pair-main b, .pair-main small');
    b.textContent = `${p.base}/${p.quote}`;
    s.textContent = p.dex;
    const pb = li.querySelector('.pair-nums b');
    const ps = li.querySelector('.pair-nums small');
    setNumber(pb, p.price, { format: fmtPrice });
    ps.textContent = `${fmtCompactUsd(p.vol24)} · ${fmtPct(p.chg24)}`;
  };
  const pairs = createPoller({
    env,
    base: 30000,
    max: 300000,
    task: async () => {
      const v = parsePairs(await getJson(DEX_URL), 8);
      if (!v.length) throw new Error('no pairs');
      return v;
    },
    onOk: (v) => {
      if (!havePairs) {
        list.replaceChildren();
        havePairs = true;
      }
      note.hidden = true;
      const keep = new Set(v.map((p) => p.id));
      for (const [id, li] of rows) if (!keep.has(id)) (li.remove(), rows.delete(id));
      v.forEach((p) => {
        let li = rows.get(p.id);
        if (!li) rows.set(p.id, (li = mkRow(p)));
        paintRow(li, p);
        list.append(li);
      });
      setNumber($('[data-stat="count"]'), v.length, { format: fmtInt });
      setNumber($('[data-stat="vol"]'), v.reduce((s, p) => s + p.vol24, 0), { format: fmtCompactUsd });
      const sw = v.map((p) => p.chg24).filter((x) => x !== null).reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
      setNumber($('[data-stat="swing"]'), sw, { format: fmtPct });
    },
    onError: () => {
      if (havePairs) return;
      list.replaceChildren();
      note.hidden = false;
      for (const k of ['count', 'vol', 'swing']) $(`[data-stat="${k}"]`).textContent = DASH;
    }
  });

  slot.start();
  tvl.start();
  pairs.start();
}
