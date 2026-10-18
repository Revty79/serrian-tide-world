// Test-only timing around the real shared session; no product hooks or terrain shortcuts.
import { SphericalSession } from '../../src/editor/spherical-session.ts';
type Measures = { pump: number[]; texture: number[]; begin: number[]; frameGaps: number[]; wallMs: number };
let current: Measures | undefined, start = 0, previous = 0;
function wrap(name: 'pump' | 'updateDisplay' | 'begin', field: 'pump' | 'texture' | 'begin') {
  const original = SphericalSession.prototype[name];
  // Keep the original arguments, receiver, returned value and exceptions.
  (SphericalSession.prototype as any)[name] = function (...args: unknown[]) { const t = performance.now(); try { return (original as Function).apply(this, args); } finally { if (current && current[field].length < 8192) current[field].push(performance.now() - t); } };
}
wrap('pump', 'pump'); wrap('updateDisplay', 'texture'); wrap('begin', 'begin');
export function beginMeasurement() {
  current = { pump: [], texture: [], begin: [], frameGaps: [], wallMs: 0 }; start = previous = performance.now(); const target = current;
  const frame = (at: number) => { if (current !== target) return; if (target.frameGaps.length < 8192) target.frameGaps.push(at - previous); previous = at; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
}
export function endMeasurement() { const result = current!; result.wallMs = performance.now() - start; current = undefined; return result; }
