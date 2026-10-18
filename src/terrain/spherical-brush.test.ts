import test from 'node:test';
import assert from 'node:assert/strict';
import { CUBE_FACES, FACE_BASES, FACE_CONNECTIONS, QUARTER_PI, add3, dot3, geodesicDistanceMeters, scale3, unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { greatCircleArc } from '../surfaces/great-circle.ts';
import { SphericalHistory } from '../editor/spherical-history.ts';
import { createSphericalTerrain, type SphericalTerrain } from './spherical.ts';
import { sphericalCapCandidates } from './spherical-cap.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings } from './spherical-brush.ts';

const identity = { worldId: 'sculpt-world', surfaceId: 'sphere' }, radius = 1_000_000;
const make = (cellsPerEdge = 16) => createSphericalTerrain({ terrainId: 'sculpt-terrain', identity, radiusMeters: radius, cellsPerEdge });
const point = (direction: Vec3) => ({ ...identity, direction });
type AdditiveSettings = Extract<SphericalBrushSettings, { readonly strengthMeters: number }>;
const settings = (tool: 'raise' | 'lower' = 'raise', angularRadius = .3): AdditiveSettings => ({ tool, radiusMeters: radius * angularRadius, strengthMeters: 300 });
const words = (terrain: SphericalTerrain) => new Uint32Array(terrain.copyElevations().buffer);
function bruteDab(terrain: SphericalTerrain, center: Vec3, brush: AdditiveSettings) {
  return Float32Array.from([...terrain.samples()].map((key) => {
    const t = geodesicDistanceMeters(center, terrain.directionAt(key), radius) / brush.radiusMeters;
    return t >= 1 ? -100 : Math.fround(-100 + (brush.tool === 'raise' ? 1 : -1) * brush.strengthMeters * Math.max(0, Math.min(1, (1 - t) ** 2 * (1 + 2 * t))));
  }));
}
function approximate(a: Float32Array, b: Float32Array) {
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i]! - b[i]!) <= 2e-4 + Math.abs(a[i]!) * 2e-7, `Sample ${i}: ${a[i]} != ${b[i]}`);
}

test('conservative cap regions never omit exact samples and emit every candidate at most once, including all chart cuts', () => {
  const terrain = make(); let seed = 123456;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const centers: Vec3[] = [[1, 0, 0], [0, 0, -1], [1, 1, 0], [1, 1, 1], [-1, 1, -1]];
  for (let i = 0; i < 24; i++) centers.push(unitDirection([random() * 2 - 1, random() * 2 - 1, random() * 2 - 1]));
  for (const center of centers) for (const angular of [0, 1e-10, .02, .2, .7, Math.PI / 2, 2.2, Math.PI]) {
    const candidates = [...sphericalCapCandidates(terrain, center, angular).samples()].map((s) => s.key.index), indices = new Set(candidates);
    assert.equal(indices.size, candidates.length);
    for (const key of terrain.samples()) if (geodesicDistanceMeters(center, terrain.directionAt(key), 1) <= angular) assert.ok(indices.has(key.index), `Missing ${key.index} for ${center}/${angular}`);
  }
});

for (const tool of ['raise', 'lower'] as const) test(`${tool} uses meters and exact geodesic falloff at all six face centers without changing identity`, () => {
  for (const face of CUBE_FACES) {
    const terrain = make(), metadata = terrain.metadata, brush = settings(tool), center = FACE_BASES[face].normal;
    const expected = bruteDab(terrain, center, brush), stroke = startSphericalBrushStroke(terrain, point(center), brush); stroke.end();
    assert.deepEqual(terrain.copyElevations(), expected); assert.equal(terrain.metadata, metadata);
    const key = terrain.resolve({ ...identity, patchId: face, column: 8, row: 8 }); assert.equal(terrain.read(key), tool === 'raise' ? 200 : -400);
  }
});

test('all twelve edges and all eight corners sculpt every adjoining face through one authority, with no duplicate dab writes', () => {
  const visited = new Set<string>();
  for (const seam of FACE_CONNECTIONS) {
    const edgeId = [seam.face, seam.toFace].sort().join('/'); if (visited.has(edgeId)) continue; visited.add(edgeId);
    const p = { ...identity, patchId: seam.face, u: seam.edge.startsWith('u') ? (seam.edge.endsWith('min') ? -QUARTER_PI : QUARTER_PI) : .2, v: seam.edge.startsWith('v') ? (seam.edge.endsWith('min') ? -QUARTER_PI : QUARTER_PI) : .2 };
    const terrain = make(), center = terrain.geometry.direction(p), expected = bruteDab(terrain, center, settings());
    const stroke = startSphericalBrushStroke(terrain, p, settings()); stroke.end(); approximate(terrain.copyElevations(), expected);
    const touched = new Set<string>(); for (const key of terrain.samples()) if (terrain.read(key) !== -100) for (const a of terrain.aliases(key)) touched.add(a.patchId);
    assert.ok(touched.has(seam.face) && touched.has(seam.toFace));
  }
  assert.equal(visited.size, 12);
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const center: Vec3 = [x, y, z], terrain = make(), expected = bruteDab(terrain, center, settings());
    const stroke = startSphericalBrushStroke(terrain, point(center), settings()); stroke.end(); approximate(terrain.copyElevations(), expected);
    const corner = [...terrain.samples()].find((key) => terrain.aliases(key).length === 3 && dot3(terrain.directionAt(key), unitDirection(center)) > .999999)!;
    assert.equal(terrain.read(corner), 200); assert.equal(stroke.statistics.writes, terrain.copyElevations().filter((v) => v !== -100).length);
    assert.ok(terrain.copyElevations().every((v) => v <= 200));
  }
});

