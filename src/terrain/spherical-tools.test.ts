import test from 'node:test';
import assert from 'node:assert/strict';
import { CUBE_FACES, FACE_BASES, FACE_CONNECTIONS, type Vec3 } from '../surfaces/cube-sphere.ts';
import { greatCircleArc } from '../surfaces/great-circle.ts';
import { SphericalHistory } from '../editor/spherical-history.ts';
import { createSphericalTerrain, type SphericalTerrain } from './spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings } from './spherical-brush.ts';
import { FLOAT32_MAX } from './brush-math.ts';

const identity = { worldId: 'tools-world', surfaceId: 'round' }, radius = 1_000_000;
const make = (cellsPerEdge = 8) => createSphericalTerrain({ terrainId: 'tools', identity, radiusMeters: radius, cellsPerEdge });
const point = (direction: Vec3) => ({ ...identity, direction });
type BlendedSettings = Extract<SphericalBrushSettings, { readonly intensity: number }>;
const settings = (tool: 'smooth' | 'flatten', angular = .45): BlendedSettings => tool === 'smooth'
  ? { tool, radiusMeters: radius * angular, intensity: .73 }
  : { tool, radiusMeters: radius * angular, intensity: .73, targetElevation: 2500 };
const words = (terrain: SphericalTerrain) => new Uint32Array(terrain.copyElevations().buffer);
function seed(terrain: SphericalTerrain) {
  for (const key of terrain.samples()) terrain.write(key, key.index % 11 === 0 ? -0 : 2000 * Math.sin(key.index * 12.345) + 300 * Math.cos(key.index));
  return terrain;
}
const normalize = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
// Independent angular reference uses chord length / asin, rather than production atan2(cross,dot).
const angle = (a: Vec3, b: Vec3) => 2 * Math.asin(Math.min(1, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 2));

/** Independent full-mesh oracle: construct quad perimeter edges in every chart, weld by canonical IDs.
 * Does not call production neighbors, cap enumeration, directionAt, smoothing or falloff kernels.
 * Authority resolution is used only to identify the same physical vertex in incident charts.
 */
function meshReference(terrain: SphericalTerrain) {
  const n = terrain.metadata.representation.cellsPerEdge;
  const directions: Vec3[] = [], adjacent = Array.from({ length: terrain.sampleCount }, () => new Set<number>());
  for (const face of CUBE_FACES) {
    const frame = FACE_BASES[face], ids: number[][] = [];
    for (let row = 0; row <= n; row++) {
      const line: number[] = []; ids.push(line);
      for (let column = 0; column <= n; column++) {
        const id = terrain.resolve({ ...identity, patchId: face, column, row }).index;
        line.push(id);
        const x = Math.tan((column / n - .5) * Math.PI / 2), y = Math.tan((row / n - .5) * Math.PI / 2);
        directions[id] ??= normalize([0, 1, 2].map((axis) => frame.normal[axis]! + x * frame.u[axis]! + y * frame.v[axis]!) as unknown as Vec3);
      }
    }
    const link = (a: number, b: number) => { adjacent[a]!.add(b); adjacent[b]!.add(a); };
    for (let row = 0; row < n; row++) for (let column = 0; column < n; column++) {
      const a = ids[row]![column]!, b = ids[row]![column + 1]!, c = ids[row + 1]![column + 1]!, d = ids[row + 1]![column]!;
      link(a, b); link(b, c); link(c, d); link(d, a);
    }
  }
  return { directions, adjacent };
}
function referenceDab(terrain: SphericalTerrain, center: Vec3, brush: BlendedSettings) {
  const source = terrain.copyElevations(), result = source.slice(), { directions, adjacent } = meshReference(terrain), c = normalize(center);
  for (let i = 0; i < source.length; i++) {
    const t = angle(c, directions[i]!) * terrain.metadata.geometry.radiusMeters / brush.radiusMeters;
    if (t >= 1) continue;
    // Algebraically equivalent cubic via a different expression; convex weighted absolute values.
    const blend = brush.intensity * (1 - 3 * t * t + 2 * t * t * t);
    let target = brush.tool === 'flatten' ? brush.targetElevation : 0;
    if (brush.tool === 'smooth') {
      const neighbors = [...adjacent[i]!], weights = neighbors.map((j) => 1 / angle(directions[i]!, directions[j]!) ** 2);
      const total = weights.reduce((sum, w) => sum + w, 0);
      target = .5 * source[i]! + .5 * neighbors.reduce((sum, j, k) => sum + source[j]! * (weights[k]! / total), 0);
    }
    result[i] = (1 - blend) * source[i]! + blend * target;
  }
  return result;
}
function close(actual: Float32Array, expected: Float32Array) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i]! - expected[i]!) <= 2e-4 + Math.abs(expected[i]!) * 2e-7, `Sample ${i}: ${actual[i]} != ${expected[i]}`);
}
const edgeCenters: Vec3[] = [];
const pairs = new Set<string>();
for (const edge of FACE_CONNECTIONS) {
  const pair = [edge.face, edge.toFace].sort().join('/'); if (pairs.has(pair)) continue; pairs.add(pair);
  const a = FACE_BASES[edge.face].normal, b = FACE_BASES[edge.toFace].normal;
  edgeCenters.push([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
}
const corners: Vec3[] = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x, y, z]);
const centers = [...CUBE_FACES.map((f) => FACE_BASES[f].normal), ...edgeCenters, ...corners,
  [1, 2, 3], [-2, 3, .7], [1e-9, -1e-9, 1], [1e-9, 0, -1]] as Vec3[];

