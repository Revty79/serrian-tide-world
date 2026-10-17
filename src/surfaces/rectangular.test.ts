import test from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITY_TRANSPORT, transportTangent, type SurfacePosition } from './contracts.ts';
import { createRectangularLattice, createRectangularSurface } from './rectangular.ts';

const address = { worldId: 'world', surfaceId: 'land', patchId: 'chart' };
const at = (u: number, v: number): SurfacePosition => ({ ...address, u, v });

test('bounded rectangle retains all four real edges and rejects outside coordinates without clamping', () => {
  const { topology, metric } = createRectangularSurface({ address, width: 10, height: 6, units: 'meters' });
  for (const [u, v] of [[0, 0], [10, 0], [0, 6], [10, 6]]) assert.deepEqual(topology.normalize(at(u!, v!)), at(u!, v!));
  for (const [u, v] of [[-1, 3], [11, 3], [1, -1], [1, 7]]) assert.equal(topology.normalize(at(u!, v!)), null);
  assert.equal(topology.advance(at(10, 3), { du: 1, dv: 0 }), null);
  assert.deepEqual(topology.advance(at(9, 3), { du: 1, dv: 0 }), { position: at(10, 3), transport: IDENTITY_TRANSPORT });
  assert.deepEqual(metric.distance(at(1, 1), at(4, 5)), { value: 5, units: 'meters' });
  assert.throws(() => metric.distance(at(-1, 0), at(0, 0)), /bounded/);
});

test('periodic equivalence is half-open, idempotent and works across negative and multiple periods', () => {
  const { topology } = createRectangularSurface({ address, width: 10, height: 6, units: 'map-units', periodicU: true });
  for (const u of [-29, -19, -9, 1, 11, 21, 10001]) {
    const normalized = topology.normalize(at(u, 3));
    assert.deepEqual(normalized, at(1, 3)); assert.deepEqual(topology.normalize(normalized!), normalized);
  }
  for (const u of [-20, -10, -0, 0, 10, 20]) { const result = topology.normalize(at(u, 6))!; assert.equal(result.u, 0); assert.ok(!Object.is(result.u, -0)); }
  assert.equal(topology.normalize(at(10, 7)), null);
  assert.deepEqual(topology.advance(at(9.5, 3), { du: 2, dv: 0 }), { position: at(1.5, 3), transport: IDENTITY_TRANSPORT });
  assert.deepEqual(topology.advance(at(.5, 3), { du: -2, dv: 0 }), { position: at(8.5, 3), transport: IDENTITY_TRANSPORT });
});

test('intrinsic flat periodic distances take the shortest wrap and retain declared units', () => {
  const surface = createRectangularSurface({ address, width: 100, height: 20, units: 'meters', periodicU: true });
  assert.deepEqual(surface.metric.distance(at(99, 2), at(1, 2)), { value: 2, units: 'meters' });
  assert.ok(Math.abs(surface.metric.distance(at(99, 2), at(1, 5)).value - Math.sqrt(13)) < 1e-12);
  assert.equal(surface.metric.distance(at(0, 0), at(100, 0)).value, 0);
  assert.equal(surface.metric.distance(at(0, 0), at(50, 0)).value, 50);
  const both = createRectangularSurface({ address, width: 100, height: 20, units: 'map-units', periodicU: true, periodicV: true });
  assert.deepEqual(both.topology.normalize(at(-1, -2)), at(99, 18));
  assert.ok(Math.abs(both.metric.distance(at(99, 19), at(1, 1)).value - Math.sqrt(8)) < 1e-12);
});

test('periodic lattice has no duplicate endpoint and neighbors cross seams in both directions', () => {
  const surface = createRectangularSurface({ address, width: 8, height: 4, units: 'meters', periodicU: true });
  const lattice = createRectangularLattice(surface, 8, 5);
  assert.deepEqual(lattice.positionAt({ column: 7, row: 4 }), at(7, 4));
  const crossed = lattice.neighbor({ column: 7, row: 2 }, { column: 1, row: 0 })!;
  assert.deepEqual(crossed, { index: { column: 0, row: 2 }, position: at(0, 2), transport: IDENTITY_TRANSPORT });
  assert.equal(surface.metric.distance(lattice.positionAt({ column: 7, row: 2 }), crossed.position).value, 1);
  assert.deepEqual(lattice.neighbor(crossed.index, { column: -1, row: 0 })!.index, { column: 7, row: 2 });
  assert.deepEqual(lattice.neighbor({ column: 1, row: 2 }, { column: -18, row: 0 })!.index, { column: 7, row: 2 });
  assert.equal(lattice.neighbor({ column: 1, row: 0 }, { column: 0, row: -1 }), null);
  assert.equal(lattice.neighbor({ column: 1, row: 4 }, { column: 0, row: 1 }), null);
});

