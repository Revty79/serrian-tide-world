// Independent reference: the accepted Git checkpoint, imported verbatim.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createSphericalTerrain } from '../src/terrain/spherical.ts';
import { startSphericalBrushStroke } from '../src/terrain/spherical-brush.ts';
import { SphericalHistory } from '../src/editor/spherical-history.ts';
import { beginSphereWorkerStroke } from '../src/editor/sphere-worker-stroke.ts';
import { createSphereWorkRuntime } from '../src/editor/sphere-work-runtime.ts';
import { unitDirection } from '../src/surfaces/cube-sphere.ts';
const base = 'ec1c6e195dd66272bf8aa3ba3232463831e000cb', root = '.local/a7-p1c-golden';
const exported = [];
for (const path of execFileSync('git', ['ls-tree', '-r', '--name-only', base], { encoding: 'utf8' }).trim().split('\n').filter(p => /^src\/(terrain|surfaces|editor|rendering|persistence)\/.*\.ts$/.test(p))) {
  const blob = execFileSync('git', ['show', `${base}:${path}`], { maxBuffer: 20e6 });
  const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, blob);
  exported.push({ path, sha256: createHash('sha256').update(blob).digest('hex') });
}
const load = path => import(pathToFileURL(resolve(root, path)).href);
const old = await load('src/terrain/spherical-brush.ts'), oldT = await load('src/terrain/spherical.ts'), oldH = await load('src/editor/spherical-history.ts');
const hash = v => createHash('sha256').update(v).digest('hex'), words = t => new Uint32Array(t.copyElevations().buffer);
const historyState = h => Object.fromEntries(Object.entries(h).filter(([key]) => key !== 'terrain'));
const paths = [];
// Every physical cube-chart edge, both poles, every triple-chart corner.
for (let axis = 0; axis < 3; axis++) for (const a of [-1, 1]) for (const b of [-1, 1]) {
  const d = [0, 0, 0], e = [0, 0, 0]; d[axis] = a; d[(axis + 1) % 3] = b * .97; d[(axis + 2) % 3] = .12; e[axis] = a * .97; e[(axis + 1) % 3] = b; e[(axis + 2) % 3] = .14;
  paths.push({ name: `edge-${axis}-${a}-${b}`, points: [d, e] });
}
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) paths.push({ name: `corner-${x}-${y}-${z}`, points: [[x, y * .98, z * .97], [x, y, z], [x * .97, y, z]] });
for (const sign of [-1, 1]) paths.push({ name: `pole-${sign}`, points: [[.02, -.01, sign], [0, 0, sign], [-.02, .01, sign]] });
paths.push({ name: 'moving-visible-limb', points: [[1, .97, 0], [.97, 1, .01], [.3, 1, .04], [-.3, 1, .06]], hemisphere: [1, 0, 0], visibility: { hemisphere: [1, 0, 0], endHemisphere: [0, 1, 0] } });
function fake() {
  let dead = false;
  const port = { onmessage: undefined, terminate() { dead = true; }, postMessage(message) { setImmediate(() => { if (!dead) runtime.receive(message); }); } };
  const runtime = createSphereWorkRuntime(message => setImmediate(() => { if (!dead) port.onmessage?.({ data: message }); }), fn => setImmediate(() => { if (!dead) fn(); }));
  return port;
}
const records = [], started = Date.now();
for (const n of [128, 256]) for (const tool of ['raise', 'lower', 'smooth', 'flatten']) for (const path of paths) {
  const identity = { worldId: 'p1c-golden', surfaceId: 'sphere' }, args = { terrainId: 'p1c', identity, radiusMeters: 1_000_000, cellsPerEdge: n };
  const reference = oldT.createSphericalTerrain(args), cooperative = createSphericalTerrain(args), remote = createSphericalTerrain(args);
  for (const key of reference.samples()) { const d = reference.directionAt(key), value = key.index % 11 ? 3000 * d[0] * d[1] - 1000 * d[2] : -0; for (const t of [reference, cooperative, remote]) t.write(t.keyAt(key.index), value); }
  const before = words(reference), radiusMeters = path.name.startsWith('edge') ? 80000 : 200000;
  const settings = { tool, radiusMeters, ...(tool === 'raise' || tool === 'lower' ? { strengthMeters: 237 } : { intensity: .65, ...(tool === 'flatten' ? { targetElevation: -250 } : {}) }) };
  const expectedHistory = new oldH.SphericalHistory(reference), cooperativeHistory = new SphericalHistory(cooperative), remoteHistory = new SphericalHistory(remote);
  const initial = { ...identity, direction: path.points[0] }, visibility = path.hemisphere && { hemisphere: path.hemisphere };
  const baseline = old.startSphericalBrushStroke(reference, initial, settings, expectedHistory, visibility), local = startSphericalBrushStroke(cooperative, initial, settings, cooperativeHistory, visibility);
  const worker = beginSphereWorkerStroke(remote, remoteHistory, path.points[0], settings, path.hemisphere, () => {}, fake);
  for (const direction of path.points.slice(1)) { baseline.moveTo({ ...identity, direction }, path.visibility); local.moveTo({ ...identity, direction }, path.visibility); worker.move(direction, path.visibility); }
  baseline.end(); local.end(); worker.release();
  for (let i = 0; worker.status === 'drawing' || worker.status === 'draining'; i++) { assert.ok(i < 100000); worker.pump(); await new Promise(r => setImmediate(r)); }
  assert.equal(worker.status, 'complete', String(worker.failure));
  for (const [t, h] of [[cooperative, cooperativeHistory], [remote, remoteHistory]]) { assert.deepEqual(words(t), words(reference)); assert.deepEqual(historyState(h), historyState(expectedHistory)); }
  assert.deepEqual(local.statistics, baseline.statistics);
  for (const key of ['dabs', 'writes', 'candidateChecks', 'affectedSamples', 'peakPreparedBytes']) assert.equal(worker.statistics[key], baseline.statistics[key], key);
  const after = words(reference), state = JSON.stringify(historyState(expectedHistory)), expectedUndo = expectedHistory.undo();
  if (expectedUndo) assert.deepEqual(words(reference), before);
  for (const [t, h] of [[cooperative, cooperativeHistory], [remote, remoteHistory]]) { assert.equal(h.undo(), expectedUndo); assert.deepEqual(words(t), words(reference)); }
  expectedHistory.redo(); for (const [t, h] of [[cooperative, cooperativeHistory], [remote, remoteHistory]]) { h.redo(); assert.deepEqual(words(t), after); assert.deepEqual(historyState(h), historyState(expectedHistory)); }
  records.push({ n, tool, path: path.name, radiusMeters, initialHemisphere: path.hemisphere ?? null, wordsComparedPerBackend: after.length, backends: ['cooperative', 'worker'], wordMismatches: 0, fullHistoryMismatches: 0, sha256: hash(Buffer.from(after.buffer)), completeHistorySha256: hash(state), statistics: baseline.statistics, worker: worker.diagnostics });
  console.log(n, tool, path.name, 'exact');
}
writeFileSync('docs/evidence/a7-p1c-golden-equivalence.json', JSON.stringify({ base, method: 'Verbatim accepted Git source imported separately; all canonical UInt32 words, every own history field and before/after entry word, retained budgets, state IDs, revisions, Undo and Redo compared directly. Signed zero, every physical chart edge/corner, poles and queued moving visibility. Current cooperative and validated worker host compared independently to old engine.', cases: records.length, wordComparisons: records.reduce((sum, r) => sum + r.wordsComparedPerBackend * 2, 0), wordMismatches: 0, fullHistoryMismatches: 0, elapsedMs: Date.now() - started, exported, records }, null, 2));
console.log({ cases: records.length, wordMismatches: 0, fullHistoryMismatches: 0 });
