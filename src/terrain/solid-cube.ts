import type { PatchEdge, SurfaceIdentity } from '../surfaces/contracts.ts';
import { createSolidCubeGeometry, cubeDot, SOLID_CUBE_FACES, SOLID_CUBE_FRAMES, solidCubeConnection, type CubeVector, type SolidCubeConfiguration, type SolidCubeFace } from '../surfaces/solid-cube.ts';
import { assertFloat32Elevation } from './model.ts';

export const SOLID_CUBE_REPRESENTATION = 'physical-cube-shared-boundary-vertices' as const;
export const SOLID_CUBE_REPRESENTATION_VERSION = 1 as const;
export const DEFAULT_SOLID_CUBE_CELLS = 128;
export const MAX_SOLID_CUBE_CELLS = 256;
export const MAX_SOLID_CUBE_REVISION = Number.MAX_SAFE_INTEGER;
export const MAX_CUBE_PATCH_SAMPLES = 65_536;
export interface CubePatchBlock { readonly indices: Uint32Array; readonly before: Float32Array; readonly after: Float32Array; readonly count: number }
const cubeViewPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const cubeViewBuffer = Object.getOwnPropertyDescriptor(cubeViewPrototype, 'buffer')!.get!;
const cubeViewLength = Object.getOwnPropertyDescriptor(cubeViewPrototype, 'length')!.get!;
const cubeViewName = Object.getOwnPropertyDescriptor(cubeViewPrototype, Symbol.toStringTag)!.get!;
const cubeUnsharedBuffer = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')!.get!;
export interface SolidCubeSampleAddress extends SurfaceIdentity { readonly patchId: SolidCubeFace; readonly column: number; readonly row: number }
export interface SolidCubeSampleKey extends SurfaceIdentity {
  readonly terrainId: string;
  readonly representation: typeof SOLID_CUBE_REPRESENTATION;
  readonly representationVersion: 1;
  readonly sideLengthMeters: number;
  readonly cellsPerEdge: number;
  readonly index: number;
}
export function solidCubeSampleCount(cells: number): number {
  if (!Number.isSafeInteger(cells) || cells < 2 || cells > MAX_SOLID_CUBE_CELLS) throw new RangeError(`Cube cells per edge must be an integer from 2 to ${MAX_SOLID_CUBE_CELLS}.`);
  return 6 * cells * cells + 2;
}