test('equivalent seam/corner addresses and arbitrary poles produce the same physical footprint as brute-force distance checks', () => {
  for (const direction of [[1, 1, .4], [-1, -1, -1], [1, 2, 3], [1e-9, -1e-9, 1], [0, 0, -1]] as const) {
    const first = make(), expected = bruteDab(first, direction, settings('lower')); let previous: Float32Array | undefined;
    for (const address of first.geometry.positionsForDirection(direction)) {
      const terrain = make(), stroke = startSphericalBrushStroke(terrain, address, settings('lower')); stroke.end(); const actual = terrain.copyElevations(); approximate(actual, expected);
      if (previous) assert.deepEqual(actual, previous); previous = actual;
    }
  }
});

test('large caps span multiple faces, including a complete sphere, without duplicate sample influence', () => {
  for (const angular of [.9, 1.8, 2.8, Math.PI]) {
    const terrain = make(8), brush = settings('raise', angular), center: Vec3 = [1, 2, -3], expected = bruteDab(terrain, center, brush);
    const stroke = startSphericalBrushStroke(terrain, point(center), brush); stroke.end(); approximate(terrain.copyElevations(), expected);
    assert.equal(stroke.statistics.writes, terrain.copyElevations().filter((v) => v !== -100).length);
    assert.ok(stroke.statistics.candidateChecks <= terrain.sampleCount);
  }
});

test('great-circle strokes cross every edge with residual spacing and agree for sparse/dense/duplicate events', () => {
  const pairs = new Set<string>();
  for (const seam of FACE_CONNECTIONS) {
    const id = [seam.face, seam.toFace].sort().join('/'); if (pairs.has(id)) continue; pairs.add(id);
    const a = FACE_BASES[seam.face].normal, b = FACE_BASES[seam.toFace].normal, arc = greatCircleArc(a, b), sparse = make(), dense = make();
    const one = startSphericalBrushStroke(sparse, point(a), settings()), many = startSphericalBrushStroke(dense, point(a), settings());
    one.moveTo(point(b));
    for (let i = 1; i <= 31; i++) { many.moveTo(point(arc.at(i / 31))); many.moveTo(point(arc.at(i / 31))); }
    one.end(); many.end(); assert.equal(one.statistics.dabs, many.statistics.dabs); assert.deepEqual(words(sparse), words(dense));
  }
});

test('one multi-face/corner stroke, settings snapshot and partial termination preserve exact Undo/Redo including signed zero', () => {
  const terrain = make(); for (const key of terrain.samples()) if (key.index % 5 === 0) terrain.write(key, -0);
  const metadata = terrain.metadata, before = words(terrain), history = new SphericalHistory(terrain), brush = { ...settings(), strengthMeters: 43.7 };
  const stroke = startSphericalBrushStroke(terrain, point([1, 0, 0]), brush, history); brush.strengthMeters = 999;
  for (const p of [[1, 1, 1], [0, 1, 0], [-1, .1, .1], [-1, -1, -1], [0, 0, -1]] as const) stroke.moveTo(point(p));
  assert.throws(() => history.undo(), /End/); stroke.end(); stroke.end(); assert.equal(history.length, 1); assert.ok('strengthMeters' in stroke.settings); assert.equal(stroke.settings.strengthMeters, 43.7);
  const after = words(terrain); assert.notDeepEqual(after, before); assert.equal(stroke.moveTo(point([1, 0, 0])), false);
  history.undo(); assert.deepEqual(words(terrain), before); history.redo(); assert.deepEqual(words(terrain), after); assert.equal(terrain.metadata, metadata);
});

test('stationary, tiny and rejected antipodal movements do not add dabs or invent paths; valid intermediates can follow', () => {
  const terrain = make(), stroke = startSphericalBrushStroke(terrain, point([1, 0, 0]), settings()); const before = words(terrain);
  for (let i = 0; i < 20; i++) assert.equal(stroke.moveTo(point([1, 0, 0])), false);
  assert.equal(stroke.moveTo(point([1, 1e-16, 0])), false);
  for (const direction of [[-1, 0, 0], [-1, 1e-10, 0], [NaN, 1, 0]] as const) assert.throws(() => stroke.moveTo(point(direction)));
  assert.deepEqual(words(terrain), before); assert.equal(stroke.statistics.dabs, 1);
  stroke.moveTo(point([0, 1, 0])); stroke.moveTo(point([-1, 0, 0])); stroke.end(); assert.ok(stroke.statistics.dabs > 1);
});