for (const tool of ['smooth', 'flatten'] as const) {
  test(`${tool}: independent full-mesh reference at six interiors, twelve edges, eight corners and arbitrary/near poles`, () => {
    assert.equal(edgeCenters.length, 12); assert.equal(corners.length, 8);
    for (const center of centers) {
      const terrain = seed(make()), metadata = terrain.metadata, brush = settings(tool), expected = referenceDab(terrain, center, brush);
      const before = terrain.copyElevations(), beforeWords = new Uint32Array(before.buffer), stroke = startSphericalBrushStroke(terrain, point(center), brush); stroke.end();
      close(terrain.copyElevations(), expected); assert.equal(terrain.metadata, metadata);
      assert.equal(stroke.statistics.writes, words(terrain).filter((w, i) => w !== beforeWords[i]).length);
      assert.ok(stroke.statistics.writes > 0);
      if (tool === 'smooth') {
        const min = Math.min(...before), max = Math.max(...before);
        assert.ok(terrain.copyElevations().every((v) => v >= min && v <= max));
      }
    }
  });
  test(`${tool}: equivalent face aliases produce identical bits and multi-face footprints have no duplicate influence`, () => {
    for (const center of [...edgeCenters, ...corners]) {
      let expected: Uint32Array | undefined;
      for (const alias of make().geometry.positionsForDirection(center)) {
        const terrain = seed(make()), stroke = startSphericalBrushStroke(terrain, alias, settings(tool)); stroke.end();
        if (expected) assert.deepEqual(words(terrain), expected); expected = words(terrain);
      }
    }
    for (const angular of [1.1, 2.2, Math.PI]) {
      const terrain = seed(make()), brush = settings(tool, angular), expected = referenceDab(terrain, [1, 2, 3], brush);
      const stroke = startSphericalBrushStroke(terrain, point([1, 2, 3]), brush); stroke.end();
      close(terrain.copyElevations(), expected); assert.ok(stroke.statistics.candidateChecks <= terrain.sampleCount);
      assert.ok(stroke.statistics.peakPreparedBytes <= 8 * terrain.sampleCount + 32768);
    }
  });
  test(`${tool}: every seam and a multi-face corner path retain spacing for sparse/dense/duplicate events`, () => {
    const paths: Vec3[][] = edgeCenters.map((center) => {
      const incident = make().geometry.positionsForDirection(center);
      return incident.map((p) => FACE_BASES[p.patchId].normal);
    });
    paths.push([[1, 0, 0], [1, 1, 1], [0, 1, 0], [-1, .1, .1], [-1, -1, -1], [0, 0, -1]]);
    for (const path of paths) {
      const sparse = seed(make()), dense = seed(make()), brush = settings(tool);
      const one = startSphericalBrushStroke(sparse, point(path[0]!), brush), many = startSphericalBrushStroke(dense, point(path[0]!), brush);
      for (let p = 1; p < path.length; p++) {
        const arc = greatCircleArc(path[p - 1]!, path[p]!); one.moveTo(point(path[p]!));
        for (let i = 1; i <= 31; i++) { many.moveTo(point(arc.at(i / 31))); many.moveTo(point(arc.at(i / 31))); }
      }
      one.end(); many.end(); assert.equal(one.statistics.dabs, many.statistics.dabs); assert.deepEqual(words(sparse), words(dense));
    }
  });
  test(`${tool}: partial stroke, parameter snapshot, exact signed-zero history, Redo branching and out-of-band protection`, () => {
    const terrain = seed(make()), metadata = terrain.metadata, before = words(terrain), history = new SphericalHistory(terrain), brush = { ...settings(tool) };
    const stroke = startSphericalBrushStroke(terrain, point([1, 0, 0]), brush, history);
    brush.intensity = 0; if (brush.tool === 'flatten') brush.targetElevation = -999;
    stroke.moveTo(point([1, 1, 1])); stroke.moveTo(point([0, 1, 0]));
    assert.throws(() => history.undo(), /End/); stroke.end(); stroke.end(); const after = words(terrain);
    assert.ok('intensity' in stroke.settings); assert.equal(stroke.settings.intensity, .73); assert.equal(history.length, 1); assert.equal(terrain.metadata, metadata);
    assert.notDeepEqual(after, before); history.undo(); assert.deepEqual(words(terrain), before); history.redo(); assert.deepEqual(words(terrain), after);
    history.undo(); startSphericalBrushStroke(terrain, point([1, 0, 0]), { ...settings(tool), intensity: 0 }, history).end();
    assert.equal(history.canRedo, true); assert.deepEqual(words(terrain), before);
    startSphericalBrushStroke(terrain, point([0, 0, 1]), settings(tool), history).end(); assert.equal(history.canRedo, false);
    terrain.write(terrain.keyAt(0), 17); const external = words(terrain);
    assert.throws(() => history.undo(), /Untracked/); assert.deepEqual(words(terrain), external); assert.equal(history.length, 0);
  });
  test(`${tool}: corruption in a later dab commits only completed work as one operation`, () => {
    const terrain = seed(make()), before = words(terrain); let corrupt = false;
    const provider = { ...terrain, get revision() { return terrain.revision; }, read: (key: Parameters<typeof terrain.read>[0]) => corrupt ? NaN : terrain.read(key) };
    const history = new SphericalHistory(provider), stroke = startSphericalBrushStroke(provider, point([1, 0, 0]), settings(tool), history), partial = words(terrain);
    corrupt = true; assert.throws(() => stroke.moveTo(point([0, 1, 0])), /nonfinite/);
    assert.deepEqual(words(terrain), partial); assert.equal(history.length, 1); assert.equal(stroke.moveTo(point([0, 0, 1])), false);
    history.undo(); assert.deepEqual(words(terrain), before); history.redo(); assert.deepEqual(words(terrain), partial);
  });
}

