// Numerical evidence only; does not import App, browser storage, rendering or save codecs.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createSphericalTerrain } from '../src/terrain/spherical.ts';
import { FACE_CONNECTIONS } from '../src/surfaces/cube-sphere.ts';

if (!globalThis.gc) throw new Error('Run with: node --expose-gc scripts/measure-spherical.mjs [output.json]');
const identity = { worldId: 'a6-a-fixture-world', surfaceId: 'a6-a-fixture-surface' };
function memoryMeasurement(cellsPerEdge) {
  globalThis.gc();
  const before = process.memoryUsage().arrayBuffers, start = performance.now();
  const terrain = createSphericalTerrain({ terrainId: `measured-${cellsPerEdge}`, identity, radiusMeters: 1_250_000, cellsPerEdge });
  const constructionMs = performance.now() - start, allocatedArrayBufferBytes = process.memoryUsage().arrayBuffers - before;
  if (terrain.elevationByteLength !== allocatedArrayBufferBytes) throw new Error('Unexpected typed-array allocation; inspect memory measurement.');
  return { cellsPerEdge, logicalVerticesPerFace: (cellsPerEdge + 1) ** 2, uniqueSamples: terrain.sampleCount, elevationBytes: terrain.elevationByteLength, allocatedArrayBufferBytes, constructionMs };
}
const memory = [16, 64, 128, 256, 512].map(memoryMeasurement);
const terrain = createSphericalTerrain({ terrainId: 'a6-a-fixture-terrain', identity, radiusMeters: 1_250_000, cellsPerEdge: 8 });
const graphEdges = new Set(), aliasCounts = { faceInteriors: 0, edgeInteriors: 0, corners: 0 }, modified = new Set();
for (const key of terrain.samples()) {
  const aliases = terrain.aliases(key); aliasCounts[aliases.length === 1 ? 'faceInteriors' : aliases.length === 2 ? 'edgeInteriors' : 'corners']++;
  for (const neighbor of terrain.neighbors(key)) graphEdges.add([key.index, neighbor.index].sort((a, b) => a - b).join('/'));
  if (aliases.length > 1) {
    const value = Math.fround(123.25 + key.index / 8); terrain.write(key, value); modified.add(key.index);
    for (const alias of aliases) if (terrain.read(terrain.resolve(alias)) !== value) throw new Error('Shared elevation mismatch.');
  }
}
function digest() {
  const copy = terrain.copyElevations(), bytes = new ArrayBuffer(copy.byteLength), view = new DataView(bytes), bits = new Uint32Array(copy.buffer);
  for (let i = 0; i < copy.length; i++) view.setUint32(i * 4, bits[i], true);
  return createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
}
const elevationSha256 = digest(); let largestUnitLengthError = 0, largestReferenceRadiusErrorMeters = 0;
for (const key of terrain.samples()) {
  const direction = terrain.directionAt(key), position = terrain.geometry.referencePosition(terrain.positionAt(terrain.aliases(key)[0]));
  largestUnitLengthError = Math.max(largestUnitLengthError, Math.abs(Math.hypot(...direction) - 1));
  largestReferenceRadiusErrorMeters = Math.max(largestReferenceRadiusErrorMeters, Math.abs(Math.hypot(...position) - 1_250_000));
}
if (digest() !== elevationSha256) throw new Error('Geometry queries mutated terrain.');
const receipt = {
  measuredAt: new Date().toISOString(), runtime: process.version, platform: process.platform, architecture: process.arch,
  method: 'Node --expose-gc, live ArrayBuffer delta across each constructor, one private Float32 authority. Timings are one local run, not browser editing benchmarks.', memory,
  fixture: { cellsPerEdge: 8, radiusMeters: 1_250_000, uniqueSamples: terrain.sampleCount, aliasCounts, directedSeams: FACE_CONNECTIONS.length, undirectedSeams: FACE_CONNECTIONS.length / 2, graphEdges: graphEdges.size, quads: 6 * 8 ** 2, eulerCharacteristic: terrain.sampleCount - graphEdges.size + 6 * 8 ** 2, modifiedSharedSamples: modified.size, elevationSha256, largestUnitLengthError, largestReferenceRadiusErrorMeters, geometryPreservesElevationDigest: true },
};
const text = JSON.stringify(receipt, null, 2) + '\n';
if (process.argv[2]) writeFileSync(process.argv[2], text);
process.stdout.write(text);
