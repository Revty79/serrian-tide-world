/** Mathematical contracts only. No UI, browser storage or world-database assumptions. */
export interface SurfaceIdentity {
  readonly worldId: string;
  readonly surfaceId: string;
}
export interface ChartAddress extends SurfaceIdentity { readonly patchId: string }
export interface SurfacePosition extends ChartAddress { readonly u: number; readonly v: number }
export interface SurfaceTangent { readonly du: number; readonly dv: number }
export type SurfaceUnits = 'map-units' | 'meters';

/** Destination chart components = this Jacobian times source chart components. */
export interface TangentTransform {
  readonly uu: number; readonly uv: number;
  readonly vu: number; readonly vv: number;
}
export const IDENTITY_TRANSPORT: TangentTransform = Object.freeze({ uu: 1, uv: 0, vu: 0, vv: 1 });
export interface Traversal {
  readonly position: SurfacePosition;
  readonly transport: TangentTransform;
}

export interface SurfaceTopology {
  readonly identity: SurfaceIdentity;
  /** Canonical representative, null at a real boundary; invalid numbers/foreign identities throw. */
  normalize(position: SurfacePosition): SurfacePosition | null;
  /** Chart displacement, not a universal geodesic/exponential-map operation. */
  advance(position: SurfacePosition, displacement: SurfaceTangent): Traversal | null;
}
export interface SurfaceMetric {
  /** Intrinsic distance on the reference surface, not distance across a projection or elevated relief. */
  distance(a: SurfacePosition, b: SurfacePosition): { readonly value: number; readonly units: SurfaceUnits };
}

export type PatchEdge = 'u-min' | 'u-max' | 'v-min' | 'v-max';
/** Contract for later multi-patch providers. A seam identifies one place on one physical surface. */
export interface ChartSeam {
  readonly from: { readonly chart: ChartAddress; readonly edge: PatchEdge };
  readonly to: { readonly chart: ChartAddress; readonly edge: PatchEdge };
  /** Parameter along either edge increases with the remaining chart coordinate. */
  readonly alongEdge: 'same' | 'reversed';
}
/** Independent per-edge policies for future patches, including cylinder ends. */
export type EdgeRule = { readonly kind: 'bounded' } | { readonly kind: 'seam'; readonly connection: ChartSeam };
export type PatchBoundaries = Readonly<Record<PatchEdge, EdgeRule>>;

/** View-only contract. Outputs may repeat a place in different visible copies. No terrain writes. */
export interface MapProjection<ViewState> {
  readonly provider: string;
  readonly version: number;
  project(position: SurfacePosition, view: ViewState): readonly { readonly x: number; readonly y: number; readonly copyId: string }[];
  /** Returns a canonical surface position or null for an uneditable/outside location. */
  unproject(point: { readonly x: number; readonly y: number }, view: ViewState): SurfacePosition | null;
}

export function assertIdentity(identity: SurfaceIdentity): void {
  if (typeof identity.worldId !== 'string' || !identity.worldId.trim()
    || typeof identity.surfaceId !== 'string' || !identity.surfaceId.trim()) throw new RangeError('World and surface identities are required.');
}
export function assertChart(address: ChartAddress): void {
  assertIdentity(address);
  if (typeof address.patchId !== 'string' || !address.patchId.trim()) throw new RangeError('A patch identity is required.');
}
export function transportTangent(tangent: SurfaceTangent, transform: TangentTransform): SurfaceTangent {
  const { uu, uv, vu, vv } = transform;
  if (![tangent.du, tangent.dv, uu, uv, vu, vv].every(Number.isFinite)
    || !Number.isFinite(uu * vv - uv * vu) || uu * vv - uv * vu === 0) throw new RangeError('Invalid or singular tangent transport.');
  const du = uu * tangent.du + uv * tangent.dv, dv = vu * tangent.du + vv * tangent.dv;
  if (![du, dv].every(Number.isFinite)) throw new RangeError('Tangent transport overflow.');
  return { du, dv };
}