test('Smooth is invariant for constant fields including signed zero, at corners/poles and whole-sphere caps', () => {
  for (const constant of [-FLOAT32_MAX, -1700.5, -0, 0, 1e-30, FLOAT32_MAX]) {
    const terrain = make(); for (const key of terrain.samples()) terrain.write(key, constant);
    const before = words(terrain), history = new SphericalHistory(terrain);
    for (const center of centers) startSphericalBrushStroke(terrain, point(center), { tool: 'smooth', radiusMeters: radius * Math.PI, intensity: 1 }, history).end();
    assert.deepEqual(words(terrain), before); assert.equal(history.length, 0);
  }
});

test('Smooth snapshot includes neighbors beyond the cap, handles corner degree three and unequal physical spacing', () => {
  const terrain = make(16), { adjacent, directions } = meshReference(terrain);
  for (const key of terrain.samples()) assert.deepEqual([...adjacent[key.index]!].sort((a, b) => a - b), terrain.neighbors(key).map((k) => k.index));
  assert.equal(adjacent.filter((s) => s.size === 3).length, 8); assert.ok(adjacent.every((s) => s.size === 3 || s.size === 4));
  const key = terrain.resolve({ ...identity, patchId: 'px', column: 15, row: 9 });
  for (const k of terrain.samples()) terrain.write(k, 0);
  const neighbors = [...adjacent[key.index]!]; neighbors.forEach((id, i) => terrain.write(terrain.keyAt(id), 1000 * (i + 1)));
  const distances = neighbors.map((id) => angle(directions[key.index]!, directions[id]!)); assert.ok(Math.max(...distances) / Math.min(...distances) > 1.1);
  const brush = { tool: 'smooth' as const, radiusMeters: 1, intensity: 1 }, before = words(terrain), expected = referenceDab(terrain, directions[key.index]!, brush);
  const stroke = startSphericalBrushStroke(terrain, point(directions[key.index]!), brush); stroke.end(); close(terrain.copyElevations(), expected);
  assert.equal(stroke.statistics.writes, 1); for (const id of neighbors) assert.equal(words(terrain)[id], before[id]);
  const broken = seed(make()), original = words(broken), center = broken.resolve({ ...identity, patchId: 'px', column: 4, row: 4 });
  const poisoned = broken.neighbors(center)[0]!.index;
  const provider = { ...broken, read: (k: Parameters<typeof broken.read>[0]) => k.index === poisoned ? Infinity : broken.read(k) };
  assert.throws(() => startSphericalBrushStroke(provider, point([1, 0, 0]), brush), /nonfinite/); assert.deepEqual(words(broken), original);
});

