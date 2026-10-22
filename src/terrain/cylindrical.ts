import {BLANK_OCEAN_ELEVATION} from './initial-elevation.ts';
import type { SurfaceIdentity } from '../surfaces/contracts.ts';
import { createCylinderGeometry, cylinderAngle, type CylinderConfiguration, type CylinderRegion } from '../surfaces/cylinder.ts';
import { assertFloat32Elevation } from './model.ts';

export const CYLINDRICAL_REPRESENTATION = 'cylinder-rings-shared-rims' as const;
export interface CylinderResolution {
  readonly angularSamples: number;
  readonly axialCells: number;
  readonly radialCells: number;
}
export interface CylinderSampleAddress extends SurfaceIdentity {
  readonly patchId: CylinderRegion;
  /** Periodic integer; no duplicated endpoint. row = axial/radial index. */
  readonly column: number;
  readonly row: number;
}
export interface CylinderSampleKey extends SurfaceIdentity, CylinderResolution {
  readonly terrainId: string;
  readonly representation: typeof CYLINDRICAL_REPRESENTATION;
  readonly representationVersion: 1;
  readonly radiusMeters: number;
  readonly lengthMeters: number;
  readonly index: number;
}
export const MAX_CYLINDER_PATCH_SAMPLES = 65536;
export interface CylinderPatchBlock { readonly indices: Uint32Array; readonly values: Float32Array; readonly count: number }
export function cylindricalSampleCount(r: CylinderResolution): number {
  if (!Number.isInteger(r.angularSamples) || r.angularSamples < 4 || r.angularSamples > 1024
    || !Number.isInteger(r.axialCells) || r.axialCells < 2 || r.axialCells > 512
    || !Number.isInteger(r.radialCells) || r.radialCells < 2 || r.radialCells > 256) {
    throw new RangeError('Cylinder resolution requires angular 4-1024, axial 2-512, radial 2-256 integers.');
  }
  return r.angularSamples * (r.axialCells + 2 * r.radialCells - 1) + 2;
}

