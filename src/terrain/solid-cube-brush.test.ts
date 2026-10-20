import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareSolidCubeDab, cubeSmoothEstimate, CUBE_DAB_LIMITS, type CubeBrushSettings } from './solid-cube-brush.ts';
import { createSolidCubeTerrain, type SolidCubeTerrain, type CubePatchBlock } from './solid-cube.ts';
import { SOLID_CUBE_PROVIDER, SOLID_CUBE_FACES, SOLID_CUBE_PHYSICAL_EDGES, SOLID_CUBE_CORNERS, type SolidCubeConfiguration } from '../surfaces/solid-cube.ts';
import { CubeDabCertificationError, cubeNextUp, cubeNextDown } from '../surfaces/cube-brush-distance.ts';
import { createCubeExactBudget, cubeFloatDyadic, cubeRootInterval } from '../surfaces/cube-route-exact.ts';
import { createSolidCubeRouter } from '../surfaces/solid-cube-routing.ts';
import { FLOAT32_MAX } from './brush-math.ts';
const identity = { worldId:'cube-dab', surfaceId:'outside' }, configuration: SolidCubeConfiguration = { identity, provider:SOLID_CUBE_PROVIDER, version:1, configuration:'solid', role:'exterior', sideLengthMeters:8 };
const p = (patchId: typeof SOLID_CUBE_FACES[number], u = 0, v = 0) => ({ ...identity, patchId, u, v });
const tools: CubeBrushSettings[] = [{ version:1, tool:'raise', radiusMeters:4.1, strengthMeters:30 }, { version:1, tool:'lower', radiusMeters:4.1, strengthMeters:30 },
  { version:1, tool:'smooth', radiusMeters:4.1, intensity:.8 }, { version:1, tool:'flatten', radiusMeters:4.1, intensity:.7, targetElevation:-43 }];
const create = (n = 2) => createSolidCubeTerrain({ terrainId:'dab-terrain', geometry:configuration, cellsPerEdge:n });
function seed(t: SolidCubeTerrain) { for (const key of t.samples()) t.write(key, key.index === 0 ? -0 : ((key.index*17)%41-20)*3); }
function ready(dab: ReturnType<typeof prepareSolidCubeDab>, steps = 256) { while (dab.status === 'preparing') dab.pump(steps); assert.equal(dab.status,'ready'); return dab; }
const words = (t: SolidCubeTerrain) => new Uint32Array(t.copyElevations().buffer);
function reference(t: SolidCubeTerrain, center: ReturnType<typeof p>, settings: CubeBrushSettings) {
  const router = createSolidCubeRouter(configuration), before = t.copyElevations(), after = before.slice(), positions = [...t.samples()].map((k) => t.referencePositionAt(k));
  const radius = cubeFloatDyadic(settings.radiusMeters);
  for (const key of t.samples()) {
    const squared = router.route(center,t.positionAt(t.owner(key))).distanceSquared;
    const root = cubeRootInterval(createCubeExactBudget(),squared.n,squared.d*radius.n*radius.n,squared.exponent-2*radius.exponent);
    if (root.lower >= 1) continue;
    const tail = 1-root.lower, weight = tail*tail*(1+2*root.lower), current = before[key.index]!; let next: number;
    if (settings.tool === 'raise' || settings.tool === 'lower') {
      const delta = (settings.tool === 'raise' ? settings.strengthMeters : -settings.strengthMeters)*weight; next = delta === 0 ? current : current+delta;
    } else if (settings.tool === 'flatten') { const blend = settings.intensity*weight; next = blend === 0 ? current : blend === 1 ? settings.targetElevation : (1-blend)*current+blend*settings.targetElevation; }
    else {
      // Literal physical nearest-neighbor definition, not Cube-A's neighbor/index implementation.
      const q = positions[key.index]!, neighbors = positions.flatMap((other, i) => { const gap = q.map((v,j) => Math.abs(v-other[j]!)).filter((v) => v!==0); return gap.length === 1 && gap[0] === 4 ? [i] : []; });
      assert.ok(neighbors.length === 3 || neighbors.length === 4);
      const meanDelta = neighbors.reduce((sum,i) => sum+(before[i]!-current),0)/(2*neighbors.length), delta = settings.intensity*weight*meanDelta; next = delta === 0 ? current : current+delta;
    }
    after[key.index] = Math.fround(Math.max(-FLOAT32_MAX,Math.min(FLOAT32_MAX,next)));
  }
  return new Uint32Array(after.buffer);
}
const model = create(), centers = [...SOLID_CUBE_FACES.map((face) => p(face)), ...SOLID_CUBE_PHYSICAL_EDGES.map((e) => p(e.face,e.edge.startsWith('u') ? (e.edge.endsWith('min') ? -4 : 4) : 0,e.edge.startsWith('v') ? (e.edge.endsWith('min') ? -4 : 4) : 0)),
  ...SOLID_CUBE_CORNERS.map((c) => model.geometry.positionsForReference(c.signs.map((v) => v*4) as [number,number,number])[0]!)];
