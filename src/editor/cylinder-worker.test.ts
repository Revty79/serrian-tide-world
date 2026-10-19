import test from 'node:test';
import assert from 'node:assert/strict';
import { createCylinderWorkRuntime } from './cylinder-work-runtime.ts';
import { beginWorkerCylinderStroke, type CylinderWorkerFactory } from './cylinder-worker-stroke.ts';
import { createCylinderPreviewTerrain, CylinderPreviewSession } from './cylinder-preview-session.ts';
import { createCylindricalHistory } from './cylindrical-history.ts';
import { beginCylindricalStroke } from '../terrain/cylindrical-stroke.ts';
import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import { CYLINDER_PREVIEW_DAB_LIMITS } from '../rendering/cylindrical-raster.ts';
import { initialCylinderView } from '../rendering/cylindrical-view.ts';
import type { CylinderWorkInput, CylinderWorkOutput } from './cylinder-work-protocol.ts';
import { cylinderPreparedPatch } from './cylinder-prepared-patch.ts';
import { OrderedSurfaceInput, RevisionLease, SurfaceProgressSignal } from './surface-work.ts';

const turn = () => new Promise<void>(r => setImmediate(r));
function fakeFactory(transform = (m: CylinderWorkOutput) => m): CylinderWorkerFactory {
  return () => {
    let dead = false;
    const port = { onmessage: undefined as ((e: { data: CylinderWorkOutput }) => void) | undefined, terminate() { dead = true; }, postMessage(m: CylinderWorkInput) { setImmediate(() => { if (!dead) runtime.receive(m); }); } };
    const runtime = createCylinderWorkRuntime(m => setImmediate(() => { if (!dead) port.onmessage?.({ data: transform(m) }); }), fn => setImmediate(() => { if (!dead) fn(); }));
    return port as unknown as Worker;
  };
}
const options = { spacingMeters: 83700 * .2371, dabLimits: CYLINDER_PREVIEW_DAB_LIMITS, maxDabs: 2048 };
const words = (t: ReturnType<typeof createCylinderPreviewTerrain>) => new Uint32Array(t.copyElevations().buffer);
const settings = (tool: CylindricalBrushSettings['tool']): CylindricalBrushSettings => ({ version: 1, tool, radiusMeters: 83700, ...(tool === 'raise' || tool === 'lower' ? { strengthMeters: 237 } : { intensity: .65, ...(tool === 'flatten' ? { targetElevation: -250 } : {}) }) }) as CylindricalBrushSettings;
async function finish(s: ReturnType<typeof beginWorkerCylinderStroke>) { for (let i = 0; s.status === 'draining' || s.status === 'drawing'; i++) { assert.ok(i < 100000); s.pump(); await turn(); } }

for (const n of [64, 128, 256]) for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) test(`worker N${n} ${tool}: exact words AND complete history at caps/centers/rims/cut`, async () => {
  for (const path of [
    [['cap-start', 0, 0], ['cap-start', .013, 23000]],
    [['cap-end', 0, 0], ['cap-end', -.013, 23000]],
    [['side', .013, 43700], ['side', .025, 53700]],
    [['cap-start', .013, 980000], ['side', .013, 10000]],
    [['cap-end', -.013, 980000], ['side', .013, 1590000]],
    [['side', Math.PI - .013, 800000], ['side', -Math.PI + .013, 810000]],
  ] as const) {
    const t = createCylinderPreviewTerrain(n), ref = createCylinderPreviewTerrain(n);
    for (let i = 0; i < t.sampleCount; i++) { const v = (i * 13 % 17 - 8) * 20; t.write(t.keyAt(i), v); ref.write(ref.keyAt(i), v); }
    t.write(t.keyAt(1), -0); ref.write(ref.keyAt(1), -0);
    const start = words(t), h = createCylindricalHistory(t), rh = createCylindricalHistory(ref);
    const point = (terrain: typeof t, p: typeof path[number]) => ({ ...terrain.metadata.identity, patchId: p[0], u: p[1], v: p[2] });
    const a = beginWorkerCylinderStroke(t, h, point(t, path[0]), settings(tool), options, () => {}, fakeFactory());
    const b = beginCylindricalStroke(ref, rh, point(ref, path[0]), settings(tool), options);
    a.move(point(t, path[1])); b.move(point(ref, path[1])); a.release(); b.release();
    while (b.status === 'draining') b.pump(16); await finish(a);
    assert.equal(a.status, b.status); assert.deepEqual(words(t), words(ref)); assert.deepEqual(h.operations, rh.operations);
    if (h.statistics.entries) assert.deepEqual([...h.changes(0)], [...rh.changes(0)]);
    const end = words(t); h.undo(); assert.deepEqual(words(t), start); h.redo(); assert.deepEqual(words(t), end);
    assert.equal(a.diagnostics.backend, 'worker');
  }
});

