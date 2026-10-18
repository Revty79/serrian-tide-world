// Reproducible numerical/performance evidence. No App, renderer, IndexedDB or save codec.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createSphericalTerrain } from '../src/terrain/spherical.ts';
import { startSphericalBrushStroke } from '../src/terrain/spherical-brush.ts';
import { SphericalHistory } from '../src/editor/spherical-history.ts';
import { greatCircleArc } from '../src/surfaces/great-circle.ts';
import { FACE_BASES, FACE_CONNECTIONS } from '../src/surfaces/cube-sphere.ts';

const identity = { worldId: 'a6-b-world', surfaceId: 'a6-b-surface' }, radiusMeters = 1_000_000;
const positions = [[1, 0, 0], [1, 1, 1], [0, 1, 0], [-1, .1, .1], [-1, -1, -1], [0, 0, -1]];
const point = (direction) => ({ ...identity, direction });
function digest(terrain) {
  const copy = terrain.copyElevations(), bytes = new Uint8Array(copy.byteLength), view = new DataView(bytes.buffer), bits = new Uint32Array(copy.buffer);
  for (let i = 0; i < copy.length; i++) view.setUint32(i * 4, bits[i], true);
  return createHash('sha256').update(bytes).digest('hex');
}
function trial(cellsPerEdge) {
  const terrain = createSphericalTerrain({ terrainId: `trial-${cellsPerEdge}`, identity, radiusMeters, cellsPerEdge }), history = new SphericalHistory(terrain);
  const initial = digest(terrain), start = performance.now();
  const stroke = startSphericalBrushStroke(terrain, point(positions[0]), { tool: 'raise', radiusMeters: 80_000, strengthMeters: 200 }, history);
  const pendingSnapshotBytes = history.pendingBytes;
  for (const position of positions.slice(1)) stroke.moveTo(point(position)); stroke.end();
  const sculptAndCommitMs = performance.now() - start, edited = digest(terrain), uniqueChangedSamples = terrain.copyElevations().reduce((sum, value) => sum + (value !== -100 ? 1 : 0), 0), beforeUndo = performance.now();
  history.undo(); const undoMs = performance.now() - beforeUndo;
  if (digest(terrain) !== initial) throw new Error('Undo bit mismatch.');
  const beforeRedo = performance.now(); history.redo(); const redoMs = performance.now() - beforeRedo;
  if (digest(terrain) !== edited) throw new Error('Redo bit mismatch.');
  return { cellsPerEdge, sampleCount: terrain.sampleCount, authoritativeBytes: terrain.elevationByteLength, ...stroke.statistics, uniqueChangedSamples, pendingSnapshotBytes, retainedHistoryBytes: history.retainedBytes, historyEntries: history.length, sculptAndCommitMs, undoMs, redoMs, editedSha256: edited, exactUndoRedo: true };
}
trial(128); // Warm the numerical path; timings below still include synchronous history snapshot/commit.
const benchmarks = [128, 256].map((n) => {
  const runs = [trial(n), trial(n), trial(n)], last = runs[2], times = runs.map((r) => r.sculptAndCommitMs).sort((a, b) => a - b);
  if (runs.some((r) => r.editedSha256 !== last.editedSha256)) throw new Error('Nondeterministic benchmark.');
  return { ...last, timingRunsMs: runs.map((r) => ({ sculptAndCommit: r.sculptAndCommitMs, undo: r.undoMs, redo: r.redoMs })), medianSculptAndCommitMs: times[1], averageCandidatesPerDab: last.candidateChecks / last.dabs, fullScanChecksAvoided: last.sampleCount * last.dabs - last.candidateChecks };
});
const fixture = createSphericalTerrain({ terrainId: 'fixture', identity, radiusMeters, cellsPerEdge: 16 }), history = new SphericalHistory(fixture);
for (const key of fixture.samples()) if (key.index % 5 === 0) fixture.write(key, -0);
history.clear();
const before = digest(fixture), stroke = startSphericalBrushStroke(fixture, point(positions[0]), { tool: 'lower', radiusMeters: 300_000, strengthMeters: 43.7 }, history);
for (const position of positions.slice(1)) stroke.moveTo(point(position)); stroke.end(); const edited = digest(fixture);
history.undo(); if (digest(fixture) !== before) throw new Error('Signed-zero fixture Undo failed.'); history.redo(); if (digest(fixture) !== edited) throw new Error('Fixture Redo failed.');
const arc = greatCircleArc(positions[0], positions[1]);
const pairs = new Set(); let eventFrequencyLargestDifferenceMeters = 0, differingEventFrequencySamples = 0;
for (const seam of FACE_CONNECTIONS) {
  const pair = [seam.face, seam.toFace].sort().join('/'); if (pairs.has(pair)) continue; pairs.add(pair);
  const make = () => createSphericalTerrain({ terrainId: 'frequency', identity, radiusMeters, cellsPerEdge: 16 });
  const sparse = make(), dense = make(), a = FACE_BASES[seam.face].normal, b = FACE_BASES[seam.toFace].normal, arc = greatCircleArc(a, b), settings = { tool: 'raise', radiusMeters: 300_000, strengthMeters: 300 };
  const one = startSphericalBrushStroke(sparse, point(a), settings), many = startSphericalBrushStroke(dense, point(a), settings);
  one.moveTo(point(b)); for (let i = 1; i <= 31; i++) { many.moveTo(point(arc.at(i / 31))); many.moveTo(point(arc.at(i / 31))); } one.end(); many.end();
  const first = sparse.copyElevations(), second = dense.copyElevations();
  for (let i = 0; i < first.length; i++) { const error = Math.abs(first[i] - second[i]); eventFrequencyLargestDifferenceMeters = Math.max(eventFrequencyLargestDifferenceMeters, error); if (error) differingEventFrequencySamples++; }
}
if (differingEventFrequencySamples) throw new Error('Event-frequency fixture differs.');
const receipt = { measuredAt: new Date().toISOString(), runtime: process.version, platform: process.platform, architecture: process.arch,
  method: 'Local Node numerical benchmark, one warmup plus three runs per N. No renderer/UI. Times include initial dab, full multi-face path and history commit; digest computation is outside timing. Typed-array counts exclude JS/GC overhead.', radiusMeters, benchmarkRadiusMeters: 80_000, benchmarkStrengthMetersPerDab: 200, path: positions, benchmarks,
  fixture: { cellsPerEdge: 16, tool: 'lower', radiusMeters: 300_000, strengthMeters: 43.7, signedZeroInput: true, beforeSha256: before, editedSha256: edited, historyEntries: history.length, ...stroke.statistics, exactUndoRedo: true, exampleArcRadians: arc.angle },
  eventFrequency: { edgePaths: pairs.size, denseSubsegmentsPerPath: 31, duplicateEvents: true, largestDifferenceMeters: eventFrequencyLargestDifferenceMeters, differingSamples: differingEventFrequencySamples } };
const text = JSON.stringify(receipt, null, 2) + '\n'; if (process.argv[2]) writeFileSync(process.argv[2], text); process.stdout.write(text);
