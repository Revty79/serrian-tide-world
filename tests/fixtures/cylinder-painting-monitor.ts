import { snapshot } from './cylinder-observer.ts';
import { resetPaintingMetrics, paintingMetrics } from '../../src/editor/painting-metrics.ts';
let stop = () => ({});
export function monitorPainting() {
  resetPaintingMetrics();
  const inputs: object[] = [], frames: object[] = [], longTasks: number[] = [];
  const handlers: object[] = [], arrivals = new WeakMap<Event, number>();
  const canvas = document.querySelector('.cylinder-canvas')!;
  let running = true, id = 0, down = false, previous = performance.now(), maxGap = 0, maxQueue = 0;
  const cap = (e: Event) => {
    const p = e as PointerEvent;
    if (p.type === 'pointerdown') console.timeStamp('atlas-paint-down');
    arrivals.set(e, performance.now());
    if (p.type === 'pointerdown') down = true;
    if (down && inputs.length < 4096) inputs.push({ type: p.type, x: p.clientX, y: p.clientY, pointerType: p.pointerType, timeStamp: p.timeStamp, at: performance.now(), utcMs: performance.timeOrigin + performance.now() });
    if (p.type === 'pointerup' || p.type === 'pointercancel') down = false;
  };
  const bubble = (e: Event) => { const at = arrivals.get(e); if (at !== undefined && handlers.length < 4096) { const s = snapshot(false); handlers.push({ type: e.type, handlerMs: performance.now() - at, eventDispatchDelayMs: at - e.timeStamp, accepted: s.statistics.lastStroke, painting: s.painting }); } };
  for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.addEventListener(name, cap, true);
  for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.addEventListener(name, bubble);
  const observer = new PerformanceObserver(list => { for (const e of list.getEntries()) if (longTasks.length < 4096) longTasks.push(e.duration); });
  observer.observe({ type: 'longtask', buffered: false });
  const tick = (now: number) => {
    if (!running) return;
    maxGap = Math.max(maxGap, now - previous); previous = now;
    const s = snapshot(false) as ReturnType<typeof snapshot> & { pendingPositions: number; renderer: object };
    maxQueue = Math.max(maxQueue, s.pendingPositions);
    const dom = (canvas as HTMLElement).dataset, marker = document.querySelector<HTMLElement>('.cylinder-pointer');
    if (frames.length < 4096) frames.push({ rafTime: now, utcMs: performance.timeOrigin + performance.now(), revision: s.revision, displayRevision: s.displayRevision, pending: s.pendingPositions, painting: s.painting, presentationPending: dom.revision !== dom.displayRevision, feedbackPending: marker?.dataset.pending === 'true' });
    id = requestAnimationFrame(tick);
  }; id = requestAnimationFrame(tick);
  stop = () => {
    console.timeStamp('atlas-paint-drained');
    running = false; cancelAnimationFrame(id); observer.disconnect();
    for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.removeEventListener(name, cap, true);
    for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.removeEventListener(name, bubble);
    return { inputs, handlers, frames, longTasks, maxGap, maxQueue, mainStages: paintingMetrics(), final: snapshot(false) };
  };
}
export function finishPaintingMonitor() { return stop(); }