test('shared ordered queue and revision lease reject overflow, stale, foreign and ended work', () => {
  const q = new OrderedSurfaceInput(2, 5); q.accept(); q.accept(); assert.throws(() => q.accept(), /budget/); q.progress(2); q.accept(); assert.equal(q.pending, 2); assert.throws(() => q.progress(1));
  const l = new RevisionLease(4, 7); l.validate(4, 7, 7); assert.throws(() => l.validate(3, 7, 7)); assert.throws(() => l.validate(4, 7, 8)); l.acknowledged(8); l.validate(4, 8, 8); l.cancel(); assert.throws(() => l.validate(4, 8, 8));
});

test('stale worker proposals and malformed exact words never overwrite canonical terrain', async () => {
  for (const corrupt of ['revision', 'before', 'index'] as const) {
    const t = createCylinderPreviewTerrain(64), h = createCylindricalHistory(t), before = words(t), p = { ...t.metadata.identity, patchId: 'side', u: 0, v: 800000 };
    const s = beginWorkerCylinderStroke(t, h, p, settings('raise'), options, () => {}, fakeFactory(m => { if (m.type === 'prepared') { if (corrupt === 'revision') m.sourceRevision++; else if (corrupt === 'before') m.before[0] = 1; else m.indices[0] = t.sampleCount; } return m; }));
    s.release(); await finish(s); assert.equal(s.status, 'failed'); assert.deepEqual(words(t), before); assert.equal(h.statistics.entries, 0);
  }
  const t = createCylinderPreviewTerrain(64);
  assert.throws(() => cylinderPreparedPatch(t, { type: 'prepared', task: 1, sequence: 1, sourceRevision: t.revision, center: { ...t.metadata.identity, patchId: 'side', u: 0, v: 800000 }, settings: settings('raise'), indices: new Uint32Array([0, 0]), before: new Float32Array([-100, -100]), after: new Float32Array([1, 1]), affectedSamples: 2 }));
});

test('startup failure replays ordered accepted input; cancellation disposes worker and exact prefix', async () => {
  const t = createCylinderPreviewTerrain(64), s = new CylinderPreviewSession(t), p = { ...t.metadata.identity, patchId: 'side', u: 0, v: 800000 }, before = words(t);
  s.enableWorkers(() => { throw Error('No workers'); }); assert.ok(s.begin(p, settings('raise'), initialCylinderView('map'))); s.move({ ...p, u: .025 }); await s.drainForSave(turn); assert.ok(t.revision > 0); assert.equal(s.history.statistics.entries, 1); const end = words(t); s.undo(); assert.deepEqual(words(t), before); s.redo(); assert.deepEqual(words(t), end);
  s.enableWorkers(fakeFactory()); assert.ok(s.begin(p, settings('lower'), initialCylinderView('map'))); s.move({ ...p, u: .04 }); s.cancel(); const prefix = words(t); for (let i = 0; i < 20; i++) await turn(); assert.deepEqual(words(t), prefix); assert.equal(s.painting, false); s.dispose();
});

test('progress waits share one promise and release on completion/interruption without polling', async () => {
  const signal = new SurfaceProgressSignal(), a = signal.wait(); assert.equal(a, signal.wait()); let done = false; void a.then(() => { done = true; }); assert.equal(done, false); signal.notify(); await a; assert.equal(done, true); assert.notEqual(signal.wait(), a); signal.notify();
  const t = createCylinderPreviewTerrain(256), s = new CylinderPreviewSession(t), p = { ...t.metadata.identity, patchId: 'side', u: .013, v: 43700 };
  s.enableWorkers(fakeFactory()); s.begin(p, { version: 1, tool: 'raise', radiusMeters: 377100, strengthMeters: 200 }, initialCylinderView('map')); for (let i = 1; i <= 100; i++) s.move({ ...p, u: .013 + i * .0003 });
  // Even a microtask-only persistence callback must not starve worker messages.
  await s.drainForSave(() => Promise.resolve()); assert.equal(s.painting, false); assert.equal(s.history.statistics.entries, 1); assert.equal((s.statistics.lastStroke as { discardedPositions: number }).discardedPositions, 0); s.dispose();
});

test('worker failure after a committed prefix preserves one exact operation and a later task recovers', async () => {
  const t = createCylinderPreviewTerrain(64), h = createCylindricalHistory(t), before = words(t), p = { ...t.metadata.identity, patchId: 'side', u: .013, v: 800000 };
  const s = beginWorkerCylinderStroke(t, h, p, settings('raise'), options, () => {}, fakeFactory(m => m.type === 'prepared' && m.sequence === 2 ? { type: 'error', task: m.task, message: 'deliberate runtime failure', stats: m.stats, stages: {} } : m));
  s.move({ ...p, u: .1 }); s.release(); await finish(s); assert.equal(s.status, 'failed'); assert.equal(h.statistics.entries, 1); const prefix = words(t); assert.notDeepEqual(prefix, before); h.undo(); assert.deepEqual(words(t), before); h.redo(); assert.deepEqual(words(t), prefix);
  const next = beginWorkerCylinderStroke(t, h, p, settings('lower'), options, () => {}, fakeFactory()); next.release(); await finish(next); assert.equal(next.status, 'complete'); assert.equal(h.statistics.entries, 2);
});
