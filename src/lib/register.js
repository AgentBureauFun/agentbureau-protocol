export const STATES = ['stated', 'absent', 'unconfirmed'];

export const byId = (reg, id) => reg.records.find((r) => r.id === id);

export const isStated = (r) =>
  !!r && r.state === 'stated' && typeof r.value === 'string' && r.value.length > 0;

export function hrefFor(r) {
  if (!isStated(r)) return null;
  return /^https:\/\/[^\s]+$/.test(r.value) ? r.value : null;
}

export function handleFor(r) {
  const href = hrefFor(r);
  if (!href) return null;
  try {
    const seg = new URL(href).pathname.split('/').filter(Boolean)[0];
    return seg || null;
  } catch {
    return null;
  }
}

export function hostFor(r) {
  const href = hrefFor(r);
  if (!href) return null;
  try {
    return new URL(href).host;
  } catch {
    return null;
  }
}

export function validateRegister(reg) {
  const errors = [];
  const seen = new Set();
  for (const r of reg.records) {
    if (seen.has(r.id)) errors.push(`duplicate id ${r.id}`);
    seen.add(r.id);
    if (!STATES.includes(r.state)) errors.push(`${r.id}: bad state ${r.state}`);
    if (r.state === 'stated' && !isStated(r)) errors.push(`${r.id}: stated without value`);
    if (r.state !== 'stated' && r.value) errors.push(`${r.id}: value present while ${r.state}`);
  }
  return errors;
}

// Public copy carries no internal bookkeeping; dates stay in the source register.
export function publicRegister(reg) {
  return {
    records: reg.records.map(({ recorded, dated, ...rest }) => rest)
  };
}