for (const settings of tools) test(`${settings.tool}: all faces/edges/corners match independently reconstructed Float32 results and every center alias`, () => {
  for (const center of centers) {
    const source = create(); seed(source); const expected = reference(source,center,settings);
    let first: Uint32Array | undefined;
    for (const alias of source.geometry.aliases(center)) {
      const t = create(); seed(t); const before = words(t), revision = t.revision, dab = ready(prepareSolidCubeDab(t,alias,settings),17);
      assert.deepEqual(words(t),before); assert.equal(t.revision,revision);
      const changes = [...dab.preparedChanges(t)]; assert.equal(new Set(changes.map((c) => c.index)).size,changes.length);
      assert.deepEqual(changes.map((c) => c.index),changes.map((c) => c.index).sort((a,b) => a-b));
      assert.equal(dab.commit(),changes.length); assert.equal(t.revision,revision+changes.length);
      assert.deepEqual(words(t),expected); if (first) assert.deepEqual(words(t),first); first = words(t);
      assert.equal(dab.statistics.writes,changes.length); assert.equal(dab.statistics.preparedBytes,0);
    }
  }
});
test('flatten explicitly reaches signed positive, zero, negative and negative-zero targets at the center', () => {
  for (const targetElevation of [120,0,-120,-0]) {
    const t = create(4), center = p('pz'), key = t.resolve({ ...identity, patchId:'pz', column:2,row:2 });
    ready(prepareSolidCubeDab(t,center,{ version:1,tool:'flatten',radiusMeters:1,intensity:1,targetElevation })).commit();
    assert.ok(Object.is(t.read(key),targetElevation));
  }
});
test('Smooth reads pre-dab connected faces and three corner neighbors, preserving constants and signed zero', () => {
  const t = create(4), corner = t.resolve({ ...identity,patchId:'px',column:4,row:4 });
  t.write(corner,0); for (const k of t.neighbors(corner)) t.write(k,120);
  const before = words(t), estimate = cubeSmoothEstimate(t,corner,0); assert.equal(estimate.neighbors,3); assert.equal(estimate.delta,60);
  const dab = ready(prepareSolidCubeDab(t,t.positionAt(t.owner(corner)),{ version:1,tool:'smooth',radiusMeters:3,intensity:1 }),1);
  assert.deepEqual(words(t),before); dab.commit(); assert.equal(t.read(corner),60);
  const constant = create(4); for (const k of constant.samples()) constant.write(k,-0);
  const revision = constant.revision, smooth = ready(prepareSolidCubeDab(constant,p('px',4,4),{ version:1,tool:'smooth',radiusMeters:40,intensity:1 }));
  assert.equal(smooth.statistics.changesPrepared,0); assert.equal(smooth.commit(),0); assert.equal(constant.revision,revision); assert.ok([...constant.samples()].every((k) => Object.is(constant.read(k),-0)));
});
test('exact radius contributes zero; nearest adjacent radius is deterministic and never changes out-of-radius samples', () => {
  const center = p('px'), target = { ...identity,patchId:'px' as const,column:3,row:2 };
  for (const radiusMeters of [cubeNextDown(2),2,cubeNextUp(2)]) {
    const t = create(4); for (const k of t.samples()) t.write(k,-0);
    const dab = ready(prepareSolidCubeDab(t,center,{ version:1,tool:'raise',radiusMeters,strengthMeters:100 })); dab.commit();
    const value = t.read(t.resolve(target)); if (radiusMeters <= 2) assert.ok(Object.is(value,-0)); else assert.ok(value > 0);
  }
});
test('intensity zero performs no reads or writes, and tiny underflow influence preserves negative zero', () => {
  for (const tool of ['smooth','flatten'] as const) {
    const t = create(), revision = t.revision, dab = prepareSolidCubeDab(t,p('px'),{ version:1,tool,radiusMeters:2,intensity:0,targetElevation:0 });
    assert.equal(dab.status,'ready'); assert.equal(dab.commit(),0); assert.equal(dab.statistics.sourceReads,0); assert.equal(t.revision,revision);
  }
  const t = create(4), key = t.resolve({ ...identity,patchId:'px',column:3,row:2 }); t.write(key,-0);
  ready(prepareSolidCubeDab(t,p('px'),{ version:1,tool:'raise',radiusMeters:cubeNextUp(2),strengthMeters:Math.fround(2**-149) })).commit();
  assert.ok(Object.is(t.read(key),-0));
});
test('source changes during preparation and after ready reject publication and release buffers', () => {
  for (const afterReady of [false,true]) {
    const t = create(8), dab = prepareSolidCubeDab(t,p('px',3,3),tools[0]!); if (afterReady) ready(dab); else dab.pump(20);
    const before = words(t); t.write(t.keyAt(0),321); const external = words(t);
    assert.notDeepEqual(external,before);
    assert.throws(() => afterReady ? dab.commit() : dab.pump(),(e) => e instanceof CubeDabCertificationError && e.code==='source');
    assert.deepEqual(words(t),external); assert.equal(dab.status,'failed'); assert.equal(dab.statistics.writes,0); assert.equal(dab.statistics.preparedBytes,0);
  }
});
test('cancel, stale iterators and foreign handoff never publish; pump size does not alter results', () => {
  const a = create(8), b = create(8); seed(a); seed(b);
  const x = ready(prepareSolidCubeDab(a,p('px',3.3,3.1),tools[2]!),1), y = ready(prepareSolidCubeDab(b,p('px',3.3,3.1),tools[2]!),4096);
  assert.deepEqual([...x.preparedChanges(a)],[...y.preparedChanges(b)]); const iterator = x.preparedChanges(a); assert.equal(iterator.next().done,false);
  assert.throws(() => x.preparedChanges(b).next()); const before = words(a); x.cancel(); assert.throws(() => iterator.next()); assert.throws(() => x.commit()); assert.deepEqual(words(a),before);
  y.commit(); assert.throws(() => y.commit());
  const z = prepareSolidCubeDab(a,p('px'),tools[0]!); z.pump(1); z.cancel(); assert.equal(z.pump(),'cancelled'); assert.deepEqual(words(a),before);
});
test('all budget failures are explicit and leave the complete authority unchanged', () => {
  for (const limits of [{ maxWorkUnits:1 },{ maxWorkUnits:1000 },{ maxCandidates:1 },{ maxScanSlots:1 },{ maxChanges:1 },{ maxPreparedBytes:1 },{ maxSourceReads:1 }]) {
    const t = create(8), before = words(t), revision = t.revision;
    assert.throws(() => ready(prepareSolidCubeDab(t,p('px',3,3),tools[0]!,limits)),(e) => e instanceof CubeDabCertificationError && e.code==='work');
    assert.deepEqual(words(t),before); assert.equal(t.revision,revision);
  }
  const t = create(4), before = words(t), dab = prepareSolidCubeDab(t,p('px',.3,.7),{ ...tools[0]!,maxFalloffError:0 });
  assert.throws(() => ready(dab),(e) => e instanceof CubeDabCertificationError && e.code==='precision'); assert.deepEqual(words(t),before); assert.equal(dab.statistics.preparedBytes,0);
});
test('atomic raw patch validates exact source words, all values, order, identities, buffers and epoch before writing', () => {
  const t = create(), initial = words(t), key = t.keyAt(0), revision = t.revision;
  const block = (indices: number[], before = [-100,-100], after = [10,20]): CubePatchBlock => ({ indices:Uint32Array.from(indices), before:Float32Array.from(before),after:Float32Array.from(after),count:indices.length });
  for (const b of [block([0,0]),block([1,0]),block([0,t.sampleCount]),block([0,1],[-100,-99]),block([0,1],[-100,-100],[10,Infinity]),{...block([0,1]),count:3},
    {...block([0,1]),after:new Float32Array(new SharedArrayBuffer(8))}]) {
    assert.throws(() => t.commitPreparedPatch(key,revision,[b])); assert.deepEqual(words(t),initial); assert.equal(t.revision,revision);
  }
  assert.throws(() => t.commitPreparedPatch({...key,terrainId:'foreign'},revision,[block([0,1])]));
  assert.throws(() => t.commitPreparedPatch(key,revision+1,[block([0,1])])); assert.deepEqual(words(t),initial);
  assert.throws(() => t.commitPreparedPatch(key,revision,[block([0],[-100],[10]),block([1],[-100],[Infinity])])); assert.deepEqual(words(t),initial);
  let callback = 0; const input = { get indices() { callback++; t.write(t.keyAt(2),30); return Uint32Array.of(0); },before:Float32Array.of(-100),after:Float32Array.of(20),count:1 };
  assert.throws(() => t.commitPreparedPatch(key,revision,[input])); assert.equal(callback,1); assert.equal(t.read(key),-100); assert.equal(t.read(t.keyAt(2)),30);
  const r = t.revision; assert.equal(t.commitPreparedPatch(key,r,[block([0,1])]),2); assert.equal(t.revision,r+2);
  t.write(key,-0); const z=t.revision;
  assert.throws(()=>t.commitPreparedPatch(key,z,[block([0],[0],[1])])); assert.ok(Object.is(t.read(key),-0)); assert.equal(t.revision,z);
});
for (const n of [128,256]) test(`N${n}: cooperative ordinary seam footprint preserves identity/version/ownership and exact dry-run words`, () => {
  const t = create(n), before = words(t), revision = t.revision, metadata = t.metadata, dab = ready(prepareSolidCubeDab(t,p('px',3.95,0),{ version:1,tool:'raise',radiusMeters:.25,strengthMeters:100 }),64);
  assert.deepEqual(words(t),before); assert.equal(t.revision,revision); const changes = [...dab.preparedChanges(t)];
  assert.ok(changes.length>20); assert.ok(changes.some((c) => t.owner(t.keyAt(c.index)).patchId!=='px'));
  assert.equal(dab.commit(),changes.length); for (const c of changes) assert.ok(Object.is(t.read(t.keyAt(c.index)),c.after));
  assert.equal(t.metadata,metadata); assert.equal(t.sampleCount,6*n*n+2); assert.equal(t.metadata.geometry.version,1); assert.equal(t.metadata.representation.version,1);
  assert.ok(dab.statistics.peakPreparedBytes<=CUBE_DAB_LIMITS.maxPreparedBytes); assert.ok(dab.statistics.workUnits<=CUBE_DAB_LIMITS.maxWorkUnits);
});
test('large multi-face brushes work within bounds; overlarge N256 dab fails safely at its explicit change cap', () => {
  const small = create(8); const d = ready(prepareSolidCubeDab(small,p('px'),{ version:1,tool:'lower',radiusMeters:40,strengthMeters:10 }));
  assert.equal(d.statistics.affectedSamples,small.sampleCount); d.commit(); assert.ok([...small.samples()].every((k)=>small.read(k)<-100));
  const t = create(256), before = words(t), dab = prepareSolidCubeDab(t,p('px'),{ version:1,tool:'raise',radiusMeters:40,strengthMeters:10 });
  assert.throws(() => ready(dab,4096),(e) => e instanceof CubeDabCertificationError && e.code==='work'); assert.deepEqual(words(t),before); assert.equal(t.revision,0); assert.equal(dab.statistics.writes,0);
});
test('invalid controls, foreign positions and invalid pumps fail without mutation; extreme finite elevations saturate', () => {
  const t = create(), before = words(t);
  for (const settings of [{...tools[0]!,radiusMeters:0},{...tools[0]!,strengthMeters:-1},{...tools[2]!,intensity:1.1},{...tools[3]!,targetElevation:Infinity}]) assert.throws(()=>prepareSolidCubeDab(t,p('px'),settings));
  assert.throws(()=>prepareSolidCubeDab(t,{...p('px'),surfaceId:'interior'},tools[0]!)); assert.throws(()=>prepareSolidCubeDab(t,p('px'),tools[0]!,{maxCandidates:CUBE_DAB_LIMITS.maxCandidates+1}));
  const dab = prepareSolidCubeDab(t,p('px'),tools[0]!); for (const units of [0,4097,NaN]) assert.throws(()=>dab.pump(units)); assert.deepEqual(words(t),before);
  const key = t.resolve({...identity,patchId:'px',column:1,row:1}); t.write(key,FLOAT32_MAX);
  ready(prepareSolidCubeDab(t,p('px'),{version:1,tool:'raise',radiusMeters:1,strengthMeters:FLOAT32_MAX})).commit(); assert.equal(t.read(key),FLOAT32_MAX);
});

