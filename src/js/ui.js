import { $, $$, reduced } from './util.js';
import { isBase58Address } from './lib/gate.js';

export function initCopy() {
  for (const btn of $$('[data-copy]')) {
    let t = 0;
    btn.addEventListener('click', async () => {
      const fb = $('[data-ca-fb]', btn);
      let ok = true;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = btn.dataset.copy;
          ta.setAttribute('readonly', '');
          ta.className = 'sr-copy';
          document.body.append(ta);
          ta.select();
          ok = document.execCommand('copy');
          ta.remove();
        } catch {
          ok = false;
        }
      }
      fb.textContent = ok ? 'Copied' : 'Select text';
      btn.classList.toggle('is-copied', ok);
      clearTimeout(t);
      t = setTimeout(() => {
        fb.textContent = 'Copy';
        btn.classList.remove('is-copied');
      }, 1400);
    });
  }
}

export function initTabs(onChange) {
  const tabs = $$('[role="tab"]');
  const select = (i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tabs[i].focus();
    onChange(i);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i, false));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d) {
        e.preventDefault();
        select((i + d + tabs.length) % tabs.length, true);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        select(e.key === 'Home' ? 0 : tabs.length - 1, true);
      }
    });
  });
}

export function initBrief() {
  const dlg = $('[data-brief]');
  for (const b of $$('[data-open-brief]')) b.addEventListener('click', () => dlg.showModal());
  $('[data-close-brief]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  $$('.brief-nav a').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      $(a.getAttribute('href'), dlg).scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    })
  );
}

export function initVerifier() {
  const form = $('[data-verifier]');
  const out = $('[data-v-out]');
  const input = $('input', form);
  form.addEventListener('submit', (e) => e.preventDefault());
  input.addEventListener('input', () => {
    const s = input.value.trim();
    let msg;
    let ok = false;
    if (!s) msg = 'Waiting for input.';
    else if (isBase58Address(s)) (ok = true), (msg = `Shape accepted: ${s.length} base58 characters.`);
    else if (/[^1-9A-HJ-NP-Za-km-z]/.test(s)) msg = 'Contains characters outside base58 (0, O, I, l or symbols).';
    else msg = `Length ${s.length}; expected 32 to 44.`;
    out.textContent = msg;
    out.dataset.ok = String(ok);
  });
}

export function initScroll() {
  const bar = $('[data-progress]');
  const topbar = $('[data-topbar]');
  const deep = $$('[data-depth]');
  const root = document.documentElement;
  const setH = () => root.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
  setH();
  new ResizeObserver(setH).observe(topbar);

  let ticking = false;
  const run = () => {
    ticking = false;
    const y = window.scrollY;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    bar.style.transform = `scaleX(${Math.min(1, y / max)})`;
    if (!reduced() && y < window.innerHeight * 1.5)
      for (const el of deep) el.style.translate = `0 ${(y * parseFloat(el.dataset.depth)).toFixed(1)}px`;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) (ticking = true), requestAnimationFrame(run);
    },
    { passive: true }
  );
  run();

  const items = $$('[data-reveal]');
  if (reduced() || !('IntersectionObserver' in window)) items.forEach((e) => e.classList.add('is-in'));
  else {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    items.forEach((el, i) => {
      el.style.setProperty('--d', `${(i % 4) * 60}ms`);
      if (el.getBoundingClientRect().top < window.innerHeight) requestAnimationFrame(() => el.classList.add('is-in'));
      else io.observe(el);
    });
  }

  const hero = $('[data-hero]');
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}
