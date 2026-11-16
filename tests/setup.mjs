/* Minimal browser shims so the client-side engine can run under node:test. */
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
  clear: () => mem.clear(),
};
globalThis.window = { addEventListener() {} };

/** Fresh engine on an empty storage, optionally pre-seeded with raw saved state. */
export async function freshStore(saved) {
  mem.clear();
  if (saved) mem.set('soapflow-demo-v1', JSON.stringify(saved));
  const { createSoapStore } = await import('../src/lib/store/engine.js');
  return createSoapStore();
}
export const storage = mem;