test('Smooth damps an isolated spike without chart-boundary extrema and tolerates reversed neighbor enumeration', () => {
  const a = seed(make()), b = seed(make()), source = words(a);
  const reversed = { ...b, neighbors: (key: Parameters<typeof b.neighbors>[0]) => [...b.neighbors(key)].reverse() };
  const brush = { tool: 'smooth' as const, radiusMeters: radius * Math.PI, intensity: 1 };
  const expected = referenceDab(a, [1, 2, 3], brush);
  startSphericalBrushStroke(a, point([1, 2, 3]), brush).end(); startSphericalBrushStroke(reversed, point([1, 2, 3]), brush).end();
  close(a.copyElevations(), expected); close(b.copyElevations(), expected); assert.notDeepEqual(words(a), source);
  for (const center of [...edgeCenters, ...corners]) {
    const terrain = make(); for (const key of terrain.samples()) terrain.write(key, 0);
    const p = terrain.geometry.positionsForDirection(center)[0]!, n = 8;
    const spike = terrain.resolve({ ...identity, patchId: p.patchId, column: Math.round((p.u / (Math.PI / 4) + 1) * n / 2), row: Math.round((p.v / (Math.PI / 4) + 1) * n / 2) });
    terrain.write(spike, 1000); startSphericalBrushStroke(terrain, point(center), { ...brush, radiusMeters: radius * .6 }).end();
    assert.equal(terrain.read(spike), 500); assert.ok(terrain.copyElevations().every((v) => v >= 0 && v <= 500));
    for (const neighbor of terrain.neighbors(spike)) assert.ok(terrain.read(neighbor) > 0);
  }
});

test('Flatten targets are actual datum-relative positive, negative and zero meters, including extreme finite inputs', () => {
  for (const targetElevation of [-FLOAT32_MAX, -2500, -0, 0, 2500, FLOAT32_MAX]) for (const intensity of [0, .25, 1]) {
    const terrain = make(), key = terrain.resolve({ ...identity, patchId: 'px', column: 4, row: 4 });
    terrain.write(key, FLOAT32_MAX); const metadata = terrain.metadata;
    startSphericalBrushStroke(terrain, point([1, 0, 0]), { tool: 'flatten', radiusMeters: radius * .3, intensity, targetElevation }).end();
    assert.equal(terrain.read(key), Math.fround((1 - intensity) * FLOAT32_MAX + intensity * targetElevation));
    assert.equal(terrain.metadata.seaLevel, 0); assert.equal(terrain.metadata, metadata); assert.ok(terrain.copyElevations().every(Number.isFinite));
  }
  const terrain = make(), before = words(terrain), history = new SphericalHistory(terrain);
  startSphericalBrushStroke(terrain, point([1, 0, 0]), { tool: 'flatten', radiusMeters: radius * Math.PI, intensity: 1, targetElevation: -100 }, history).end();
  assert.deepEqual(words(terrain), before); assert.equal(history.length, 0);
});

