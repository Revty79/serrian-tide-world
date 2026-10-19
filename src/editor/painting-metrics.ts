/** Bounded, opt-in stage samples. Each JS realm owns its own recorder. */
let enabled = false;
const stages: Record<string, { count: number; totalMs: number; maxMs: number; samples: number[] }> = {};
export function resetPaintingMetrics(on = true) { enabled = on; for (const k of Object.keys(stages)) delete stages[k]; }
export function paintingMetricsEnabled() { return enabled; }
export function recordPaintingStage(name: string, ms: number) {
  if (!enabled) return;
  const s = stages[name] ??= { count: 0, totalMs: 0, maxMs: 0, samples: [] };
  s.count++; s.totalMs += ms; s.maxMs = Math.max(s.maxMs, ms);
  if (s.samples.length === 512) s.samples.shift(); s.samples.push(ms);
}
export function paintingStage<T>(name: string, fn: () => T): T {
  if (!enabled) return fn();
  const at = performance.now(); try { return fn(); } finally { recordPaintingStage(name, performance.now() - at); }
}
export function paintingMetrics() { return structuredClone(stages); }
