import { assertFloat32Elevation, type Terrain } from './model.ts';
import type { Point } from './sampling.ts';

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

export const FLOAT32_MAX = 3.4028234663852886e38;

export function brushRadiusLimits(terrain: Terrain) {
  const { width, height } = terrain.metadata.dimensions;
  const { columns, rows } = terrain.metadata.resolution;
  return {
    min: Math.hypot(width / (columns - 1), height / (rows - 1)),
    max: Math.hypot(width, height),
  };
}

function validateTerrain(terrain: Terrain): void {
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
    || point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
    throw new RangeError('Brush center must lie on the editing surface.');
  }
}

function stamp(terrain: Terrain, center: Point, settings: Readonly<BrushSettings>): boolean {
  const { columns, rows } = terrain.metadata.resolution;
  const { width, height } = terrain.metadata.dimensions;
  const stepX = width / (columns - 1);
  const stepY = height / (rows - 1);
  const { radius, tool } = settings;
  const left = Math.max(0, Math.floor((center.x - radius) / stepX));
  const right = Math.min(columns - 1, Math.ceil((center.x + radius) / stepX));
  const top = Math.max(0, Math.floor((center.y - radius) / stepY));
  const bottom = Math.min(rows - 1, Math.ceil((center.y + radius) / stepY));

  // Validate the affected region before writing any part of this dab. Also protects
  // against a caller introducing a bad elevation while a stroke is in progress.
  const halo = tool === 'smooth' ? 1 : 0;
  const sourceLeft = Math.max(0, left - halo);
  const sourceRight = Math.min(columns - 1, right + halo);
  const sourceTop = Math.max(0, top - halo);
  const sourceBottom = Math.min(rows - 1, bottom + halo);
  const sourceWidth = sourceRight - sourceLeft + 1;
  const source = tool === 'smooth'
    ? new Float32Array(sourceWidth * (sourceBottom - sourceTop + 1)) : null;
  for (let row = sourceTop; row <= sourceBottom; row += 1) {
    for (let column = sourceLeft; column <= sourceRight; column += 1) {
      if (!Number.isFinite(terrain.elevations[row * columns + column])) {
        throw new RangeError('Brush region contains a non-finite elevation.');
      }
      if (source) source[(row - sourceTop) * sourceWidth + column - sourceLeft] = terrain.elevations[row * columns + column]!;
    }
  }

  let changed = false;
  for (let row = top; row <= bottom; row += 1) {
    const dy = (row * stepY - center.y) / radius;
    for (let column = left; column <= right; column += 1) {
      const dx = (column * stepX - center.x) / radius;
      const distance = Math.hypot(dx, dy);
      if (distance >= 1) continue;
      // Reversed smoothstep: zero slope at both center and boundary.
      const falloff = Math.max(0, Math.min(1, (1 - distance) ** 2 * (1 + 2 * distance)));
      const index = row * columns + column;
      const current = terrain.elevations[index]!;
      let value = current;
      if (settings.tool === 'raise' || settings.tool === 'lower') {
        value = current + (settings.tool === 'raise' ? 1 : -1) * settings.strength * falloff;
      } else if (settings.tool === 'smooth' || settings.tool === 'flatten') {
        let target: number;
        if (settings.tool === 'flatten') {
          target = settings.targetElevation;
        } else {
          // Each dab reads a fixed source tile plus a one-cell halo. Every
          // neighborhood sees the same pre-dab data, regardless of scan order.
          let sum = 0;
          let count = 0;
          for (let neighborRow = Math.max(0, row - 1); neighborRow <= Math.min(rows - 1, row + 1); neighborRow += 1) {
            for (let neighborColumn = Math.max(0, column - 1); neighborColumn <= Math.min(columns - 1, column + 1); neighborColumn += 1) {
              sum += source![(neighborRow - sourceTop) * sourceWidth + neighborColumn - sourceLeft]!;
              count += 1;
            }
          }
          target = sum / count;
        }
        const alpha = settings.intensity * falloff;
        value = current * (1 - alpha) + target * alpha;
      }
      const next = Math.fround(Math.max(-FLOAT32_MAX, Math.min(FLOAT32_MAX, value)));
      if (next !== current) {
        terrain.elevations[index] = next;
        changed = true;
      }
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