/** Numerical foundation only. Not part of AtlasDocument, UI selection or any save codec. */
export function createCylindricalTerrain(options: { readonly terrainId: string; readonly geometry: CylinderConfiguration; readonly resolution: CylinderResolution;readonly initialElevation?:number;readonly validateElevation?:(height:number)=>void;readonly validateSample?:(index:number,height:number,before:number)=>void }) {
  if (typeof options.terrainId !== 'string' || !options.terrainId.trim() || options.terrainId.length > 128) throw new RangeError('Cylinder terrain identity must contain 1-128 characters.');
  const count = cylindricalSampleCount(options.resolution), geometry = createCylinderGeometry(options.geometry), identity = geometry.identity;
  const { angularSamples: a, axialCells: z, radialCells: p } = options.resolution;
  // Keep chart spacings in the normal Float64 range, including the innermost ring's
  // angular separation. Subnormal coordinates can collapse distinct physical samples.
  const minNormal = 2 ** -1022;
  if (geometry.metadata.radiusMeters / p / a < minNormal || geometry.metadata.lengthMeters / z < minNormal) throw new RangeError('Cylinder sample spacing underflows the supported precision range.');
  const resolution = Object.freeze({ angularSamples: a, axialCells: z, radialCells: p });
  const sideCount = a * (z + 1), capCount = 1 + a * (p - 1);
  const metadata = Object.freeze({ terrainId: options.terrainId, identity, geometry: geometry.metadata,
    representation: Object.freeze({ provider: CYLINDRICAL_REPRESENTATION, version: 1 as const, resolution, ownership: 'side-rims-cap-interiors-single-centers' as const }), elevationUnits: 'meters' as const, seaLevel: 0 });
  // Only retained sample-sized storage: one private connected exterior authority. No alias/neighbor tables.
  const validateElevation=options.validateElevation,validateSample=options.validateSample,initial=options.initialElevation??BLANK_OCEAN_ELEVATION;assertFloat32Elevation(initial);validateElevation?.(Math.fround(initial));
  const elevations = new Float32Array(count).fill(initial);
  let revision = 0;
  const wrap = (c: number) => ((c % a) + a) % a;
  const keyAt = (index: number): CylinderSampleKey => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw new RangeError('Invalid cylinder canonical sample index.');
    return { ...identity, ...resolution, terrainId: metadata.terrainId, representation: CYLINDRICAL_REPRESENTATION, representationVersion: 1, radiusMeters: geometry.metadata.radiusMeters, lengthMeters: geometry.metadata.lengthMeters, index };
  };
  const checkedKey = (k: CylinderSampleKey) => {
    if (k.worldId !== identity.worldId || k.surfaceId !== identity.surfaceId || k.terrainId !== metadata.terrainId
      || k.representation !== CYLINDRICAL_REPRESENTATION || k.representationVersion !== 1
      || k.angularSamples !== a || k.axialCells !== z || k.radialCells !== p
      || k.radiusMeters !== geometry.metadata.radiusMeters || k.lengthMeters !== geometry.metadata.lengthMeters) throw new RangeError('Foreign cylinder terrain, geometry or representation key.');
    keyAt(k.index); return k.index;
  };
  const checkedAddress = (input: CylinderSampleAddress): CylinderSampleAddress => {
    if (input.worldId !== identity.worldId || input.surfaceId !== identity.surfaceId || !['side', 'cap-start', 'cap-end'].includes(input.patchId)) throw new RangeError('Foreign cylinder address.');
    if (!Number.isSafeInteger(input.column) || !Number.isSafeInteger(input.row) || input.row < 0 || input.row > (input.patchId === 'side' ? z : p)) throw new RangeError('Invalid cylinder chart sample coordinates.');
    return { ...identity, patchId: input.patchId, column: wrap(input.column), row: input.row };
  };
  const resolve = (input: CylinderSampleAddress): CylinderSampleKey => {
    const d = checkedAddress(input);
    if (d.patchId === 'side') return keyAt(d.row * a + d.column);
    const end = d.patchId === 'cap-end';
    if (d.row === p) return keyAt((end ? z * a : 0) + (end ? wrap(-d.column) : d.column));
    return keyAt(sideCount + (end ? capCount : 0) + (d.row === 0 ? 0 : 1 + (d.row - 1) * a + d.column));
  };
  const owner = (key: CylinderSampleKey): CylinderSampleAddress => {
    const i = checkedKey(key);
    if (i < sideCount) return { ...identity, patchId: 'side', column: i % a, row: Math.floor(i / a) };
    const end = i >= sideCount + capCount, j = i - sideCount - (end ? capCount : 0);
    return { ...identity, patchId: end ? 'cap-end' : 'cap-start', column: j === 0 ? 0 : (j - 1) % a, row: j === 0 ? 0 : Math.floor((j - 1) / a) + 1 };
  };
  const aliases = (key: CylinderSampleKey): readonly CylinderSampleAddress[] => {
    const d = owner(key);
    if (d.patchId === 'side' && (d.row === 0 || d.row === z)) return [d, { ...identity, patchId: d.row === 0 ? 'cap-start' : 'cap-end', column: d.row === 0 ? d.column : wrap(-d.column), row: p }];
    if (d.patchId !== 'side' && d.row === 0) return Array.from({ length: a }, (_, column) => ({ ...d, column }));
    return [d];
  };
  const positionAt = (input: CylinderSampleAddress) => {
    const d = checkedAddress(input), end = d.patchId === 'cap-end';
    // Form the physical angle first, including integer reversal at the end cap.
    // This gives shared rim aliases bit-identical reference coordinates, even for odd angular counts.
    const theta = cylinderAngle(2 * Math.PI * (end ? wrap(-d.column) : d.column) / a);
    return geometry.normalize({ ...identity, patchId: d.patchId, u: end ? -theta : theta, v: d.patchId === 'side' ? geometry.metadata.lengthMeters * (d.row / z) : geometry.metadata.radiusMeters * (d.row / p) });
  };
  const neighbors = (key: CylinderSampleKey): readonly CylinderSampleKey[] => {
    const d = owner(key), found = new Set<number>();
    const add = (address: CylinderSampleAddress) => found.add(resolve(address).index);
    if (d.patchId !== 'side' && d.row === 0) {
      for (let column = 0; column < a; column++) add({ ...d, row: 1, column });
    } else {
      add({ ...d, column: d.column - 1 }); add({ ...d, column: d.column + 1 });
      if (d.patchId === 'side') {
        if (d.row > 0) add({ ...d, row: d.row - 1 });
        if (d.row < z) add({ ...d, row: d.row + 1 });
        if (d.row === 0 || d.row === z) add({ ...aliases(key)[1]!, row: p - 1 });
      } else {
        add({ ...d, row: d.row - 1 }); add({ ...d, row: d.row + 1 });
      }
    }
    found.delete(key.index);
    return [...found].sort((x, y) => x - y).map(keyAt);
  };
  const crossRim = (input: CylinderSampleAddress) => {
    const d = checkedAddress(input);
    const seam = geometry.crossRim(positionAt(d)); // validates the requested edge
    const target: CylinderSampleAddress = d.patchId === 'side'
      ? { ...identity, patchId: d.row === 0 ? 'cap-start' : 'cap-end', column: d.row === 0 ? d.column : wrap(-d.column), row: p }
      : { ...identity, patchId: 'side', column: d.patchId === 'cap-end' ? wrap(-d.column) : d.column, row: d.patchId === 'cap-end' ? z : 0 };
    return { address: target, sample: resolve(target), transport: seam.transport };
  };
  return Object.freeze({
    metadata, geometry, sampleCount: count, elevationByteLength: elevations.byteLength, keyAt, resolve, owner, aliases, positionAt, neighbors, crossRim,
    referencePositionAt: (key: CylinderSampleKey) => geometry.referencePosition(positionAt(owner(key))),
    get revision() { return revision; },
    read: (key: CylinderSampleKey) => elevations[checkedKey(key)]!,
    write: (key: CylinderSampleKey, value: number) => {
      const index = checkedKey(key); assertFloat32Elevation(value); const next = Math.fround(value);validateElevation?.(next);validateSample?.(index,next,elevations[index]!);
      if (!Object.is(elevations[index], next)) { elevations[index] = next; revision++; }
    },
    /** Validate completely, then apply without allocation/callbacks. Revision remains per changed word. */
    commitPreparedPatch: (key: CylinderSampleKey, expectedRevision: number, blocks: readonly CylinderPatchBlock[]): number => {
      checkedKey(key);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !Array.isArray(blocks) || blocks.length > 256) throw new RangeError('Invalid cylinder patch guard or block count.');
      // Detach descriptors before validation; no caller property access in the write loop.
      const prepared: CylinderPatchBlock[] = blocks.map((block) => ({ indices: block.indices, values: block.values, count: block.count }));
      let previous = -1, total = 0, changed = 0;
      for (const block of prepared) {
        if (!ArrayBuffer.isView(block.indices) || Object.getPrototypeOf(block.indices) !== Uint32Array.prototype
          || !ArrayBuffer.isView(block.values) || Object.getPrototypeOf(block.values) !== Float32Array.prototype
          || !(block.indices.buffer instanceof ArrayBuffer) || !(block.values.buffer instanceof ArrayBuffer)
          || !Number.isSafeInteger(block.count) || block.count < 0 || block.count > block.indices.length || block.count > block.values.length) throw new RangeError('Invalid or shared cylinder patch arrays.');
        total += block.count;
        if (total > MAX_CYLINDER_PATCH_SAMPLES) throw new RangeError('Cylinder patch sample budget exceeded.');
        for (let i = 0; i < block.count; i++) {
          const index = block.indices[i]!, value = block.values[i]!;
          if (index <= previous || index >= count || !Number.isFinite(value)) throw new RangeError('Cylinder patch must have unique ordered indices and finite values.');
          validateElevation?.(value);validateSample?.(index,value,elevations[index]!);
          previous = index; if (!Object.is(elevations[index], value)) changed++;
        }
      }
      if (revision !== expectedRevision || !Number.isSafeInteger(revision + changed)) throw new Error('Cylinder patch source revision changed or overflowed.');
      for (const block of prepared) for (let i = 0; i < block.count; i++) {
        const index = block.indices[i]!, value = block.values[i]!;
        if (!Object.is(elevations[index], value)) { elevations[index] = value; revision++; }
      }
      return changed;
    },
    copyElevations: () => elevations.slice(),
    snapshot: () => Object.freeze({ metadata, revision, elevations: elevations.slice() }),
    *samples(): Generator<CylinderSampleKey> { for (let i = 0; i < count; i++) yield keyAt(i); },
  });
}
export type CylindricalTerrain = ReturnType<typeof createCylindricalTerrain>;
