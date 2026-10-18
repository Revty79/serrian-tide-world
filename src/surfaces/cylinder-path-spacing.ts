import { CylinderDistanceUnsupportedError } from './cylinder-distance.ts';
import type { CylinderPhysicalPath, CylinderPathLocation } from './cylinder-path.ts';

export interface CylinderPathSpacingOptions {
  readonly spacingMeters: number;
  /** Distance already traveled since the preceding point, in [0,spacing). */
  readonly residualMeters?: number;
  readonly fromMeters?: number;
  readonly toMeters?: number;
  /** Limits point count, not the physical path. Use an explicit partial range to continue later. */
  readonly maxPoints?: number;
}
export interface CylinderPathSpacingEnd {
  readonly status: 'complete' | 'cancelled';
  readonly residualMeters: number;
  readonly traversedToMeters: number;
  readonly emittedPoints: number;
  readonly roundoffBoundMeters: number;
}
/** Bounded O(1)-storage lazy physical spacing. Never applies terrain dabs or evaluates a global metric. */
export function cylinderPathSpacings(path: CylinderPhysicalPath, options: CylinderPathSpacingOptions) {
  const spacing = options.spacingMeters, residual = options.residualMeters ?? 0, from = options.fromMeters ?? 0, to = options.toMeters ?? path.lengthMeters, max = options.maxPoints ?? 65536;
  if (path.provider !== 'physical-cylinder-path' || path.version !== 1 || ![spacing, residual, from, to].every(Number.isFinite) || spacing <= 0 || residual < 0 || residual >= spacing
    || from < 0 || to < from || to > path.lengthMeters || !Number.isInteger(max) || max < 1 || max > 65536) throw new RangeError('Invalid cylinder path spacing or traversal range.');
  const span = to - from, error = 64 * Number.EPSILON * Math.max(spacing, Math.abs(from), Math.abs(to), span, Number.MIN_VALUE) + 64 * Number.MIN_VALUE;
  if (spacing <= 4 * error) throw new CylinderDistanceUnsupportedError('precision', 'Cylinder path spacing is below traveled-distance resolution.');
  const total = residual + span;
  if (!Number.isFinite(total)) throw new CylinderDistanceUnsupportedError('range', 'Unrepresentable cylinder spacing residual.');
  const count = Math.floor(total / spacing);
  if (!Number.isSafeInteger(count) || count > max) throw new CylinderDistanceUnsupportedError('work-budget', 'Cylinder path spacing point budget exceeded; select a partial range.');
  let emitted = 0, traversed = from, end: CylinderPathSpacingEnd | undefined;
  const finish = (status: CylinderPathSpacingEnd['status'], target: number) => {
    let remainder = residual + (target - from) - emitted * spacing;
    if (remainder < -error || remainder >= spacing + error) throw new CylinderDistanceUnsupportedError('precision', 'Cylinder path spacing residual lost its certified range.');
    // A rounded exact multiple is zero, never a residual equal to one full step.
    remainder = remainder < 0 || remainder >= spacing ? 0 : remainder;
    end = Object.freeze({ status, residualMeters: remainder, traversedToMeters: target, emittedPoints: emitted, roundoffBoundMeters: error });
    return { done: true as const, value: end };
  };
  return Object.freeze({
    expectedPoints: count, roundoffBoundMeters: error,
    get status() { return end?.status ?? 'active'; },
    [Symbol.iterator]() { return this; },
    next(): IteratorResult<CylinderPathLocation, CylinderPathSpacingEnd> {
      if (end) return { done: true, value: end };
      if (emitted === count) return finish('complete', to);
      const next = from + ((emitted + 1) * spacing - residual);
      if (!(next > traversed) || next > to + error) throw new CylinderDistanceUnsupportedError('precision', 'Cylinder path spacing cannot represent its next physical advance.');
      const target = Math.min(to, next), value = path.atDistance(target);
      emitted++; traversed = target;
      return { done: false, value };
    },
    return(): IteratorReturnResult<CylinderPathSpacingEnd> { return end ? { done: true, value: end } : finish('cancelled', traversed); },
  });
}
