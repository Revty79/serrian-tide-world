import {
  assertChart, IDENTITY_TRANSPORT, type ChartAddress, type SurfaceMetric, type SurfacePosition,
  type SurfaceTopology, type SurfaceUnits, type Traversal,
} from './contracts.ts';

export interface RectangularSurfaceOptions {
  readonly address: ChartAddress;
  readonly width: number;
  readonly height: number;
  readonly units: SurfaceUnits;
  readonly periodicU?: boolean;
  readonly periodicV?: boolean;
}
export interface RectangularSurface {
  readonly chart: Readonly<Required<RectangularSurfaceOptions>>;
  readonly topology: SurfaceTopology;
  readonly metric: SurfaceMetric;
}
function canonicalAxis(value: number, extent: number, periodic: boolean): number | null {
  if (!Number.isFinite(value)) throw new RangeError('Surface coordinates must be finite.');
  if (!periodic) return value >= 0 && value <= extent ? (value === 0 ? 0 : value) : null;
  // Remainder first avoids overflow from adding a period to a large positive value.
  const remainder = value % extent;
  const wrapped = remainder < 0 ? remainder + extent : remainder;
  // Rounding can produce the upper endpoint for a tiny negative input; canonicalize it.
  return wrapped === 0 || wrapped === extent ? 0 : wrapped;
}

/** Bounded Euclidean rectangle or flat periodic quotient; never a latitude/longitude sphere. */
export function createRectangularSurface(options: RectangularSurfaceOptions): RectangularSurface {
  assertChart(options.address);
  if (![options.width, options.height].every((value) => Number.isFinite(value) && value > 0)
    || !Number.isFinite(Math.hypot(options.width, options.height))
    || !['map-units', 'meters'].includes(options.units)
    || (options.periodicU !== undefined && typeof options.periodicU !== 'boolean')
    || (options.periodicV !== undefined && typeof options.periodicV !== 'boolean')) throw new RangeError('Invalid rectangular surface dimensions, units or periodicity.');
  const address = Object.freeze({ worldId: options.address.worldId, surfaceId: options.address.surfaceId, patchId: options.address.patchId });
  const chart = Object.freeze({ address, width: options.width, height: options.height, units: options.units, periodicU: options.periodicU ?? false, periodicV: options.periodicV ?? false });
  const identity = Object.freeze({ worldId: address.worldId, surfaceId: address.surfaceId });
  const normalize = (position: SurfacePosition): SurfacePosition | null => {
    if (position.worldId !== address.worldId || position.surfaceId !== address.surfaceId || position.patchId !== address.patchId) throw new RangeError('Position belongs to another world, surface or patch.');
    const u = canonicalAxis(position.u, chart.width, chart.periodicU), v = canonicalAxis(position.v, chart.height, chart.periodicV);
    return u === null || v === null ? null : { ...address, u, v };
  };
  const requirePosition = (position: SurfacePosition) => {
    const result = normalize(position);
    if (!result) throw new RangeError('Position lies beyond a bounded edge.');
    return result;
  };
  const topology = Object.freeze<SurfaceTopology>({
    identity, normalize,
    advance(position, displacement) {
      const source = requirePosition(position);
      if (![displacement.du, displacement.dv].every(Number.isFinite)) throw new RangeError('Displacement must be finite.');
      const target = normalize({ ...source, u: source.u + displacement.du, v: source.v + displacement.dv });
      return target ? { position: target, transport: IDENTITY_TRANSPORT } : null;
    },
  });
  const metric = Object.freeze<SurfaceMetric>({
    distance(a, b) {
      const first = requirePosition(a), second = requirePosition(b);
      let du = Math.abs(first.u - second.u), dv = Math.abs(first.v - second.v);
      if (chart.periodicU) du = Math.min(du, chart.width - du);
      if (chart.periodicV) dv = Math.min(dv, chart.height - dv);
      return { value: Math.hypot(du, dv), units: chart.units };
    },
  });
  return Object.freeze({ chart, topology, metric });
}

export interface SampleIndex { readonly column: number; readonly row: number }
/** Unique samples per period. Bounded axes include both endpoints; periodic axes exclude the upper endpoint. */
export function createRectangularLattice(surface: RectangularSurface, columns: number, rows: number) {
  if (![columns, rows].every((value) => Number.isSafeInteger(value) && value >= 2)
    || !Number.isSafeInteger(columns * rows)) throw new RangeError('Invalid lattice resolution.');
  const { chart } = surface;
  const stepU = chart.width / (chart.periodicU ? columns : columns - 1);
  const stepV = chart.height / (chart.periodicV ? rows : rows - 1);
  if (stepU <= 0 || stepV <= 0 || stepU < chart.width * Number.EPSILON || stepV < chart.height * Number.EPSILON
    || chart.width - stepU === chart.width || chart.height - stepV === chart.height) throw new RangeError('Lattice spacing is below coordinate precision.');
  const positionAt = (index: SampleIndex): SurfacePosition => {
    if (!Number.isInteger(index.column) || !Number.isInteger(index.row)
      || index.column < 0 || index.column >= columns || index.row < 0 || index.row >= rows) throw new RangeError('Sample lies beyond the lattice.');
    return { ...chart.address, u: index.column / (chart.periodicU ? columns : columns - 1) * chart.width, v: index.row / (chart.periodicV ? rows : rows - 1) * chart.height };
  };
  const neighbor = (index: SampleIndex, offset: SampleIndex): (Traversal & { readonly index: SampleIndex }) | null => {
    positionAt(index);
    const column = index.column + offset.column, row = index.row + offset.row;
    if (![offset.column, offset.row, column, row].every(Number.isSafeInteger)) throw new RangeError('Neighbor offset is not a safe integer.');
    const nextColumn = canonicalAxis(column, columns, chart.periodicU), nextRow = canonicalAxis(row, rows, chart.periodicV);
    // Discrete bounded ranges end at count - 1, whereas continuous ranges include their maximum.
    if (nextColumn === null || nextRow === null || nextColumn >= columns || nextRow >= rows) return null;
    const next = { column: nextColumn, row: nextRow };
    return { index: next, position: positionAt(next), transport: IDENTITY_TRANSPORT };
  };
  return Object.freeze({ columns, rows, positionAt, neighbor });
}
