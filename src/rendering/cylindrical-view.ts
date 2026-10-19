import { cross3, dot3, unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { cylinderAngle, type CylinderGeometry, type CylinderPosition, type CylinderRegion } from '../surfaces/cylinder.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';

export interface CylinderScreenPoint { readonly x: number; readonly y: number }
export interface CylinderViewport { readonly width: number; readonly height: number }
export interface CylinderFrame { readonly right: Vec3; readonly up: Vec3; readonly forward: Vec3 }
export interface CylinderView {
  readonly mode: 'physical' | 'map'; readonly frame: CylinderFrame; readonly zoom: number;
  /** Normalized reference XYZ target (z is centered); map translation is in radius units. */
  readonly target: Vec3; readonly pan: CylinderScreenPoint; readonly phase: number;
}
export function initialCylinderView(mode: CylinderView['mode'] = 'physical'): CylinderView {
  const forward = unitDirection([1, -.55, .65]), right = unitDirection(cross3([0, 0, 1], forward));
  return { mode, frame: { right, up: unitDirection(cross3(forward, right)), forward }, zoom: 1, target: [0, 0, 0], pan: { x: 0, y: 0 }, phase: 0 };
}
export function cylinderLayout(geometry: CylinderGeometry, view: CylinderView, size: CylinderViewport) {
  if (![size.width, size.height, view.zoom].every(v => Number.isFinite(v) && v > 0) || view.zoom < .6 || view.zoom > 6 || !['physical', 'map'].includes(view.mode)
    || ![...view.target, view.pan.x, view.pan.y, view.phase].every(Number.isFinite)) throw new RangeError('Invalid cylinder view/viewport.');
  const { right, up, forward } = view.frame;
  if (![right, up, forward].every(v => v.length === 3 && v.every(Number.isFinite) && Math.abs(Math.hypot(...v) - 1) < 1e-10)
    || Math.abs(dot3(right, up)) > 1e-10 || dot3(cross3(right, up), forward) < 1 - 1e-10) throw new RangeError('Orthonormal right-handed cylinder camera required.');
  const h = geometry.metadata.lengthMeters / geometry.metadata.radiusMeters / 2;
  if (!Number.isFinite(h) || h <= 0) throw new RangeError('Unrepresentable cylinder view aspect ratio.');
  const halfWidth = view.mode === 'map' ? Math.PI : Math.hypot(right[0], right[1]) + h * Math.abs(right[2]);
  const halfHeight = view.mode === 'map' ? h + 2 : Math.hypot(up[0], up[1]) + h * Math.abs(up[2]);
  return { x: size.width / 2, y: size.height / 2, scale: Math.min(size.width * .84 / (2 * halfWidth), size.height * .70 / (2 * halfHeight)) * view.zoom, h };
}
export interface CylinderRayHit { readonly region: CylinderRegion; readonly theta: number; readonly radial: number; readonly z: number; readonly depth: number }
/** Frontmost intersection of an orthographic ray with the convex solid, in radius units. */
export function cylinderRayHit(x: number, y: number, frame: CylinderFrame, h: number): CylinderRayHit | undefined {
  const f = frame.forward, o = frame.right.map((v, i) => v * x + frame.up[i]! * y);
  let t = -Infinity, region: CylinderRegion = 'side', px = 0, py = 0, pz = 0;
  const offer = (candidate: number, patch: CylinderRegion) => {
    if (!Number.isFinite(candidate) || candidate <= t) return;
    const a = o[0]! + f[0] * candidate, b = o[1]! + f[1] * candidate, z = o[2]! + f[2] * candidate;
    if (patch === 'side' ? z < -h - 1e-10 || z > h + 1e-10 : a * a + b * b > 1 + 1e-10) return;
    t = candidate; region = patch; px = a; py = b; pz = Math.max(-h, Math.min(h, z));
  };
  const a = f[0] ** 2 + f[1] ** 2, b = 2 * (o[0]! * f[0] + o[1]! * f[1]), c = o[0]! ** 2 + o[1]! ** 2 - 1;
  if (a > 1e-24) {
    const d = b * b - 4 * a * c;
    if (d >= 0) { const q = -.5 * (b + (b < 0 ? -1 : 1) * Math.sqrt(d)); if (q === 0) offer(-b / (2 * a), 'side'); else { offer(q / a, 'side'); offer(c / q, 'side'); } }
  }
  if (Math.abs(f[2]) > 1e-12) { offer((-h - o[2]!) / f[2], 'cap-start'); offer((h - o[2]!) / f[2], 'cap-end'); }
  return t === -Infinity ? undefined : { region, theta: Math.atan2(py, px), radial: Math.min(1, Math.hypot(px, py)), z: pz, depth: t };
}
export function cylinderMapHit(x: number, y: number, h: number, phase: number): CylinderRayHit | undefined {
  const edgeRoundoff = 1e-12 * Math.max(1, h);
  if (Math.abs(x) <= Math.PI + edgeRoundoff && y >= -h - edgeRoundoff && y <= h + edgeRoundoff) return { region: 'side', theta: phase + Math.max(-Math.PI, Math.min(Math.PI, x)), radial: 1, z: Math.max(-h, Math.min(h, y)), depth: 0 };
  for (const [region, center, sign] of [['cap-start', -h - 1, 1], ['cap-end', h + 1, -1]] as const) {
    const dy = y - center, radial = Math.hypot(x, dy);
    if (radial <= 1 + edgeRoundoff) return { region, theta: radial === 0 ? 0 : phase + Math.atan2(x, sign * dy), radial: Math.min(1, radial), z: region === 'cap-start' ? -h : h, depth: 0 };
  }
}
export function hitToCylinderPosition(geometry: CylinderGeometry, hit: CylinderRayHit): CylinderPosition {
  const { radiusMeters: r, lengthMeters: l } = geometry.metadata;
  return geometry.normalize({ ...geometry.identity, patchId: hit.region, u: hit.region === 'cap-end' ? -hit.theta : hit.theta, v: hit.region === 'side' ? Math.max(0, Math.min(l, (hit.z + l / r / 2) * r)) : hit.radial * r });
}
export function unprojectCylinder(geometry: CylinderGeometry, point: CylinderScreenPoint, view: CylinderView, size: CylinderViewport): CylinderPosition | undefined {
  const l = cylinderLayout(geometry, view, size), x = (point.x - l.x) / l.scale, y = (l.y - point.y) / l.scale;
  const hit = view.mode === 'map' ? cylinderMapHit(x - view.pan.x, y - view.pan.y, l.h, view.phase)
    : cylinderRayHit(x + dot3(view.target, view.frame.right), y + dot3(view.target, view.frame.up), view.frame, l.h);
  return hit && hitToCylinderPosition(geometry, hit);
}
function normalizedXYZ(geometry: CylinderGeometry, position: SurfacePosition): Vec3 {
  const p = geometry.referencePosition(position), r = geometry.metadata.radiusMeters;
  return [p[0] / r, p[1] / r, (p[2] - geometry.metadata.lengthMeters / 2) / r];
}
/** Geometric visibility is independent of viewport clipping. Exact shared rims may use either alias. */
export function cylinderPositionVisible(geometry: CylinderGeometry, position: SurfacePosition, frame: CylinderFrame) {
  const normalized = geometry.normalize(position), { radiusMeters: r, lengthMeters: length } = geometry.metadata;
  const xyz = geometry.referencePosition(normalized), sideFacing = xyz[0] / r * frame.forward[0] + xyz[1] / r * frame.forward[1];
  const rim = normalized.patchId === 'side' ? normalized.v === 0 || normalized.v === length : normalized.v === r;
  const capFacing = (xyz[2] === 0 ? -1 : 1) * frame.forward[2];
  if ((rim ? Math.max(sideFacing, capFacing) : normalized.patchId === 'side' ? sideFacing : capFacing) < 0) return false;
  const p = normalizedXYZ(geometry, position), h = geometry.metadata.lengthMeters / geometry.metadata.radiusMeters / 2;
  const hit = cylinderRayHit(dot3(p, frame.right), dot3(p, frame.up), frame, h);
  return !!hit && Math.abs(hit.depth - dot3(p, frame.forward)) <= 2e-9 * Math.max(1, h);
}
export function projectCylinder(geometry: CylinderGeometry, input: SurfacePosition, view: CylinderView, size: CylinderViewport): CylinderScreenPoint | undefined {
  const p = geometry.normalize(input), l = cylinderLayout(geometry, view, size); let x: number, y: number;
  if (view.mode === 'physical') {
    if (!cylinderPositionVisible(geometry, p, view.frame)) return;
    const xyz = normalizedXYZ(geometry, p).map((v, i) => v - view.target[i]!) as unknown as Vec3;
    x = dot3(xyz, view.frame.right); y = dot3(xyz, view.frame.up);
  } else {
    const theta = p.patchId === 'cap-end' ? -p.u : p.u, a = cylinderAngle(theta - view.phase), radial = p.v / geometry.metadata.radiusMeters;
    if (p.patchId === 'side') { x = a; y = p.v / geometry.metadata.radiusMeters - l.h; }
    else { x = Math.sin(a) * radial; y = (p.patchId === 'cap-start' ? 1 : -1) * Math.cos(a) * radial + (p.patchId === 'cap-start' ? -l.h - 1 : l.h + 1); }
    x += view.pan.x; y += view.pan.y;
  }
  return { x: l.x + x * l.scale, y: l.y - y * l.scale };
}
export function rotateCylinder(view: CylinderView, dx: number, dy: number): CylinderView {
  if (![dx, dy].every(Number.isFinite)) throw new RangeError('Finite cylinder rotation required.');
  const { forward, right, up } = view.frame, yaw = -dx, pitch = dy;
  const f = forward.map((v, i) => v * Math.cos(yaw) + right[i]! * Math.sin(yaw)) as unknown as Vec3;
  const r = unitDirection(cross3(up, f)), next = unitDirection(f.map((v, i) => v * Math.cos(pitch) + up[i]! * Math.sin(pitch)) as unknown as Vec3);
  return { ...view, frame: { right: r, forward: next, up: unitDirection(cross3(next, r)) } };
}
export function navigateCylinder(geometry: CylinderGeometry, view: CylinderView, dx: number, dy: number, size: CylinderViewport): CylinderView {
  const l = cylinderLayout(geometry, view, size);
  return view.mode === 'physical' ? rotateCylinder(view, dx / (l.scale * 1.5), dy / (l.scale * 1.5))
    : { ...view, pan: { x: Math.max(-8, Math.min(8, view.pan.x + dx / l.scale)), y: Math.max(-8 - l.h, Math.min(8 + l.h, view.pan.y - dy / l.scale)) } };
}
export function recenterCylinder(geometry: CylinderGeometry, view: CylinderView, input: SurfacePosition): CylinderView {
  const p = geometry.normalize(input), theta = p.patchId === 'cap-end' ? -p.u : p.u;
  if (view.mode === 'map') {
    const next = { ...view, phase: cylinderAngle(theta), pan: { x: 0, y: 0 } }, screen = projectCylinder(geometry, p, next, { width: 100, height: 100 })!, l = cylinderLayout(geometry, next, { width: 100, height: 100 });
    return { ...next, pan: { x: -(screen.x - l.x) / l.scale, y: (screen.y - l.y) / l.scale } };
  }
  const forward = geometry.normal(p), fallback: Vec3 = Math.abs(forward[2]) > .9 ? [0, 1, 0] : [0, 0, 1];
  const right = unitDirection(cross3(fallback, forward));
  return { ...view, target: normalizedXYZ(geometry, p), frame: { forward, right, up: unitDirection(cross3(forward, right)) } };
}
/** Real displayed joins only. The disk and line share one tangent point, not an entire false edge. */
export function continuousCylinderScreenSegment(geometry: CylinderGeometry, a: CylinderScreenPoint, b: CylinderScreenPoint, view: CylinderView, size: CylinderViewport) {
  if (Math.hypot(b.x - a.x, b.y - a.y) > 96) return false;
  const first = unprojectCylinder(geometry, a, view, size), last = unprojectCylinder(geometry, b, view, size);
  if (!first || !last) return false;
  if (view.mode === 'physical') return true; // Convex projected solid; the numerical engine still bounds physical transitions.
  if (first.patchId === last.patchId) return true; // Each displayed region is convex, with no repeated side copy.
  if (first.patchId !== 'side' && last.patchId !== 'side') return false;
  const l = cylinderLayout(geometry, view, size), ax = (a.x - l.x) / l.scale - view.pan.x, ay = (l.y - a.y) / l.scale - view.pan.y, bx = (b.x - l.x) / l.scale - view.pan.x, by = (l.y - b.y) / l.scale - view.pan.y;
  const region = first.patchId === 'side' ? last.patchId : first.patchId, y = region === 'cap-start' ? -l.h : l.h;
  if (ay === by) return false;
  const t = (y - ay) / (by - ay);
  return t >= 0 && t <= 1 && Math.abs(ax + t * (bx - ax)) <= 1e-8;
}
