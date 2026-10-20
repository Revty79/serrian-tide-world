/** Reproducible Cube-A certificate. Node 24; stdout is JSON, no browser/GPU required. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createSolidCubeTerrain } from '../src/terrain/solid-cube.ts';
import { SOLID_CUBE_FACES, SOLID_CUBE_PROVIDER } from '../src/surfaces/solid-cube.ts';

const identity = { worldId: 'cube-a-certificate', surfaceId: 'exterior' };
const geometry = { identity, provider: SOLID_CUBE_PROVIDER, version: 1, configuration: 'solid', role: 'exterior', sideLengthMeters: 1024 };
// Literal Cartesian planes, independent of provider frames and ownership ranking.
const planes = {
  px: (c, r, n) => [n, c, r], nx: (c, r, n) => [0, n - c, r],
  py: (c, r, n) => [n - c, n, r], ny: (c, r) => [c, 0, r],
  pz: (c, r, n) => [c, r, n], nz: (c, r, n) => [c, n - r, 0],
};
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const result = { checkpoint: 'Cube-A', node: process.version, platform: process.platform, recordedAtUtc: new Date().toISOString(),
  conditions: 'Single local Node process. Verification allocations and GC are included in sweep times, not a device or editor performance benchmark.', resolutions: [] };
for (const n of [128, 256]) {
  const started = performance.now(), t = createSolidCubeTerrain({ terrainId: `certificate-${n}`, geometry, cellsPerEdge: n });
  const constructionMs = performance.now() - started, seen = new Uint8Array(t.sampleCount), pointForIndex = new Uint32Array(t.sampleCount).fill(0xffffffff);
  let faceAddresses = 0, changedWords = 0, degreeSum = 0, neighborChecks = 0;
  const sweepAt = performance.now();
  // Different exact binary values at every canonical sample, then validate EVERY alias.
  for (const k of t.samples()) t.write(k, (k.index % 10001 - 5000) / 8);
  const snapshot = t.copyElevations(), words = new Uint32Array(snapshot.buffer);
  for (const face of SOLID_CUBE_FACES) for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
    const a = { ...identity, patchId: face, column: c, row: r }, k = t.resolve(a), q = planes[face](c, r, n);
    const pointId = (q[0] * (n + 1) + q[1]) * (n + 1) + q[2];
    if (seen[k.index]) assert.equal(pointForIndex[k.index], pointId); else pointForIndex[k.index] = pointId;
    seen[k.index]++; faceAddresses++;
    assert.deepEqual(t.geometry.referencePosition(t.positionAt(a)), q.map((x) => (x - n / 2) * (1024 / n)));
    assert.equal(t.read(k), (k.index % 10001 - 5000) / 8);
    const s = new Float32Array([t.read(k)]);
    assert.equal(new Uint32Array(s.buffer)[0], words[k.index]); changedWords++;
  }
  const aliasSweepMs = performance.now() - sweepAt;
  // Injectivity checked independently of index order: no two keys represent one point.
  assert.equal(new Set(pointForIndex).size, t.sampleCount);
  const uses = [0, 0, 0, 0]; for (const count of seen) { assert.ok(count >= 1 && count <= 3); uses[count]++; }
  assert.deepEqual(uses.slice(1), [6 * (n - 1) ** 2, 12 * (n - 1), 8]);
  const graphAt = performance.now();
  for (const k of t.samples()) {
    const neighbors = t.neighbors(k), a = t.referencePositionAt(k);
    assert.equal(neighbors.length, seen[k.index] === 3 ? 3 : 4); degreeSum += neighbors.length;
    for (const other of neighbors) {
      const b = t.referencePositionAt(other);
      assert.equal(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), 1024 / n);
      assert.ok(t.neighbors(other).some((j) => j.index === k.index)); neighborChecks++;
    }
  }
  assert.equal(degreeSum / 2, 12 * n * n);
  assert.equal(t.sampleCount - degreeSum / 2 + 6 * n * n, 2);
  result.resolutions.push({ cellsPerEdge: n, canonicalVertices: t.sampleCount, interiors: uses[1], edgeInteriorVertices: uses[2], corners: uses[3],
    faceAddresses, exactAliasWordComparisons: changedWords, distinctPhysicalPoints: new Set(pointForIndex).size,
    meshEdges: degreeSum / 2, meshQuads: 6 * n * n, eulerCharacteristic: 2, reciprocalNeighborChecks: neighborChecks,
    canonicalElevationBytes: t.elevationByteLength, retainedSampleBuffers: 1, spacingMeters: t.sampleSpacingMeters,
    geometry: { sideLengthMeters: 1024, faceAreaMeters2: t.geometry.faceAreaMeters2, surfaceAreaMeters2: t.geometry.surfaceAreaMeters2 },
    elevationSha256: hash(new Uint8Array(snapshot.buffer)), constructionMs, aliasSweepMs, graphSweepMs: performance.now() - graphAt });
}
console.log(JSON.stringify(result, null, 2));