test('invalid settings/identities, work limits and corrupt read protection reject before the affected dab writes anything', () => {
  const terrain = make(), before = words(terrain);
  for (const change of [{ tool: 'smooth' }, { radiusMeters: 0 }, { radiusMeters: Infinity }, { radiusMeters: radius * 4 }, { strengthMeters: 0 }, { strengthMeters: 1e39 }, { strengthMeters: NaN }]) assert.throws(() => startSphericalBrushStroke(terrain, point([1, 0, 0]), { ...settings(), ...change } as SphericalBrushSettings));
  assert.throws(() => startSphericalBrushStroke(terrain, { ...point([1, 0, 0]), surfaceId: 'inside' }, settings()));
  const other = createSphericalTerrain({ terrainId: 'other', identity: { ...identity, worldId: 'other' }, radiusMeters: radius, cellsPerEdge: 16 });
  assert.throws(() => startSphericalBrushStroke(terrain, point([1, 0, 0]), settings(), new SphericalHistory(other)));
  const tiny = startSphericalBrushStroke(terrain, point([1, 0, 0]), settings('raise', 1e-12)); const afterInitial = words(terrain);
  assert.throws(() => tiny.moveTo(point([0, 1, 0])), /work limit/); assert.deepEqual(words(terrain), afterInitial); tiny.end();
  const clean = make(), original = clean.read, corrupt = { ...clean, read: (key: Parameters<typeof original>[0]) => key.index % 3 ? original(key) : NaN };
  assert.throws(() => startSphericalBrushStroke(corrupt, point([1, 0, 0]), settings()), /nonfinite/); assert.deepEqual(words(clean), before);
});

test('small caps at higher resolutions check a bounded subset rather than every sample; input unit vectors remain untouched', () => {
  for (const n of [128, 256]) {
    const terrain = make(n), input: Vec3 = [1, 1, .2], original = [...input], stroke = startSphericalBrushStroke(terrain, point(input), settings('raise', .025)); stroke.end();
    assert.ok(stroke.statistics.candidateChecks < terrain.sampleCount / 100); assert.deepEqual(input, original); assert.ok(stroke.statistics.writes > 0);
  }
});

test('great circle interpolation follows angular arc length through seams and handles near-identical/near-antipodal cases explicitly', () => {
  const a: Vec3 = [1, 0, 0], b: Vec3 = [0, 0, 1], arc = greatCircleArc(a, b);
  for (const fraction of [0, .1, .5, .9, 1]) assert.ok(Math.abs(geodesicDistanceMeters(a, arc.at(fraction), 1) - Math.PI / 2 * fraction) < 1e-14);
  assert.equal(greatCircleArc(a, [1, 1e-16, 0]).angle, 0); assert.throws(() => greatCircleArc(a, [-1, 1e-10, 0]));
  assert.ok(greatCircleArc(a, [-1, 1e-6, 0]).at(.5).every(Number.isFinite));
  assert.throws(() => arc.at(NaN));
  const tangent: Vec3 = [0, 1, 0], small = add3(scale3(a, Math.cos(1e-8)), scale3(tangent, Math.sin(1e-8)));
  assert.ok(Math.abs(greatCircleArc(a, small).angle - 1e-8) < 1e-20);
});

test('a corrupt later dab stops without partial writes and leaves completed Lower work as one exact history operation', () => {
  const terrain = make(), initial = words(terrain); let corrupt = false;
  const provider = { ...terrain, get revision() { return terrain.revision; }, read: (key: Parameters<typeof terrain.read>[0]) => corrupt ? NaN : terrain.read(key) };
  const history = new SphericalHistory(provider), stroke = startSphericalBrushStroke(provider, point([1, 0, 0]), settings('lower'), history), partial = words(terrain);
  corrupt = true; assert.throws(() => stroke.moveTo(point([0, 1, 0])), /nonfinite/);
  assert.deepEqual(words(terrain), partial); assert.equal(history.length, 1); assert.equal(stroke.moveTo(point([0, 0, 1])), false);
  history.undo(); assert.deepEqual(words(terrain), initial); history.redo(); assert.deepEqual(words(terrain), partial);
});

test('no-hit and saturated strokes create no history entry, preserve Redo and never produce nonfinite values', () => {
  const terrain = make(), history = new SphericalHistory(terrain);
  startSphericalBrushStroke(terrain, point([1, 0, 0]), settings(), history).end(); history.undo();
  const noHit = startSphericalBrushStroke(terrain, point([1, .123, .456]), settings('raise', 1e-10), history); noHit.end();
  assert.equal(noHit.statistics.writes, 0); assert.equal(history.length, 1); assert.equal(history.canRedo, true);
  history.redo(); history.clear();
  history.begin(); for (const key of terrain.samples()) terrain.write(key, 3.4028234663852886e38); history.commit();
  const saturated = startSphericalBrushStroke(terrain, point([1, 0, 0]), { ...settings(), strengthMeters: 3.4028234663852886e38 }, history); saturated.end();
  assert.equal(saturated.statistics.writes, 0); assert.equal(history.length, 1); assert.ok(terrain.copyElevations().every(Number.isFinite));
});
