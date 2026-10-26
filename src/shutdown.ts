// Work an app finishes before the server exits, such as flushing pending writes or closing streams.
// The registry lives on globalThis because src/serve.ts and the built server bundle each load their own
// copy of this module, and both copies must see the same hooks.
type Hook = () => Promise<void> | void;

const key = Symbol.for("app-template.shutdown");
const registry = globalThis as typeof globalThis & { [key]?: Set<Hook> };
const hooks = (registry[key] ??= new Set());

/** Run `hook` when the server receives SIGTERM or SIGINT, before it stops listening. Returns an unregister function. */
export function onShutdown(hook: Hook): () => void {
  hooks.add(hook);
  return () => hooks.delete(hook);
}

/** Run every registered hook at once and wait for all of them. A hook that fails is logged and does not stop the others. */
export async function runShutdown(): Promise<void> {
  const results = await Promise.allSettled([...hooks].map(async (hook) => hook()));
  for (const result of results) {
    if (result.status === "rejected") console.error("shutdown hook failed:", result.reason);
  }
}
