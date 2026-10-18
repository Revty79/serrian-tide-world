import { assertFloat32Elevation, type Terrain } from './model.ts';
import type { Point } from './sampling.ts';
import { isWrapped, wrappedMath } from './topology.ts';
import { radialFalloff, saturatedElevation } from './brush-math.ts';

export type BrushTool = 'raise' | 'lower' | 'smooth' | 'flatten';

interface BrushBase {
  /** Radius in the terrain's logical map units, never screen pixels. */
  radius: number;
}

export type BrushSettings = BrushBase & (
  | { tool: 'raise' | 'lower'; strength: number }
  | { tool: 'smooth'; intensity: number }
  | { tool: 'flatten'; intensity: number; targetElevation: number }
);

export interface BrushStroke {
  readonly settings: Readonly<BrushSettings>;
  moveTo(point: Point): boolean;
  end(): void;
}

export { FLOAT32_MAX } from './brush-math.ts';

export function brushRadiusLimits(terrain: Terrain) {
  const { width, height } = terrain.metadata.dimensions;
  const { columns, rows } = terrain.metadata.resolution;
  return {
    min: Math.hypot(width / (isWrapped(terrain) ? columns : columns - 1), height / (rows - 1)),
    max: Math.hypot(width, height),
  };
}

function validateTerrain(terrain: Terrain): void {
  if (isWrapped(terrain)) wrappedMath(terrain);
  const { dimensions, resolution, surface, seaLevel } = terrain.metadata;
  if (surface !== 'planar'
    || ![dimensions.width, dimensions.height].every((value) => Number.isFinite(value) && value > 0)
    || ![resolution.columns, resolution.rows].every((value) => Number.isSafeInteger(value) && value >= 2)
    || !(terrain.elevations instanceof Float32Array)
    || terrain.elevations.length !== resolution.columns * resolution.rows
    || !Number.isFinite(seaLevel)
    || !Number.isFinite(brushRadiusLimits(terrain).max)) {
    throw new RangeError('The brush requires a valid planar Float32 terrain grid.');
  }
  // Once per stroke, before the first mutation. Do not propagate corrupt input data.
  if (!terrain.elevations.every(Number.isFinite)) {
    throw new RangeError('Terrain contains a non-finite elevation.');
  }
}

function validateSettings(terrain: Terrain, settings: BrushSettings): void {
  const limits = brushRadiusLimits(terrain);
  if (!['raise', 'lower', 'smooth', 'flatten'].includes(settings.tool)
    || !Number.isFinite(settings.radius)
    || settings.radius < limits.min || settings.radius > limits.max) {
    throw new RangeError('Choose a supported tool and map-unit radius.');
  }
  if (settings.tool === 'raise' || settings.tool === 'lower') {
    if (!Number.isFinite(settings.strength) || Math.fround(settings.strength) <= 0) {
      throw new RangeError('Raise/Lower strength must be positive and finite.');
    }
    assertFloat32Elevation(settings.strength);
  } else if (settings.tool === 'smooth' || settings.tool === 'flatten') {
    if (!Number.isFinite(settings.intensity) || settings.intensity < 0 || settings.intensity > 1) {
      throw new RangeError('Smooth/Flatten intensity must be between zero and one.');
    }
    if (settings.tool === 'flatten') assertFloat32Elevation(settings.targetElevation);
  }
}

function validatePoint(terrain: Terrain, point: Point): void {
  const { width, height } = terrain.metadata.dimensions;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
    || (!isWrapped(terrain) && (point.x < 0 || point.x > width)) || point.y < 0 || point.y > height) {
    throw new RangeError('Brush center must lie on the editing surface.');
  }
}

