/** Bounded, opt-in stage samples. Each JS realm owns its own recorder. */
let enabled = false;
const stages: Record<string, { count: number; totalMs: number; maxMs: number; samples: number[] }> = {};
const events:{name:string;at:number;detail:Readonly<Record<string,number>>}[]=[];
export function resetPaintingMetrics(on = true) { enabled = on; for (const k of Object.keys(stages)) delete stages[k];events.length=0; }
/** Opt-in timestamps distinguish admission, canonical commit and submitted
 * image. Pixel-readback/next-frame evidence is recorded by browser observers. */
export function recordPaintingEvent(name:string,detail:Readonly<Record<string,number>>={},at=performance.now()){if(!enabled)return;if(events.length===2048)events.shift();events.push({name,at,detail:{...detail}});}
export function paintingEvents(){return structuredClone(events);}
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
