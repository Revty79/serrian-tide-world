import { assertIdentity, type SurfaceIdentity, type SurfacePosition, type SurfaceTangent, type TangentTransform } from './contracts.ts';

/** A representation frame, not gravity, geographic north or a viewing orientation. */
export type CylinderVector = readonly [number, number, number];
export const CYLINDER_PROVIDER = 'physical-closed-cylinder' as const;
export const CYLINDER_VERSION = 1 as const;
export const CYLINDER_REGIONS = Object.freeze(['side', 'cap-start', 'cap-end'] as const);
export type CylinderRegion = typeof CYLINDER_REGIONS[number];
export interface CylinderConfiguration {
  readonly identity: SurfaceIdentity;
  readonly provider: typeof CYLINDER_PROVIDER;
  readonly version: 1;
  readonly configuration: 'solid-capped';
  readonly role: 'exterior';
  readonly radiusMeters: number;
  readonly lengthMeters: number;
}
/** u = radians, v = axial meters on side / radial meters on caps. */
export interface CylinderPosition extends SurfacePosition { readonly patchId: CylinderRegion }
const TAU = 2 * Math.PI;
export function cylinderAngle(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Cylinder angle must be finite.');
  let angle = value % TAU;
  if (angle >= Math.PI) angle -= TAU;
  if (angle < -Math.PI) angle += TAU;
  return angle === 0 ? 0 : angle;
}
export function assertCylinderRegion(region: string): asserts region is CylinderRegion {
  if (!(CYLINDER_REGIONS as readonly string[]).includes(region)) throw new RangeError('Unknown cylinder region.');
}