test('bounded lattice uses the legacy endpoint-inclusive layout and does not wrap neighbors', () => {
  const lattice = createRectangularLattice(createRectangularSurface({ address, width: 8, height: 4, units: 'map-units' }), 9, 5);
  assert.deepEqual(lattice.positionAt({ column: 8, row: 4 }), at(8, 4));
  for (const [index, offset] of [
    [{ column: 0, row: 2 }, { column: -1, row: 0 }], [{ column: 8, row: 2 }, { column: 1, row: 0 }],
    [{ column: 2, row: 0 }, { column: 0, row: -1 }], [{ column: 2, row: 4 }, { column: 0, row: 1 }],
  ] as const) assert.equal(lattice.neighbor(index, offset), null);
  assert.deepEqual(lattice.neighbor({ column: 3, row: 2 }, { column: 1, row: 1 })!.index, { column: 4, row: 3 });
});

test('foreign identities, nonfinite coordinates and unsafe neighbors fail instead of crossing surfaces silently', () => {
  const surface = createRectangularSurface({ address, width: 10, height: 6, units: 'meters', periodicU: true });
  for (const replacement of [{ worldId: 'other' }, { surfaceId: 'interior' }, { patchId: 'other-face' }, { u: NaN }, { v: Infinity }]) assert.throws(() => surface.topology.normalize({ ...at(1, 1), ...replacement }));
  assert.throws(() => surface.topology.advance(at(1, 1), { du: Infinity, dv: 0 }));
  const lattice = createRectangularLattice(surface, 10, 7);
  assert.throws(() => lattice.positionAt({ column: 10, row: 0 }));
  assert.throws(() => lattice.neighbor({ column: 5, row: 0 }, { column: Number.MAX_SAFE_INTEGER, row: 0 }));
  assert.throws(() => lattice.neighbor({ column: 5, row: 0 }, { column: .5, row: 0 }));
  for (const width of [0, -1, NaN, Infinity]) assert.throws(() => createRectangularSurface({ address, width, height: 6, units: 'meters' }));
  assert.throws(() => createRectangularSurface({ address: { ...address, patchId: '' }, width: 1, height: 1, units: 'meters' }));
  assert.throws(() => createRectangularLattice(surface, 1, 7));
  const tiny = createRectangularSurface({ address, width: Number.MIN_VALUE, height: 1, units: 'meters', periodicU: true });
  assert.throws(() => createRectangularLattice(tiny, 2, 2), /precision/);
  assert.throws(() => createRectangularLattice(surface, Number.MAX_SAFE_INTEGER, 2), /resolution/);
});

test('tangent transport preserves periodic heading; rotated/reversed chart bases are explicit and validated', () => {
  assert.deepEqual(transportTangent({ du: 2, dv: -3 }, IDENTITY_TRANSPORT), { du: 2, dv: -3 });
  const quarterTurn = { uu: 0, uv: -1, vu: 1, vv: 0 }, inverse = { uu: 0, uv: 1, vu: -1, vv: 0 };
  const transported = transportTangent({ du: 2, dv: 3 }, quarterTurn);
  assert.deepEqual(transported, { du: -3, dv: 2 });
  assert.deepEqual(transportTangent(transported, inverse), { du: 2, dv: 3 });
  assert.deepEqual(transportTangent({ du: 2, dv: 3 }, { uu: 1, uv: 0, vu: 0, vv: -1 }), { du: 2, dv: -3 });
  assert.throws(() => transportTangent({ du: 1, dv: 0 }, { uu: 1, uv: 1, vu: 1, vv: 1 }));
  assert.throws(() => transportTangent({ du: NaN, dv: 0 }, IDENTITY_TRANSPORT));
});
