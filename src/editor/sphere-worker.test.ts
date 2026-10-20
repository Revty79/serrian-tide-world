import test from 'node:test';
import assert from 'node:assert/strict';
import { createSphereWorkRuntime } from './sphere-work-runtime.ts';
import { beginSphereWorkerStroke, type SphereWorkerFactory } from './sphere-worker-stroke.ts';
import type { SphereWorkInput, SphereWorkOutput } from './sphere-work-protocol.ts';
import { SphericalHistory } from './spherical-history.ts';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings } from '../terrain/spherical-brush.ts';
import { unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { sphericalWorkDecision } from './spherical-work-policy.ts';
import { SphericalSession } from './spherical-session.ts';
import { CUBE_FACES, type CubeFace } from '../surfaces/cube-sphere.ts';
import { buildSphericalFaceTexture, makeSphericalDisplayCache, type FaceTexture } from '../rendering/spherical-raster.ts';

const turn = () => new Promise<void>(resolve => setImmediate(resolve));
const make = (n = 16) => createSphericalTerrain({ terrainId: 'test', identity: { worldId: 'w', surfaceId: 's' }, radiusMeters: 1_000_000, cellsPerEdge: n });
const words = (t: ReturnType<typeof make>) => new Uint32Array(t.copyElevations().buffer);
const settings = (tool: SphericalBrushSettings['tool']): SphericalBrushSettings => ({ tool, radiusMeters: 200_000, ...(tool === 'raise' || tool === 'lower' ? { strengthMeters: 237 } : { intensity: .65, ...(tool === 'flatten' ? { targetElevation: -250 } : {}) }) }) as SphericalBrushSettings;
function factory(transform = (m: SphereWorkOutput) => m): SphereWorkerFactory {
  return () => {
    let dead = false;
    const port = { onmessage: undefined as ((event: { data: SphereWorkOutput }) => void) | undefined, terminate() { dead = true; }, postMessage(message: SphereWorkInput) { setImmediate(() => { if (!dead) runtime.receive(message); }); } };
    const runtime = createSphereWorkRuntime(message => setImmediate(() => { if (!dead) port.onmessage?.({ data: transform(message) }); }), fn => setImmediate(() => { if (!dead) fn(); }));
    return port as unknown as Worker;
  };
}
async function finish(stroke: ReturnType<typeof beginSphereWorkerStroke>) {
  for (let i = 0; stroke.status === 'drawing' || stroke.status === 'draining'; i++) { assert.ok(i < 100000, 'bounded test completion'); stroke.pump(); await turn(); }
}
function seed(t: ReturnType<typeof make>) {
  for (const k of t.samples()) { const d = t.directionAt(k); t.write(k, k.index % 11 ? 3000 * d[0] * d[1] - 1000 * d[2] : -0); }
}
const path: Vec3[] = [[1, .97, .04], [1, 1, .12], [.97, 1, .18], [1, 1, 1], [.03, .04, 1]];
for (const n of [16, 128, 256]) for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) test(`sphere worker N${n} ${tool}: complete words/history across face edge, corner and pole`, async () => {
  const t = make(n), reference = make(n); seed(t); seed(reference);
  const before = words(t), history = new SphericalHistory(t), expected = new SphericalHistory(reference), brush = settings(tool);
  const stroke = beginSphereWorkerStroke(t, history, path[0]!, brush, undefined, () => {}, factory());
  const original = startSphericalBrushStroke(reference, { ...reference.metadata.identity, direction: path[0]! }, brush, expected);
  for (const direction of path.slice(1)) { stroke.move(direction); original.moveTo({ ...reference.metadata.identity, direction }); }
  stroke.release(); original.end(); await finish(stroke);
  assert.equal(stroke.status, 'complete', String(stroke.failure)); assert.deepEqual(words(t), words(reference));
  // TS private fields are ordinary own properties: compare all entry arrays,
  // state identifiers, sequence, budgets and expected revision independently.
  const state = (h: SphericalHistory) => Object.fromEntries(Object.entries(h).filter(([key]) => key !== 'terrain'));
  assert.deepEqual(state(history), state(expected)); assert.equal(stroke.statistics.dabs, original.statistics.dabs);
  assert.equal(stroke.statistics.writes, original.statistics.writes);
  const after = words(t); assert.ok(history.undo()); assert.deepEqual(words(t), before); assert.ok(history.redo()); assert.deepEqual(words(t), after);
});

