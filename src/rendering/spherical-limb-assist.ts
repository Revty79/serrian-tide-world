import {sphereCenterInspection} from './spherical-view.ts';
import { cross3, dot3, unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { sphericalLayout, type ScreenPoint, type SphericalView, type Viewport } from './spherical-view.ts';

export const LIMB_DWELL_MS = 240;
export const LIMB_ZONE = .84;
export const MAX_LIMB_RADIANS_PER_SECOND = .35;
export const MAX_LIMB_FRAME_MS = 32;

/** The orthographic limb, independent of viewport edges, chart boundaries and zoom. */
export function globeLimbZone(view: SphericalView, point: ScreenPoint, size: Viewport) {
  if (view.mode !== 'globe' || sphereCenterInspection(view) || !Number.isFinite(point.x + point.y) || point.x < 0 || point.y < 0 || point.x > size.width || point.y > size.height) return null;
  const layout = sphericalLayout(view, size), x = (point.x - layout.x) / layout.radius, y = (layout.y - point.y) / layout.radius, rho = Math.hypot(x, y);
  if (rho < LIMB_ZONE || rho > 1) return null;
  return { x, y, rho, speed: ((rho - LIMB_ZONE) / (1 - LIMB_ZONE)) ** 2 };
}

/** One rigid camera rotation toward the held pointer, never a geography transform.
 * p = tangent*rho + forward*sqrt(1-rho²) is perpendicular to the rotation axis.
 * Thus p(t) and forward(t) both follow the same great-circle rigid rotation.
 * <= half a dab spacing per step; no catch-up after a slow/backlogged frame.
 */
export function advanceGlobeLimb(view: SphericalView, point: ScreenPoint, size: Viewport, elapsedMs: number, angularBrushRadius: number) {
  const zone = globeLimbZone(view, point, size);
  if (!zone || !Number.isFinite(elapsedMs) || elapsedMs <= 0 || !Number.isFinite(angularBrushRadius) || angularBrushRadius < .005 || angularBrushRadius > .2) return null;
  const angle = Math.min(angularBrushRadius / 8, MAX_LIMB_RADIANS_PER_SECOND * Math.min(MAX_LIMB_FRAME_MS, elapsedMs) / 1000 * zone.speed);
  if (!(angle > 0)) return null;
  const f = view.frame, tangent = unitDirection(f.right.map((v, i) => v * zone.x + f.up[i]! * zone.y) as unknown as Vec3), axis = unitDirection(cross3(f.forward, tangent));
  const rotate = (v: Vec3) => { const cross = cross3(axis, v), along = dot3(axis, v); return unitDirection(v.map((n, i) => n * Math.cos(angle) + cross[i]! * Math.sin(angle) + axis[i]! * along * (1 - Math.cos(angle))) as unknown as Vec3); };
  const forward = rotate(f.forward), right = unitDirection(cross3(rotate(f.up), forward)), up = unitDirection(cross3(forward, right));
  return { view: { ...view, frame: { forward, right, up } }, angle, fromHemisphere: f.forward, toHemisphere: forward };
}
