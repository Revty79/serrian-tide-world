// A6-C: reproducible local numerical benchmark; no browser/UI or save codec.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createSphericalTerrain } from '../src/terrain/spherical.ts';
import { startSphericalBrushStroke } from '../src/terrain/spherical-brush.ts';
import { SphericalHistory } from '../src/editor/spherical-history.ts';

const identity = { worldId: 'a6-c-world', surfaceId: 'sphere' }, radiusMeters = 1_000_000;
const path = [[1, 0, 0], [1, 1, 1], [0, 1, 0], [-1, .1, .1], [-1, -1, -1], [0, 0, -1]];
const digest = (terrain) => createHash('sha256').update(new Uint8Array(terrain.copyElevations().buffer)).digest('hex');
function trial(cellsPerEdge, tool) {
  const terrain = createSphericalTerrain({ terrainId: 'benchmark', identity, radiusMeters, cellsPerEdge });
  for (const key of terrain.samples()) terrain.write(key, key.index % 11 === 0 ? -0 : 2000 * Math.sin(key.index * 12.345) + 300 * Math.cos(key.index));
  let copies = 0, elevationReads = 0, neighborQueries = 0;
  const provider = { ...terrain, get revision() { return terrain.revision; },
    copyElevations: () => { copies++; return terrain.copyElevations(); },
    read: (key) => { elevationReads++; return terrain.read(key); },
    neighbors: (key, connectivity) => { neighborQueries++; return terrain.neighbors(key, connectivity); } };
  const history = new SphericalHistory(provider), initialValues = terrain.copyElevations(), initial = digest(terrain);
  const settings = tool === 'smooth' ? { tool, radiusMeters: 80_000, intensity: .5 }
    : { tool, radiusMeters: 80_000, intensity: .5, targetElevation: 2500 };
  const start = performance.now(), stroke = startSphericalBrushStroke(provider, { ...identity, direction: path[0] }, settings, history);
  const pendingSnapshotBytes = history.pendingBytes;
  for (const direction of path.slice(1)) stroke.moveTo({ ...identity, direction }); stroke.end();
  const sculptAndCommitMs = performance.now() - start, edited = digest(terrain);
  const uniqueChangedSamples = terrain.copyElevations().reduce((count, value, i) => count + (!Object.is(value, initialValues[i]) ? 1 : 0), 0);
  assert.equal(copies, 2); assert.equal(history.length, 1);
  let time = performance.now(); history.undo(); const undoMs = performance.now() - time;
  assert.equal(digest(terrain), initial); time = performance.now(); history.redo(); const redoMs = performance.now() - time;
  assert.equal(digest(terrain), edited);
  return { tool, cellsPerEdge, sampleCount: terrain.sampleCount, authoritativeBytes: terrain.elevationByteLength,
    ...stroke.statistics, uniqueChangedSamples, elevationReads, neighborQueries, fullElevationCopiesPerStroke: copies,
    pendingSnapshotBytes, retainedHistoryBytes: history.retainedBytes, historyEntries: history.length,
    // Actual counted typed-array payloads, excluding JS objects, runtime, old garbage and caller fixture copies.
    liveAuthorityPendingAndPreparedBytes: terrain.elevationByteLength + pendingSnapshotBytes + stroke.statistics.peakPreparedBytes,
    conservativeFirstCommitTypedPayloadBytes: 3 * terrain.elevationByteLength + history.retainedBytes,
    sculptAndCommitMs, undoMs, redoMs, initialSha256: initial, editedSha256: edited, exactUndoRedo: true };
}
const benchmarks = [];
for (const cellsPerEdge of [128, 256]) for (const tool of ['smooth', 'flatten']) {
  trial(cellsPerEdge, tool);
  const runs = Array.from({ length: 3 }, () => trial(cellsPerEdge, tool)), last = runs[2];
  assert.ok(runs.every((run) => run.editedSha256 === last.editedSha256));
  benchmarks.push({ ...last, medianSculptAndCommitMs: runs.map((run) => run.sculptAndCommitMs).sort((a, b) => a - b)[1],
    timingRunsMs: runs.map((run) => ({ sculptAndCommit: run.sculptAndCommitMs, undo: run.undoMs, redo: run.redoMs })),
    averageCandidatesPerDab: last.candidateChecks / last.dabs, avoidedFullScanChecks: last.sampleCount * last.dabs - last.candidateChecks });
}
const receipt = { measuredAt: new Date().toISOString(), runtime: process.version, platform: process.platform, architecture: process.arch,
  method: 'One warmup then three measured runs per tool and N; 272-dab multi-face path with history commit. Fixture setup/digests excluded. Payload accounting is not process RSS or a mobile/browser timing claim.',
  radiusMeters, brushRadiusMeters: 80_000, intensity: .5, flattenTargetMeters: 2500, path, benchmarks };
const output = JSON.stringify(receipt, null, 2) + '\n';
if (process.argv[2]) writeFileSync(process.argv[2], output); process.stdout.write(output);