test('changing immutable visibility follows the same great-circle hemisphere, including queued dabs', async () => {
  const t = make(64), ref = make(64); seed(t); seed(ref);
  const history = new SphericalHistory(t), hemi = unitDirection([1, 0, 0]), brush = settings('smooth');
  const s = beginSphereWorkerStroke(t, history, [1, .97, 0], brush, hemi, () => {}, factory());
  const r = startSphericalBrushStroke(ref, { ...ref.metadata.identity, direction: [1, .97, 0] }, brush, undefined, { hemisphere: hemi });
  for (const direction of [[.97, 1, .01], [.3, 1, .04], [-.3, 1, .06]] as Vec3[]) {
    const visibility = { hemisphere: unitDirection([1, 0, 0]), endHemisphere: unitDirection([0, 1, 0]) };
    s.move(direction, visibility); r.moveTo({ ...ref.metadata.identity, direction }, visibility);
    // Mutation after acceptance must not change delayed visibility.
    (visibility.hemisphere as unknown as number[])[0] = -1;
  }
  s.release(); r.end(); await finish(s); assert.equal(s.status, 'complete', String(s.failure)); assert.deepEqual(words(t), words(ref));
});

test('one ready dab waits for canonical acknowledgement before advancing its private source epoch', () => {
  const t = make(), scheduled: (() => void)[] = [], messages: SphereWorkOutput[] = [];
  const runtime = createSphereWorkRuntime(m => messages.push(m), fn => scheduled.push(fn));
  runtime.receive({ type: 'start', task: 1, metadata: t.metadata, sourceRevision: t.revision, values: t.copyElevations(), direction: [1, 0, 0], settings: settings('raise') });
  runtime.receive({ type: 'move', task: 1, point: { ordinal: 2, direction: [1, .2, 0] } }); runtime.receive({ type: 'release', task: 1 });
  while (scheduled.length) scheduled.shift()!();
  const first = messages.find(m => m.type === 'prepared'); assert.ok(first && first.type === 'prepared');
  assert.equal(messages.filter(m => m.type === 'prepared').length, 1); assert.equal(first.statistics.dabs, 0); assert.equal(first.statistics.writes, 0); assert.equal(t.revision, 0);
  runtime.receive({ type: 'ack', task: 1, sequence: first.sequence, revision: first.sourceRevision + first.indices.length });
  while (scheduled.length) scheduled.shift()!();
  const second = messages.filter(m => m.type === 'prepared')[1]; assert.ok(second && second.type === 'prepared'); assert.equal(second.statistics.dabs, 1); assert.equal(second.sourceRevision, first.indices.length);
  runtime.receive({ type: 'ack', task: 1, sequence: -1, revision: 0 }); assert.equal(messages.at(-1)?.type, 'error');
});

test('stale, corrupt, duplicate, physically displaced and hidden proposals cannot write canonical terrain', async () => {
  for (const fault of ['revision', 'word', 'index', 'duplicate', 'center', 'visibility', 'hidden'] as const) {
    const t = make(32), history = new SphericalHistory(t), before = words(t);
    const s = beginSphereWorkerStroke(t, history, [1, 0, 0], settings('raise'), [1, 0, 0], () => {}, factory(m => {
      if (m.type === 'prepared') {
        if (fault === 'revision') m.sourceRevision++;
        if (fault === 'word') m.before[0] = 1;
        if (fault === 'index') m.indices[0] = t.sampleCount;
        if (fault === 'duplicate') m.indices[1] = m.indices[0]!;
        if (fault === 'center') m.center = [0, 1, 0];
        if (fault === 'visibility') m.visible = [-1, 0, 0];
        if (fault === 'hidden') m.indices[0] = [...t.samples()].find(k => t.directionAt(k)[0] < -.9)!.index;
      } return m;
    }));
    s.release(); await finish(s); assert.equal(s.status, 'failed', fault); assert.deepEqual(words(t), before, fault); assert.equal(history.length, 0);
  }
});

