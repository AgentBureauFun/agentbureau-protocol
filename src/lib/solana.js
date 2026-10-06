export async function fetchSlot(fetchFn, rpcUrl, signal) {
  const res = await fetchFn(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot', params: [{ commitment: 'confirmed' }] }),
    signal
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const j = await res.json();
  if (!j || !Number.isSafeInteger(j.result) || j.result < 0) throw new Error('rpc shape');
  return j.result;
}