/** No generic SurfaceMetric: a region-restricted distance is not the global closed-surface metric. */
export function createCylinderGeometry(input: CylinderConfiguration) {
  assertIdentity(input.identity);
  for (const id of [input.identity.worldId, input.identity.surfaceId]) {
    if (id.length > 128) throw new RangeError('Cylinder identities must contain 1-128 characters.');
  }
  if (input.provider !== CYLINDER_PROVIDER || input.version !== 1 || input.configuration !== 'solid-capped' || input.role !== 'exterior') {
    throw new RangeError('Only version 1 solid capped exterior cylinders are implemented.');
  }
  const { radiusMeters: radius, lengthMeters: length } = input;
  const circumferenceMeters = TAU * radius;
  if (![radius, length, circumferenceMeters].every((n) => Number.isFinite(n) && n > 0)
    || !Number.isFinite(Math.hypot(circumferenceMeters / 2, length))) {
    throw new RangeError('Cylinder dimensions and derived distances must be positive and finite.');
  }
  const identity = Object.freeze({ worldId: input.identity.worldId, surfaceId: input.identity.surfaceId });
  const metadata: CylinderConfiguration = Object.freeze({ identity, provider: CYLINDER_PROVIDER, version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: radius, lengthMeters: length });
  const normalize = (p: SurfacePosition): CylinderPosition => {
    if (p.worldId !== identity.worldId || p.surfaceId !== identity.surfaceId) throw new RangeError('Position belongs to another cylinder surface.');
    assertCylinderRegion(p.patchId);
    const limit = p.patchId === 'side' ? length : radius;
    if (!Number.isFinite(p.v) || p.v < 0 || p.v > limit) throw new RangeError('Position outside cylinder chart.');
    const u = cylinderAngle(p.u);
    return { ...identity, patchId: p.patchId, u: p.patchId !== 'side' && p.v === 0 ? 0 : u, v: p.v === 0 ? 0 : p.v };
  };
  const physicalAngle = (p: CylinderPosition) => cylinderAngle(p.patchId === 'cap-end' ? -p.u : p.u);
  const referencePosition = (input: SurfacePosition): CylinderVector => {
    const p = normalize(input), theta = physicalAngle(p), r = p.patchId === 'side' ? radius : p.v;
    // Center coordinates are canonical, independent of any angular alias.
    return [r === 0 ? 0 : r * Math.cos(theta), r === 0 ? 0 : r * Math.sin(theta), p.patchId === 'side' ? p.v : p.patchId === 'cap-end' ? length : 0];
  };
  const normal = (input: SurfacePosition): CylinderVector => {
    const p = normalize(input), theta = physicalAngle(p);
    return p.patchId === 'side' ? [Math.cos(theta), Math.sin(theta), 0] : [0, 0, p.patchId === 'cap-end' ? 1 : -1];
  };
  const tangentVector = (input: SurfacePosition, t: SurfaceTangent): CylinderVector => {
    const p = normalize(input);
    if (![t.du, t.dv].every(Number.isFinite)) throw new RangeError('Finite cylinder tangent required.');
    if (p.patchId !== 'side' && p.v === 0) throw new RangeError('Polar tangent basis is singular at a cap center; use a Cartesian cap tangent.');
    const theta = physicalAngle(p), s = Math.sin(theta), c = Math.cos(theta), angular = t.du * (p.patchId === 'side' ? radius : p.v) * (p.patchId === 'cap-end' ? -1 : 1);
    const vector: CylinderVector = p.patchId === 'side' ? [-s * angular, c * angular, t.dv] : [-s * angular + c * t.dv, c * angular + s * t.dv, 0];
    if (!vector.every(Number.isFinite)) throw new RangeError('Cylinder tangent overflow.');
    return vector;
  };
  /** Pointwise one-sided 90-degree fold isometry, NOT equality of ambient tangent vectors. */
  const crossRim = (input: SurfacePosition): { readonly position: CylinderPosition; readonly transport: TangentTransform } => {
    const p = normalize(input);
    let end: boolean;
    if (p.patchId === 'side') {
      if (p.v !== 0 && p.v !== length) throw new RangeError('Side position is not at a rim.');
      end = p.v === length;
    } else {
      if (p.v !== radius) throw new RangeError('Cap position is not at its rim.');
      end = p.patchId === 'cap-end';
    }
    return {
      position: normalize({ ...identity, patchId: p.patchId === 'side' ? (end ? 'cap-end' : 'cap-start') : 'side', u: end ? -p.u : p.u, v: p.patchId === 'side' ? radius : end ? length : 0 }),
      transport: Object.freeze({ uu: end ? -1 : 1, uv: 0, vu: 0, vv: end ? -1 : 1 }),
    };
  };
  const sameRegionDistance = (first: SurfacePosition, second: SurfacePosition) => {
    const a = normalize(first), b = normalize(second);
    if (a.patchId !== b.patchId) throw new RangeError('Region-restricted distance requires one chart; general cross-rim geodesics are unsupported.');
    const value = a.patchId === 'side'
      ? Math.hypot(radius * cylinderAngle(a.u - b.u), a.v - b.v)
      : (() => { const p = referencePosition(a), q = referencePosition(b); return Math.hypot(p[0] - q[0], p[1] - q[1]); })();
    return { value, units: 'meters' as const, scope: 'region-restricted' as const };
  };
  return Object.freeze({
    metadata, identity, circumferenceMeters, normalize, referencePosition, normal, tangentVector, crossRim, sameRegionDistance,
    /** Reject even same-region requests: a cap shortcut can beat the side-only route. */
    globalDistance: (a: SurfacePosition, b: SurfacePosition): never => { normalize(a); normalize(b); throw new RangeError('Global closed-cylinder geodesics are not implemented.'); },
    /** At the center the physical tangent plane exists; only the polar basis is singular. */
    capCartesianTangent: (region: Exclude<CylinderRegion, 'side'>, x: number, y: number): CylinderVector => {
      if (!['cap-start', 'cap-end'].includes(region) || ![x, y].every(Number.isFinite)) throw new RangeError('A cap and finite Cartesian components are required.');
      return [x, y, 0];
    },
  });
}
export type CylinderGeometry = ReturnType<typeof createCylinderGeometry>;
