import { assertIdentity, type SurfaceIdentity } from '../surfaces/contracts.ts';
import { CUBE_FACES, FACE_BASES, QUARTER_PI, createCubeSphereGeometry, dot3, faceConnection, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import { assertFloat32Elevation } from './model.ts';

export const SPHERICAL_REPRESENTATION = 'equiangular-cube-sphere-vertices' as const;
export const SPHERICAL_REPRESENTATION_VERSION = 1 as const;
export const DEFAULT_SPHERICAL_CELLS = 128;
export const MAX_SPHERICAL_CELLS = 512;
export interface SphericalSampleAddress extends SurfaceIdentity { readonly patchId: CubeFace; readonly column: number; readonly row: number }
export interface SphericalSampleKey extends SurfaceIdentity { readonly terrainId: string; readonly representationVersion: 1; readonly cellsPerEdge: number; readonly index: number }
export type CardinalDirection = 'u-' | 'u+' | 'v-' | 'v+';
export const CARDINAL_DIRECTIONS: readonly CardinalDirection[] = Object.freeze(['u-', 'u+', 'v-', 'v+']);
const DELTAS: Readonly<Record<CardinalDirection, readonly [number, number]>> = { 'u-': [-1, 0], 'u+': [1, 0], 'v-': [0, -1], 'v+': [0, 1] };
const OPPOSITE: Readonly<Record<CardinalDirection, CardinalDirection>> = { 'u-': 'u+', 'u+': 'u-', 'v-': 'v+', 'v+': 'v-' };
const AXIS_PAIRS = [[0, 1], [0, 2], [1, 2]] as const;
export function sphericalSampleCount(cells: number): number {
  if (!Number.isInteger(cells) || cells < 2 || cells > MAX_SPHERICAL_CELLS) throw new RangeError(`Spherical cells per edge must be an integer from 2 to ${MAX_SPHERICAL_CELLS}.`);
  return 6 * cells * cells + 2;
}

/** A numerical sphere, separate from the planar v1/v2 model and all save codecs/UI. */
export function createSphericalTerrain(options: { readonly terrainId: string; readonly identity: SurfaceIdentity; readonly radiusMeters: number; readonly cellsPerEdge?: number; readonly initialElevation?:number; readonly validateElevation?:(height:number)=>void; readonly validateSample?:(index:number,height:number,before:number)=>void }) {
  assertIdentity(options.identity);
  for (const id of [options.terrainId, options.identity.worldId, options.identity.surfaceId]) if (typeof id !== 'string' || !id.trim() || id.length > 128) throw new RangeError('Spherical identities must contain 1–128 characters.');
  const cells = options.cellsPerEdge ?? DEFAULT_SPHERICAL_CELLS, count = sphericalSampleCount(cells), side = cells - 1;
  const geometry = createCubeSphereGeometry(options.identity, options.radiusMeters), identity = geometry.identity;
  const interiorCount = 6 * side * side, cornerOffset = interiorCount + 12 * side;
  const metadata = Object.freeze({
    terrainId: options.terrainId, identity, geometry: Object.freeze({ kind: 'sphere' as const, radiusMeters: options.radiusMeters }),
    representation: Object.freeze({ provider: SPHERICAL_REPRESENTATION, version: SPHERICAL_REPRESENTATION_VERSION, cellsPerEdge: cells, ownership: 'interiors-edges-corners' as const, faces: CUBE_FACES }),
    elevationUnits: 'meters' as const, seaLevel: 0,
  });
  // The only authoritative elevation allocation. Face views are address resolvers, not arrays.
  const validateElevation=(height:number)=>{assertFloat32Elevation(height);options.validateElevation?.(Math.fround(height));};
  const initial=options.initialElevation??-100;validateElevation(initial);
  const elevations = new Float32Array(count).fill(initial);
  let revision = 0;
  const assertIndex = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= count) throw new RangeError('Invalid canonical spherical sample index.');
  };
  const keyAt = (index: number): SphericalSampleKey => {
    assertIndex(index);
    return { ...identity, terrainId: metadata.terrainId, representationVersion: 1, cellsPerEdge: cells, index };
  };
  const checkedKey = (key: SphericalSampleKey): number => {
    if (key.worldId !== identity.worldId || key.surfaceId !== identity.surfaceId || key.terrainId !== metadata.terrainId || key.representationVersion !== 1 || key.cellsPerEdge !== cells) throw new RangeError('Sample belongs to another terrain, surface or representation.');
    assertIndex(key.index); return key.index;
  };
  const validateSample=(key:SphericalSampleKey,value:number)=>{const index=checkedKey(key);validateElevation(value);options.validateSample?.(index,Math.fround(value),elevations[index]!);};
  const checkedAddress = (address: SphericalSampleAddress) => {
    if (address.worldId !== identity.worldId || address.surfaceId !== identity.surfaceId || !(CUBE_FACES as readonly string[]).includes(address.patchId)) throw new RangeError('Address belongs to another spherical surface or face.');
    if (![address.column, address.row].every((value) => Number.isInteger(value) && value >= 0 && value <= cells)) throw new RangeError('Invalid spherical face sample coordinates.');
    return address;
  };
  const cubeCoordinates = (input: SphericalSampleAddress): Vec3 => {
    const address = checkedAddress(input), frame = FACE_BASES[address.patchId], u = 2 * address.column - cells, v = 2 * address.row - cells;
    const coordinate = (axis: number) => cells * frame.normal[axis]! + u * frame.u[axis]! + v * frame.v[axis]!;
    return [coordinate(0), coordinate(1), coordinate(2)];
  };
  const resolve = (address: SphericalSampleAddress): SphericalSampleKey => {
    const q = cubeCoordinates(address), fixed = [0, 1, 2].filter((axis) => Math.abs(q[axis]!) === cells);
    if (fixed.length === 3) return keyAt(cornerOffset + (q[0] > 0 ? 4 : 0) + (q[1] > 0 ? 2 : 0) + (q[2] > 0 ? 1 : 0));
    if (fixed.length === 2) {
      const pair = AXIS_PAIRS.findIndex(([a, b]) => fixed[0] === a && fixed[1] === b), [a, b] = AXIS_PAIRS[pair]!;
      const edge = pair * 4 + (q[a] > 0 ? 2 : 0) + (q[b] > 0 ? 1 : 0), free = 3 - a - b;
      return keyAt(interiorCount + edge * side + (q[free]! + cells) / 2 - 1);
    }
    return keyAt(CUBE_FACES.indexOf(address.patchId) * side * side + (address.row - 1) * side + address.column - 1);
  };
  const cubeAtKey = (key: SphericalSampleKey): Vec3 => {
    const index = checkedKey(key);
    if (index < interiorCount) {
      const face = CUBE_FACES[Math.floor(index / (side * side))]!, local = index % (side * side);
      return cubeCoordinates({ ...identity, patchId: face, column: local % side + 1, row: Math.floor(local / side) + 1 });
    }
    if (index < cornerOffset) {
      const edge = Math.floor((index - interiorCount) / side), [a, b] = AXIS_PAIRS[Math.floor(edge / 4)]!, signs = edge % 4;
      const q: [number, number, number] = [0, 0, 0]; q[a] = signs & 2 ? cells : -cells; q[b] = signs & 1 ? cells : -cells;
      q[3 - a - b] = 2 * ((index - interiorCount) % side + 1) - cells;
      return q;
    }
    const corner = index - cornerOffset;
    return [corner & 4 ? cells : -cells, corner & 2 ? cells : -cells, corner & 1 ? cells : -cells];
  };
  const aliases = (key: SphericalSampleKey): readonly SphericalSampleAddress[] => {
    const q = cubeAtKey(key);
    return CUBE_FACES.filter((face) => dot3(q, FACE_BASES[face].normal) === cells).map((face) => ({
      ...identity, patchId: face, column: (dot3(q, FACE_BASES[face].u) + cells) / 2, row: (dot3(q, FACE_BASES[face].v) + cells) / 2,
    }));
  };
  const positionAt = (input: SphericalSampleAddress) => {
    const address = checkedAddress(input);
    return { ...identity, patchId: address.patchId, u: (2 * address.column / cells - 1) * QUARTER_PI, v: (2 * address.row / cells - 1) * QUARTER_PI };
  };
  const neighbors = (key: SphericalSampleKey, connectivity: 'edges' | 'cells' = 'edges'): readonly SphericalSampleKey[] => {
    const index = checkedKey(key);
    if (!['edges', 'cells'].includes(connectivity)) throw new RangeError('Unsupported spherical neighbor connectivity.');
    const found = new Set<number>();
    for (const address of aliases(key)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || (connectivity === 'edges' && Math.abs(dx) + Math.abs(dy) !== 1)) continue;
      const column = address.column + dx, row = address.row + dy;
      if (column >= 0 && column <= cells && row >= 0 && row <= cells) found.add(resolve({ ...address, column, row }).index);
    }
    found.delete(index); return [...found].sort((a, b) => a - b).map(keyAt);
  };
  const step = (input: SphericalSampleAddress, direction: CardinalDirection) => {
    const address = checkedAddress(input);
    if (!CARDINAL_DIRECTIONS.includes(direction)) throw new RangeError('Unsupported spherical step direction.');
    const delta = DELTAS[direction];
    const column = address.column + delta[0], row = address.row + delta[1];
    if (column >= 0 && column <= cells && row >= 0 && row <= cells) {
      const target = { ...address, column, row }; return { address: target, sample: resolve(target), reverseDirection: OPPOSITE[direction] };
    }
    const edge = direction === 'u-' ? 'u-min' : direction === 'u+' ? 'u-max' : direction === 'v-' ? 'v-min' : 'v-max';
    const connection = faceConnection(address.patchId, edge), sourceAlong = edge.startsWith('u') ? address.row : address.column;
    const along = connection.reversed ? cells - sourceAlong : sourceAlong;
    const fixed = connection.toEdge.endsWith('min') ? 0 : cells, inward = fixed === 0 ? 1 : -1;
    const target: SphericalSampleAddress = { ...identity, patchId: connection.toFace, column: connection.toEdge.startsWith('u') ? fixed + inward : along, row: connection.toEdge.startsWith('v') ? fixed + inward : along };
    const reverseDirection: CardinalDirection = connection.toEdge === 'u-min' ? 'u-' : connection.toEdge === 'u-max' ? 'u+' : connection.toEdge === 'v-min' ? 'v-' : 'v+';
    return { address: target, sample: resolve(target), reverseDirection, seam: geometry.crossEdge(positionAt(address), edge) };
  };
  return Object.freeze({
    metadata, geometry, sampleCount: count, elevationByteLength: elevations.byteLength, keyAt, resolve, aliases, positionAt, neighbors, step,validateElevation,validateSample,
    read: (key: SphericalSampleKey): number => elevations[checkedKey(key)]!,
    get revision() { return revision; },
    write: (key: SphericalSampleKey, value: number): void => {
      const index = checkedKey(key); validateSample(key,value); const next = Math.fround(value);
      if (!Object.is(elevations[index], next)) { elevations[index] = next; revision++; }
    },
    copyElevations: (): Float32Array => elevations.slice(),
    directionAt: (key: SphericalSampleKey): Vec3 => geometry.direction(positionAt(aliases(key)[0]!)),
    *samples(): Generator<SphericalSampleKey> { for (let index = 0; index < count; index++) yield keyAt(index); },
  });
}
export type SphericalTerrain = ReturnType<typeof createSphericalTerrain>;