function stamp(terrain: Terrain, center: Point, settings: Readonly<BrushSettings>): boolean {
  const { columns, rows } = terrain.metadata.resolution;
  const { width, height } = terrain.metadata.dimensions;
  const periodic = isWrapped(terrain) ? wrappedMath(terrain) : null;
  const stepX = width / (periodic ? columns : columns - 1), stepY = height / (rows - 1);
  const { radius, tool } = settings;
  const canonical = periodic ? periodic.surface.topology.normalize({ ...periodic.surface.chart.address, u: center.x, v: center.y })! : null;
  const centerX = canonical?.u ?? center.x;
  const left = Math.floor((centerX - radius) / stepX), right = Math.ceil((centerX + radius) / stepX);
  const top = Math.max(0, Math.floor((center.y - radius) / stepY)), bottom = Math.min(rows - 1, Math.ceil((center.y + radius) / stepY));
  const wrapColumn = (column: number) => ((column % columns) + columns) % columns;
  // Enumerate each physical column once, even when radius spans a whole period.
  const activeColumns = periodic
    ? right - left + 1 >= columns ? Array.from({ length: columns }, (_, i) => i) : Array.from({ length: right - left + 1 }, (_, i) => wrapColumn(left + i))
    : Array.from({ length: Math.min(columns - 1, right) - Math.max(0, left) + 1 }, (_, i) => Math.max(0, left) + i);
  const neighbors = (column: number) => periodic
    ? [...new Set([wrapColumn(column - 1), column, wrapColumn(column + 1)])]
    : Array.from({ length: Math.min(columns - 1, column + 1) - Math.max(0, column - 1) + 1 }, (_, i) => Math.max(0, column - 1) + i);
  const halo = tool === 'smooth' ? 1 : 0;
  const sourceTop = Math.max(0, top - halo), sourceBottom = Math.min(rows - 1, bottom + halo);
  const sourceColumns = tool === 'smooth' ? [...new Set(activeColumns.flatMap(neighbors))] : activeColumns;
  const source = tool === 'smooth' ? new Float32Array(sourceColumns.length * (sourceBottom - sourceTop + 1)) : null;
  const sourceOffsets = new Int32Array(columns).fill(-1);
  sourceColumns.forEach((column, i) => { sourceOffsets[column] = i; });
  for (let row = sourceTop; row <= sourceBottom; row++) for (const column of sourceColumns) {
    const value = terrain.elevations[row * columns + column]!;
    if (!Number.isFinite(value)) throw new RangeError('Brush region contains a non-finite elevation.');
    if (source) source[(row - sourceTop) * sourceColumns.length + sourceOffsets[column]!] = value;
  }
  let changed = false;
  for (let row = top; row <= bottom; row++) {
    const dy = (row * stepY - center.y) / radius;
    for (const column of activeColumns) {
      const distance = periodic
        ? periodic.surface.metric.distance(canonical!, { ...periodic.surface.chart.address, u: column * stepX, v: row * stepY }).value / radius
        : Math.hypot((column * stepX - center.x) / radius, dy);
      if (distance >= 1) continue;
      const falloff = radialFalloff(distance);
      const index = row * columns + column, current = terrain.elevations[index]!;
      let value = current;
      if (settings.tool === 'raise' || settings.tool === 'lower') {
        value = current + (settings.tool === 'raise' ? 1 : -1) * settings.strength * falloff;
      } else if (settings.tool === 'smooth' || settings.tool === 'flatten') {
        let target: number;
        if (settings.tool === 'flatten') target = settings.targetElevation;
        else {
          let sum = 0, count = 0;
          for (let neighborRow = Math.max(0, row - 1); neighborRow <= Math.min(rows - 1, row + 1); neighborRow++) {
            for (const neighborColumn of neighbors(column)) {
              sum += source![(neighborRow - sourceTop) * sourceColumns.length + sourceOffsets[neighborColumn]!]!; count++;
            }
          }
          target = sum / count;
        }
        const alpha = settings.intensity * falloff;
        value = current * (1 - alpha) + target * alpha;
      }
      const next = saturatedElevation(value);
      if (next !== current) { terrain.elevations[index] = next; changed = true; }
    }
  }
  return changed;
}

/**
 * One initial dab, then a stamp every radius/4 map units along the input polyline.
 * Residual distance carries across events; duplicate points and elapsed time add
 * no strength. Ending adds no extra dab. Settings are fixed for this stroke.
 */
export function startBrushStroke(terrain: Terrain, point: Point, settings: BrushSettings): BrushStroke {
  validateTerrain(terrain);
  validateSettings(terrain, settings);
  validatePoint(terrain, point);
  const snapshot = Object.freeze({ ...settings });
  const spacing = snapshot.radius / 4;
  let previous = { ...point };
  let untilNext = spacing;
  let active = true;
  stamp(terrain, previous, snapshot);

  return {
    settings: snapshot,
    moveTo(target) {
      if (!active) return false;
      validatePoint(terrain, target);
      const dx = target.x - previous.x;
      const dy = target.y - previous.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) return false;
      let distance = untilNext;
      let changed = false;
      const tolerance = Number.EPSILON * 32 * Math.max(length, spacing);
      while (distance <= length + tolerance) {
        const t = Math.min(1, distance / length);
        changed = stamp(terrain, {
          x: previous.x + dx * t,
          y: previous.y + dy * t,
        }, snapshot) || changed;
        distance += spacing;
      }
      untilNext = distance - length;
      previous = { ...target };
      return changed;
    },
    end() { active = false; },
  };
}