/** Isolated numerical foundation; not a document format, selectable world or brush engine. */
export function createSolidCubeTerrain(options: { readonly terrainId: string; readonly geometry: SolidCubeConfiguration; readonly cellsPerEdge?: number }) {
  if (!options || typeof options.terrainId !== 'string' || !options.terrainId.trim() || options.terrainId.length > 128) throw new RangeError('Cube terrain identity must contain 1-128 characters.');
  const cells = options.cellsPerEdge === undefined ? DEFAULT_SOLID_CUBE_CELLS : options.cellsPerEdge, count = solidCubeSampleCount(cells);
  const geometry = createSolidCubeGeometry(options.geometry), identity = geometry.identity, length = geometry.metadata.sideLengthMeters, half = length / 2;
  const sampleSpacingMeters = length / cells, halfStep = half / cells;
  if (![sampleSpacingMeters, halfStep, sampleSpacingMeters * sampleSpacingMeters].every((value) => Number.isFinite(value) && value > 0)) throw new RangeError('Cube lattice spacing/area is outside the supported precision range.');
  const metadata = Object.freeze({ terrainId: options.terrainId, identity, geometry: geometry.metadata,
    representation: Object.freeze({ provider: SOLID_CUBE_REPRESENTATION, version: SOLID_CUBE_REPRESENTATION_VERSION, cellsPerEdge: cells, ownership: 'first-incident-face' as const, faces: SOLID_CUBE_FACES }),
    elevationUnits: 'meters' as const, seaLevel: 0,
  });
  // The first incident face in px,nx,py,ny,pz,nz owns each boundary vertex.
  // X faces own all nodes, Y faces exclude X edges, Z faces exclude X/Y edges.
  let offset = 0;
  const groups = SOLID_CUBE_FACES.map((face, i) => {
    const minColumn = i < 2 ? 0 : 1, minRow = i < 4 ? 0 : 1;
    const width = i < 2 ? cells + 1 : cells - 1, height = i < 4 ? cells + 1 : cells - 1;
    const group = Object.freeze({ face, minColumn, minRow, width, count: width * height, offset });
    offset += group.count; return group;
  });
  // Only retained sample-sized allocation. No independent face arrays or alias caches.
  const elevations = new Float32Array(count).fill(-100);
  let revision = 0;
  const keyAt = (index: number): SolidCubeSampleKey => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw new RangeError('Invalid canonical cube sample index.');
    return { ...identity, terrainId: metadata.terrainId, representation: SOLID_CUBE_REPRESENTATION, representationVersion: 1, sideLengthMeters: length, cellsPerEdge: cells, index: index === 0 ? 0 : index };
  };
  const checkedKey = (key: SolidCubeSampleKey): number => {
    if (!key || key.worldId !== identity.worldId || key.surfaceId !== identity.surfaceId || key.terrainId !== metadata.terrainId
      || key.representation !== SOLID_CUBE_REPRESENTATION || key.representationVersion !== 1 || key.sideLengthMeters !== length || key.cellsPerEdge !== cells) throw new RangeError('Foreign cube terrain, geometry or representation key.');
    return keyAt(key.index).index;
  };
  const checkedAddress = (a: SolidCubeSampleAddress): SolidCubeSampleAddress => {
    if (!a || a.worldId !== identity.worldId || a.surfaceId !== identity.surfaceId || !(SOLID_CUBE_FACES as readonly string[]).includes(a.patchId)) throw new RangeError('Foreign cube sample address.');
    if (![a.column, a.row].every((v) => Number.isSafeInteger(v) && v >= 0 && v <= cells)) throw new RangeError('Invalid cube face lattice coordinates.');
    return { ...identity, patchId: a.patchId, column: a.column === 0 ? 0 : a.column, row: a.row === 0 ? 0 : a.row };
  };
  // Integer boundary coordinates: each component in [-N,N], step two; at least one is +/-N.
  const latticePoint = (input: SolidCubeSampleAddress): CubeVector => {
    const a = checkedAddress(input), f = SOLID_CUBE_FRAMES[a.patchId], u = 2 * a.column - cells, v = 2 * a.row - cells;
    return [0, 1, 2].map((axis) => cells * f.normal[axis]! + u * f.u[axis]! + v * f.v[axis]!) as unknown as CubeVector;
  };
  const addressOnFace = (q: CubeVector, face: SolidCubeFace): SolidCubeSampleAddress => ({ ...identity, patchId: face,
    column: (cubeDot(q, SOLID_CUBE_FRAMES[face].u) + cells) / 2, row: (cubeDot(q, SOLID_CUBE_FRAMES[face].v) + cells) / 2 });
  const resolve = (input: SolidCubeSampleAddress): SolidCubeSampleKey => {
    const q = latticePoint(input);
    const faceIndex = q[0] === cells ? 0 : q[0] === -cells ? 1 : q[1] === cells ? 2 : q[1] === -cells ? 3 : q[2] === cells ? 4 : 5;
    const group = groups[faceIndex]!, a = addressOnFace(q, group.face);
    return keyAt(group.offset + (a.row - group.minRow) * group.width + a.column - group.minColumn);
  };
  const owner = (key: SolidCubeSampleKey): SolidCubeSampleAddress => {
    const index = checkedKey(key), g = groups.find((g) => index < g.offset + g.count)!, local = index - g.offset;
    return { ...identity, patchId: g.face, column: local % g.width + g.minColumn, row: Math.floor(local / g.width) + g.minRow };
  };
  const aliases = (key: SolidCubeSampleKey): readonly SolidCubeSampleAddress[] => {
    const q = latticePoint(owner(key));
    return SOLID_CUBE_FACES.filter((face) => cubeDot(q, SOLID_CUBE_FRAMES[face].normal) === cells).map((face) => addressOnFace(q, face));
  };
  const coordinate = (i: number) => i === 0 ? -half : i === cells ? half : (2 * i - cells) * halfStep;
  const positionAt = (input: SolidCubeSampleAddress) => {
    const a = checkedAddress(input);
    return geometry.normalize({ ...identity, patchId: a.patchId, u: coordinate(a.column), v: coordinate(a.row) });
  };
  /** Change chart at the SAME boundary sample. No implicit corner travel or skipped lattice step. */
  const crossEdge = (input: SolidCubeSampleAddress, edge: PatchEdge) => {
    const a = checkedAddress(input), c = solidCubeConnection(a.patchId, edge), uEdge = edge.startsWith('u');
    if ((uEdge ? a.column : a.row) !== (edge.endsWith('min') ? 0 : cells)) throw new RangeError('Sample is not on the requested cube edge.');
    const sourceAlong = uEdge ? a.row : a.column, along = c.reversed ? cells - sourceAlong : sourceAlong, fixed = c.toEdge.endsWith('min') ? 0 : cells;
    const address: SolidCubeSampleAddress = { ...identity, patchId: c.toFace, column: c.toEdge.startsWith('u') ? fixed : along, row: c.toEdge.startsWith('v') ? fixed : along };
    return { address, sample: resolve(address), transport: geometry.tangentTransform(positionAt(a), positionAt(address)) };
  };
  /** Undirected reference mesh edges. Degree four except the eight degree-three corners. */
  const neighbors = (key: SolidCubeSampleKey): readonly SolidCubeSampleKey[] => {
    const found = new Set<number>();
    for (const a of aliases(key)) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const column = a.column + dx!, row = a.row + dy!;
      if (column >= 0 && column <= cells && row >= 0 && row <= cells) found.add(resolve({ ...a, column, row }).index);
    }
    found.delete(checkedKey(key)); return [...found].sort((a, b) => a - b).map(keyAt);
  };
  return Object.freeze({
    metadata, geometry, sampleCount: count, elevationByteLength: elevations.byteLength, sampleSpacingMeters,
    keyAt, resolve, owner, aliases, positionAt, crossEdge, neighbors,
    referencePositionAt: (key: SolidCubeSampleKey): CubeVector => geometry.referencePosition(positionAt(owner(key))),
    read: (key: SolidCubeSampleKey): number => elevations[checkedKey(key)]!,
    write: (key: SolidCubeSampleKey, value: number): void => {
      const index = checkedKey(key); assertFloat32Elevation(value); const next = Math.fround(value);
      if (!Object.is(elevations[index], next)) {
        if (revision >= MAX_SOLID_CUBE_REVISION) throw new RangeError('Cube revision limit reached; terrain is unchanged.');
        elevations[index] = next; revision++;
      }
    },
    /** C1: validate the entire bounded patch, then publish without callbacks or allocations. */
    commitPreparedPatch: (binding: SolidCubeSampleKey, expectedRevision: number, blocks: readonly CubePatchBlock[]): number => {
      checkedKey(binding);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !Array.isArray(blocks)) throw new RangeError('Invalid cube patch epoch or block count.');
      const blockCount = blocks.length;
      if (!Number.isSafeInteger(blockCount) || blockCount < 0 || blockCount > 64) throw new RangeError('Invalid cube patch block count.');
      // Finish ALL caller descriptor reads before value validation. Do not invoke
      // caller .map/species or typed-view buffer/length property overrides.
      const prepared: CubePatchBlock[] = [];
      for (let i = 0; i < blockCount; i++) {
        const b = blocks[i]!; prepared.push({ indices: b.indices, before: b.before, after: b.after, count: b.count });
      }
      let previous = -1, total = 0, changed = 0;
      for (const b of prepared) {
        for (const [array, prototype] of [[b.indices, Uint32Array.prototype], [b.before, Float32Array.prototype], [b.after, Float32Array.prototype]] as const) {
          if (!ArrayBuffer.isView(array) || Object.getPrototypeOf(array) !== prototype
            || cubeViewName.call(array) !== (prototype === Uint32Array.prototype ? 'Uint32Array' : 'Float32Array')) throw new RangeError('Cube patches require intrinsic Uint32/Float32 views.');
          try { cubeUnsharedBuffer.call(cubeViewBuffer.call(array)); }
          catch { throw new RangeError('Cube patches require actual nonshared ArrayBuffers.'); }
        }
        if (!Number.isSafeInteger(b.count) || b.count < 0 || b.count > cubeViewLength.call(b.indices) || b.count > cubeViewLength.call(b.before) || b.count > cubeViewLength.call(b.after)) throw new RangeError('Invalid cube patch extent.');
        total += b.count;
        if (total > MAX_CUBE_PATCH_SAMPLES) throw new RangeError('Cube atomic patch sample limit exceeded.');
        for (let i = 0; i < b.count; i++) {
          const index = b.indices[i]!, before = b.before[i]!, after = b.after[i]!;
          if (index <= previous || index >= count || !Number.isFinite(before) || !Number.isFinite(after)
            || !Object.is(elevations[index], before)) throw new RangeError('Cube patch requires unique sorted indices and exact valid source words.');
          previous = index; if (!Object.is(before, after)) changed++;
        }
      }
      if (revision !== expectedRevision || !Number.isSafeInteger(revision + changed)) throw new Error('Cube patch source changed or revision capacity was exhausted.');
      for (const b of prepared) for (let i = 0; i < b.count; i++) {
        const index = b.indices[i]!, after = b.after[i]!;
        if (!Object.is(elevations[index], after)) { elevations[index] = after; revision++; }
      }
      return changed;
    },
    get revision() { return revision; },
    copyElevations: (): Float32Array => elevations.slice(),
    *samples(): Generator<SolidCubeSampleKey> { for (let i = 0; i < count; i++) yield keyAt(i); },
  });
}
export type SolidCubeTerrain = ReturnType<typeof createSolidCubeTerrain>;