test('raw publication bypasses caller map/species and typed-view accessors before any write', () => {
  const t = create(), key = t.keyAt(0), first = Float32Array.of(10), second = Float32Array.of(20); let callbacks = 0;
  Object.defineProperty(second,'buffer',{get(){callbacks++; first[0] = Infinity; return new ArrayBuffer(4);}});
  Object.defineProperty(second,'length',{get(){callbacks++; return 1000000;}});
  const blocks: CubePatchBlock[] = [{indices:Uint32Array.of(0),before:Float32Array.of(-100),after:first,count:1},{indices:Uint32Array.of(1),before:Float32Array.of(-100),after:second,count:1}];
  Object.defineProperty(blocks,'map',{value(){callbacks++;throw new Error('Caller map must never execute');}});
  assert.equal(t.commitPreparedPatch(key,t.revision,blocks),2); assert.equal(callbacks,0);
  assert.equal(t.read(key),10); assert.equal(t.read(t.keyAt(1)),20);
});
test('raw publication checks intrinsic buffer brands and extents despite spoofed properties', () => {
  const t = create(), key = t.keyAt(0), before = words(t), shared = new Float32Array(new SharedArrayBuffer(4)); let callbacks = 0;
  Object.defineProperty(shared,'buffer',{get(){callbacks++; return new ArrayBuffer(4);}});
  assert.throws(()=>t.commitPreparedPatch(key,t.revision,[{indices:Uint32Array.of(0),before:Float32Array.of(-100),after:shared,count:1}]));
  const short = Float32Array.of(10); Object.defineProperty(short,'length',{get(){callbacks++;return 100;}});
  assert.throws(()=>t.commitPreparedPatch(key,t.revision,[{indices:Uint32Array.of(0,1),before:Float32Array.of(-100,-100),after:short,count:2}]));
  const sharedBuffer = new SharedArrayBuffer(4), disguised = new Float32Array(sharedBuffer); Object.setPrototypeOf(sharedBuffer,ArrayBuffer.prototype);
  assert.throws(()=>t.commitPreparedPatch(key,t.revision,[{indices:Uint32Array.of(0),before:Float32Array.of(-100),after:disguised,count:1}]));
  const wrong = Uint32Array.of(16777217); Object.setPrototypeOf(wrong,Float32Array.prototype);
  assert.throws(()=>t.commitPreparedPatch(key,t.revision,[{indices:Uint32Array.of(0),before:Float32Array.of(-100),after:wrong as unknown as Float32Array,count:1}]));
  assert.equal(callbacks,0);assert.deepEqual(words(t),before);assert.equal(t.revision,0);
});