test('new tools reject invalid blends/targets/identities before edits and remain isolated between terrain/surface instances', () => {
  const terrain = seed(make()), before = words(terrain);
  for (const tool of ['smooth', 'flatten'] as const) {
    for (const intensity of [NaN, Infinity, -Infinity, -.01, 1.01]) assert.throws(() => startSphericalBrushStroke(terrain, point([1, 0, 0]), { ...settings(tool), intensity }));
    for (const radiusMeters of [NaN, Infinity, -1, 0, radius * 4]) assert.throws(() => startSphericalBrushStroke(terrain, point([1, 0, 0]), { ...settings(tool), radiusMeters }));
    for (const change of [{ worldId: 'other' }, { surfaceId: 'interior' }, { direction: [NaN, 0, 0] as const }]) assert.throws(() => startSphericalBrushStroke(terrain, { ...point([1, 0, 0]), ...change }, settings(tool)));
    for (const other of [make(), createSphericalTerrain({ terrainId: 'tools', identity: { ...identity, surfaceId: 'interior' }, radiusMeters: radius, cellsPerEdge: 8 })]) {
      const untouched = words(other); assert.throws(() => startSphericalBrushStroke(terrain, point([1, 0, 0]), settings(tool), new SphericalHistory(other)));
      const edited = seed(make()); startSphericalBrushStroke(edited, point([1, 0, 0]), settings(tool)).end();
      assert.notDeepEqual(words(edited), before); assert.deepEqual(words(other), untouched);
    }
  }
  for (const targetElevation of [NaN, Infinity, -Infinity, FLOAT32_MAX * 2]) assert.throws(() => startSphericalBrushStroke(terrain, point([1, 0, 0]), { tool: 'flatten', radiusMeters: 300_000, intensity: 1, targetElevation }));
  assert.deepEqual(words(terrain), before);
});

test('Raise/Lower retain their independent numerical falloff at every interior, edge, corner and pole', () => {
  for (const tool of ['raise', 'lower'] as const) for (const center of centers) {
    const terrain = seed(make()), source = terrain.copyElevations(), directions = meshReference(terrain).directions;
    const normalized = normalize(center), brush = { tool, radiusMeters: radius * .45, strengthMeters: 300 };
    const expected = Float32Array.from(source, (h, i) => {
      const t = angle(normalized, directions[i]!) / .45;
      return t >= 1 ? h : h + (tool === 'raise' ? 1 : -1) * 300 * (1 - 3 * t * t + 2 * t * t * t);
    });
    startSphericalBrushStroke(terrain, point(center), brush).end(); close(terrain.copyElevations(), expected);
  }
});

test('Smooth/Flatten independent references cover coarse/odd grids and physically scaled extreme sphere radii', () => {
  for (const n of [2, 3, 12]) for (const tool of ['smooth', 'flatten'] as const) {
    const terrain = seed(make(n)), brush = settings(tool, 1.7), expected = referenceDab(terrain, [1, -1, 1], brush);
    startSphericalBrushStroke(terrain, point([1, -1, 1]), brush).end(); close(terrain.copyElevations(), expected);
  }
  for (const tool of ['smooth', 'flatten'] as const) {
    let expected: Uint32Array | undefined;
    for (const sphereRadius of [1e-200, 1, 1e200]) {
      const terrain = seed(createSphericalTerrain({ terrainId: 'tools', identity, radiusMeters: sphereRadius, cellsPerEdge: 8 }));
      startSphericalBrushStroke(terrain, point([1, 1, 1]), { ...settings(tool), radiusMeters: sphereRadius * .45 }).end();
      if (expected) assert.deepEqual(words(terrain), expected); expected = words(terrain);
    }
  }
});

test('N=128/256 new-tool dabs use bounded cap work, no per-dab elevation copies, and two copies per tracked stroke', () => {
  for (const n of [128, 256]) for (const tool of ['smooth', 'flatten'] as const) {
    const terrain = make(n); let copies = 0;
    // Sparse perturbation: meaningful Smooth work without an expensive fixture initialization.
    terrain.write(terrain.resolve({ ...identity, patchId: 'px', column: n, row: n / 2 }), 1000);
    const provider = { ...terrain, get revision() { return terrain.revision; }, copyElevations: () => { copies++; return terrain.copyElevations(); } };
    const stroke = startSphericalBrushStroke(provider, point([1, 1, .02]), settings(tool, .025)); stroke.end();
    assert.equal(copies, 0); assert.ok(stroke.statistics.candidateChecks < terrain.sampleCount / 100);
    const history = new SphericalHistory(provider), tracked = startSphericalBrushStroke(provider, point([1, 1, 0]), settings(tool, .025), history);
    for (let i = 1; i <= 10; i++) tracked.moveTo(point([1, 1, i * .01])); tracked.end();
    assert.ok(tracked.statistics.dabs > 10); assert.equal(copies, 2);
    assert.ok(tracked.statistics.peakPreparedBytes <= 8 * terrain.sampleCount + 32768); assert.equal(history.length, 1);
  }
});
