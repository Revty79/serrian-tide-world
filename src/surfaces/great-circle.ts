import { add3, cross3, dot3, scale3, unitDirection, type Vec3 } from './cube-sphere.ts';

export const IDENTICAL_ARC_TOLERANCE = 64 * Number.EPSILON;
export const ANTIPODAL_ARC_TOLERANCE = 1e-8;
/** Inputs here are already finite unit vectors. */
export const unitArcAngle = (a: Vec3, b: Vec3) => Math.atan2(Math.hypot(...cross3(a, b)), Math.max(-1, Math.min(1, dot3(a, b))));

/** Shortest great circle. Near-antipodes require an intermediate point, never an invented axis. */
export function greatCircleArc(first: Vec3, second: Vec3) {
  const a = unitDirection(first), b = unitDirection(second), angle = unitArcAngle(a, b);
  if (Math.PI - angle <= ANTIPODAL_ARC_TOLERANCE) throw new RangeError('Near-antipodal stroke segment is ambiguous; supply an intermediate physical position.');
  const stationary = angle <= IDENTICAL_ARC_TOLERANCE;
  const tangent = stationary ? a : cross3(unitDirection(cross3(a, b)), a);
  return {
    angle: stationary ? 0 : angle,
    at(fraction: number): Vec3 {
      if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new RangeError('Great-circle fraction must be in [0,1].');
      if (fraction === 0 || stationary) return a;
      if (fraction === 1) return b;
      return unitDirection(add3(scale3(a, Math.cos(angle * fraction)), scale3(tangent, Math.sin(angle * fraction))));
    },
  };
}