test('startup failure replays ordered accepted input; late failure retains an exact undoable prefix and recovers', async () => {
  const t = make(), ref = make(), history = new SphericalHistory(t), brush = settings('raise');
  const s = beginSphereWorkerStroke(t, history, [1, 0, 0], brush, undefined, () => {}, () => { throw Error('Unavailable'); });
  const r = startSphericalBrushStroke(ref, { ...ref.metadata.identity, direction: [1, 0, 0] }, brush); s.move([1, .2, 0]); r.moveTo({ ...ref.metadata.identity, direction: [1, .2, 0] }); s.release(); r.end(); await finish(s);
  assert.equal(s.status, 'complete'); assert.equal(s.diagnostics.backend, 'cooperative fallback'); assert.deepEqual(words(t), words(ref));
  const before = words(t), late = beginSphereWorkerStroke(t, history, [1, 0, 0], brush, undefined, () => {}, factory(m => m.type === 'prepared' && m.sequence === 2 ? { type: 'error', task: m.task, message: 'Deliberate failure', processed: 1 } : m));
  late.move([1, .3, 0]); late.release(); await finish(late); assert.equal(late.status, 'failed'); const prefix = words(t); assert.notDeepEqual(prefix, before); history.undo(); assert.deepEqual(words(t), before); history.redo(); assert.deepEqual(words(t), prefix);
  const next = beginSphereWorkerStroke(t, history, [1, 0, 0], settings('lower'), undefined, () => {}, factory()); next.release(); await finish(next); assert.equal(next.status, 'complete');
});

test('cancellation at canonical publication preserves exact initial dab and does not accept a late acknowledgement', async () => {
  const t = make(64), ref = make(64), history = new SphericalHistory(t), before = words(t), brush = settings('raise');
  const r = startSphericalBrushStroke(ref, { ...ref.metadata.identity, direction: [1, 0, 0] }, brush); r.end();
  let s: ReturnType<typeof beginSphereWorkerStroke>;
  s = beginSphereWorkerStroke(t, history, [1, 0, 0], brush, undefined, () => { if (s?.diagnostics.proposals === 1) s.cancel(); }, factory());
  s.move([1, .2, 0]); await finish(s); assert.equal(s.status, 'cancelled'); assert.deepEqual(words(t), words(ref)); assert.equal(s.statistics.dabs, r.statistics.dabs); assert.equal(s.statistics.writes, r.statistics.writes);
  const prefix = words(t); for (let i = 0; i < 20; i++) await turn(); assert.deepEqual(words(t), prefix); history.undo(); assert.deepEqual(words(t), before); history.redo(); assert.deepEqual(words(t), prefix);
});

test('an untracked external revision clears unsafe history and preserves the foreign edit', async () => {
  const t = make(), history = new SphericalHistory(t), s = beginSphereWorkerStroke(t, history, [1, 0, 0], settings('raise'), undefined, () => {}, factory());
  t.write(t.keyAt(0), 999); const foreign = words(t); s.release(); await finish(s); assert.equal(s.status, 'failed'); assert.deepEqual(words(t), foreign); assert.equal(history.canUndo, false); assert.equal(history.pendingBytes, 0);
});

test('measured policy keeps cheap and no-op strokes cooperative and selects expensive coarse-device work', () => {
  const t = make(256), direction: Vec3 = [1, .75, .12];
  assert.equal(sphericalWorkDecision(t, direction, { tool: 'raise', radiusMeters: 80000, strengthMeters: 500 }, false).backend, 'cooperative');
  assert.equal(sphericalWorkDecision(t, direction, settings('smooth'), false).backend, 'worker');
  assert.equal(sphericalWorkDecision(t, direction, settings('raise'), true).backend, 'worker');
  assert.equal(sphericalWorkDecision(t, direction, { tool: 'smooth', radiusMeters: 200000, intensity: 0 }, true).backend, 'cooperative');
});

