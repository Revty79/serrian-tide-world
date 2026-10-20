/** Node 24 + Python standard-library oracle; no runtime dependency is added to Atlas. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { serialize } from 'node:v8';
import { createSolidCubeRouter } from '../src/surfaces/solid-cube-routing.ts';
import { SOLID_CUBE_CONNECTIONS, SOLID_CUBE_FACES } from '../src/surfaces/solid-cube.ts';
import { createSolidCubeTerrain } from '../src/terrain/solid-cube.ts';

const prefix = process.argv[2] ?? '.local/cube-b-'; mkdirSync(dirname(prefix), { recursive: true });
const json = (x) => JSON.stringify(x, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n';
const sha = (x) => createHash('sha256').update(x).digest('hex');
const configurations = new Map(), routers = new Map(), cases = [];
function configuration(length = 10) {
  if (!configurations.has(length)) configurations.set(length, { identity: { worldId: `cube-proof-${length}`, surfaceId: 'exterior' }, provider: 'physical-solid-cube', version: 1, configuration: 'solid', role: 'exterior', sideLengthMeters: length });
  return configurations.get(length);
}
function router(length = 10) { if (!routers.has(length)) routers.set(length, createSolidCubeRouter(configuration(length))); return routers.get(length); }
const point = (face, u = 0, v = 0, length = 10) => ({ ...configuration(length).identity, patchId: face, u, v });
function add(label, first, second, length = 10) { const result = router(length).route(first, second); cases.push({ label, sideLengthMeters: length, first, second, result }); return result; }
for (const a of SOLID_CUBE_FACES) for (const b of SOLID_CUBE_FACES) add(`centers-${a}-${b}`, point(a), point(b));
const corners = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push(point(x > 0 ? 'px' : 'nx', x * y * 5, z * 5));
for (const [i, a] of corners.entries()) for (const [j, b] of corners.entries()) add(`corners-${i}-${j}`, a, b);
for (const [i, a] of corners.entries()) for (const face of SOLID_CUBE_FACES) add(`corner-center-${i}-${face}`, a, point(face));
for (const [i, c] of SOLID_CUBE_CONNECTIONS.entries()) {
  const fixed = c.edge.endsWith('min') ? -5 : 5;
  const a = point(c.face, c.edge.startsWith('u') ? fixed : 3, c.edge.startsWith('v') ? fixed : 3);
  add(`edge-start-${i}`, a, point(c.toFace)); add(`edge-end-${i}`, point(c.toFace), a);
}
let state = 0x7231abcd;
const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
const coords = [-4, -3, -1, 0, 1, 3, 4];
for (let i = 0; i < 80; i++) add(`seeded-${i}`, point(SOLID_CUBE_FACES[random() % 6], coords[random() % 7], coords[random() % 7]), point(SOLID_CUBE_FACES[random() % 6], coords[random() % 7], coords[random() % 7]));
add('literal-four-face', point('px', -4, -3), point('nx', -3, 4));
add('sub-ulp-cut-locus', point('px', Number.MIN_VALUE), point('nx'));
add('minimum-positive-distance', point('px'), point('px', Number.MIN_VALUE));
add('near-corner', point('px', 5 - 1e-12, 5 - 1e-12), point('nx', 5 - 1e-12, -5 + 1e-12));
add('decimal-ieee-input', point('px', 0.3, 0.4), point('ny', -0.7, 0.1));
for (const length of [2e-162, 1e-160, 1e100, 5e153]) {
  add(`extreme-centers-${length}`, point('px', 0, 0, length), point('nx', 0, 0, length), length);
  add(`extreme-sub-ulp-${length}`, point('px', Number.MIN_VALUE, 0, length), point('nx', 0, 0, length), length);
  add(`extreme-corners-${length}`, point('px', length/2, length/2, length), point('nx', length/2, -length/2, length), length);
}
const sampleProofs = [];
for (const n of [128, 256]) {
  const geometry = configuration(1024), terrain = createSolidCubeTerrain({ terrainId: `sample-${n}`, geometry, cellsPerEdge: n });
  terrain.write(terrain.keyAt(0), -0); terrain.write(terrain.keyAt(1), 123.25);
  const before = terrain.copyElevations(), revision = terrain.revision;
  const pairs = [
    [['px', n/2, n/2], ['nx', n/2, n/2]], [['px', n, n], ['nx', n, 0]],
    [['px', n/8, n/4], ['nx', n/4, 7*n/8]], [['pz', n/8, 3*n/4], ['ny', n/2, n/4]],
  ];
  for (const [i, pair] of pairs.entries()) {
    const positions = pair.map(([patchId, column, row]) => terrain.positionAt(terrain.owner(terrain.resolve({ ...geometry.identity, patchId, column, row }))));
    add(`samples-N${n}-${i}`, ...positions, 1024);
  }
  const after = terrain.copyElevations(); assert.deepEqual(new Uint32Array(after.buffer), new Uint32Array(before.buffer)); assert.equal(terrain.revision, revision);
  sampleProofs.push({ n, vertices: terrain.sampleCount, elevationBytes: terrain.elevationByteLength, revisionBefore: revision, revisionAfter: terrain.revision,
    beforeSha256: sha(new Uint8Array(before.buffer)), afterSha256: sha(new Uint8Array(after.buffer)), representationVersion: terrain.metadata.representation.version, configurationVersion: terrain.metadata.geometry.version });
}
writeFileSync(prefix + 'oracle-input.json', json(cases));
const python = spawnSync('python', ['scripts/cube-route-reference.py'], { input: json(cases), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
writeFileSync(prefix + 'oracle-stderr.txt', python.stderr ?? '');
if (python.status !== 0) throw Error(`Independent Python oracle failed: ${python.stderr}`);
const oracle = JSON.parse(python.stdout); assert.equal(oracle.cases, cases.length);
writeFileSync(prefix + 'oracle-certificate.json', json(oracle));
writeFileSync(prefix + 'sample-preservation.json', json(sampleProofs));
const quantile = (values, p) => values[Math.min(values.length-1, Math.ceil(values.length*p)-1)];
const groups = [
  ['same-face', 10, point('px'), point('px', 3, 4)], ['adjacent', 10, point('px'), point('py')],
  ['opposite-centers-four-ties', 10, point('px'), point('nx')], ['four-faces', 10, point('px', -4, -3), point('nx', -3, 4)],
  ['opposite-corners-six-ties', 10, point('px', 5, 5), point('nx', 5, -5)],
  ['extreme-sub-ulp', 5e153, point('px', Number.MIN_VALUE, 0, 5e153), point('nx', 0, 0, 5e153)],
];
const measurements = [];
for (const [label, length, first, second] of groups) {
  const r = router(length); for (let i = 0; i < 10; i++) r.route(first, second);
  global.gc?.(); const before = process.memoryUsage(), times = []; let result;
  for (let i = 0; i < 100; i++) { const at = performance.now(); result = r.route(first, second); times.push(performance.now()-at); }
  const after = process.memoryUsage(); times.sort((a,b)=>a-b);
  measurements.push({ label, trials: times.length, p50Ms: quantile(times, .5), p95Ms: quantile(times, .95), maxMs: times.at(-1),
    retainedLastResultSerializedBytes: serialize(result).length, before, after, heapDeltaBeforeGc: after.heapUsed-before.heapUsed,
    certificate: result.certificate });
}
const report = { node: process.version, platform: process.platform, recordedAtUtc: new Date().toISOString(), oracleCases: cases.length, oracleVerified: true,
  oracleScriptSha256: sha(readFileSync('scripts/cube-route-reference.py')), gcAvailable: typeof global.gc === 'function',
  conditions: 'Single Windows Node process, ten warmups and 100 timed queries per group. Python Fraction verification completes before timing. No browser/mobile latency claim. Memory snapshots include runtime, garbage and retained last result; serialized result size is not heap/RSS. No elevation or sample-sized routing cache.',
  measurements, sampleProofs, peakProofWorkUnits: Math.max(...cases.map((c)=>c.result.certificate.workUnits)), peakProofIntegerBits: Math.max(...cases.map((c)=>c.result.certificate.peakIntegerBits)) };
writeFileSync(prefix + 'performance.json', json(report));
console.log(json({ oracleCases: cases.length, oracleElapsedMs: oracle.elapsedMs, checkedSegments: oracle.results.reduce((n,r)=>n+r.segmentsChecked,0),
  checkedCrossings: oracle.results.reduce((n,r)=>n+r.crossingsChecked,0), measurements: measurements.map(({label,p50Ms,p95Ms,maxMs,retainedLastResultSerializedBytes,certificate})=>({label,p50Ms,p95Ms,maxMs,retainedLastResultSerializedBytes,workUnits:certificate.workUnits})), sampleProofs }));