test('deferred initial work and a paused ready dab cannot write after interruption', () => {
  for (const pause of [false, true]) {
    const t = make(), before = words(t), s = startSphericalBrushStroke(t, { ...t.metadata.identity, direction: [1, 0, 0] }, settings('raise'), undefined, undefined, { deferInitial: true, commitReady: () => false });
    const steps = s.initialSteps(); if (pause) assert.equal(steps.next().done, false); s.end();
    assert.equal(steps.next().done, true); assert.deepEqual(words(t), before); assert.equal(s.statistics.writes, 0);
  }
});

test('Save drain waits for real worker progress even with a microtask-only callback; pending input is bounded', async () => {
  const t = make(128); seed(t); const source = t.copyElevations(), faces = Object.fromEntries(CUBE_FACES.map(f => [f, buildSphericalFaceTexture(t, source, f, true)])) as Record<CubeFace, FaceTexture>;
  const session = new SphericalSession(t, makeSphericalDisplayCache(faces, t.revision)); session.enableBackground(true, factory());
  assert.ok(session.begin([1, .75, .12], settings('smooth'))); assert.equal(session.modified, true);
  assert.deepEqual(session.presentedLatencies(performance.now()), []);
  for (let i = 1; i <= 100; i++) session.move([1, .75 + i * .001, .12]);
  await session.drainForSave(() => Promise.resolve()); assert.equal(session.painting, false); assert.equal(session.history.length, 1); assert.equal((session.workDiagnostics as { statistics: { discardedPositions: number } }).statistics.discardedPositions, 0);
  session.updateDisplay(); assert.ok(session.presentedLatencies(performance.now()).length > 0);
  const before = words(t); session.disableBackground(); for (let i = 0; i < 10; i++) await turn(); assert.deepEqual(words(t), before);
  session.enableBackground(true, factory(m => m.type === 'prepared' ? { type: 'error', task: m.task, message: 'Deliberate pre-commit failure', processed: 0 } : m));
  assert.ok(session.begin([1, .75, .12], settings('smooth'))); await assert.rejects(session.drainForSave(() => Promise.resolve()), /Queued brush work failed/);
  assert.deepEqual(words(t), before); assert.deepEqual(session.presentedLatencies(performance.now()), []); session.disableBackground();
  const h = new SphericalHistory(t), s = beginSphereWorkerStroke(t, h, [1, 0, 0], settings('raise'), undefined, () => {}, factory());
  for (let i = 0; i < 2049; i++) s.move([1, .001 * i, 0]); assert.equal(s.status, 'failed'); assert.ok(s.pending <= 2048); const prefix = words(t); for (let i = 0; i < 10; i++) await turn(); assert.deepEqual(words(t), prefix);
});

test('a long stationary hold stays active; newly queued work still has a bounded response watchdog', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const t = make(), history = new SphericalHistory(t), s = beginSphereWorkerStroke(t, history, [1, 0, 0], settings('raise'), undefined, () => {}, factory());
  for (let i = 0; s.diagnostics.proposals === 0; i++) { assert.ok(i < 1000); await turn(); }
  for (let i = 0; i < 10; i++) await turn();
  const prefix = words(t); context.mock.timers.tick(30_001); assert.equal(s.status, 'drawing'); assert.deepEqual(words(t), prefix);
  s.move([1, .3, 0]); context.mock.timers.tick(20_000); s.move([1, .35, 0]); context.mock.timers.tick(10_001); assert.equal(s.status, 'failed'); assert.deepEqual(words(t), prefix);
  assert.equal(history.length, 1); const after = words(t); history.undo(); history.redo(); assert.deepEqual(words(t), after);
});
