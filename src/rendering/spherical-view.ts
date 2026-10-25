import {cutGlobePosition,cutGlobeNormal,cutGlobeRegion,cutGlobeVisible,traceCutGlobe,type CrescentCutGlobeGeometry,type CrescentCutGlobeRegion} from '../surfaces/crescent-cut-globe.ts';
import { CUBE_FACES, cross3, dot3, unitDirection, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import type { PatchEdge } from '../surfaces/contracts.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';

export interface ScreenPoint { readonly x: number; readonly y: number }
export interface Viewport { readonly width: number; readonly height: number }
export interface SphereFrame { readonly right: Vec3; readonly up: Vec3; readonly forward: Vec3 }
export interface SphericalView { readonly cutGlobe?:CrescentCutGlobeGeometry;readonly mapRegion?:CrescentCutGlobeRegion; readonly mode: 'globe' | 'net'; readonly frame: SphereFrame; readonly zoom: number; readonly pan: ScreenPoint; readonly interior?:boolean; readonly interiorView?:'edit'|'center';readonly eyeMeters?:Vec3 }
/** An inside bank uses the fitted editing projection unless inspection is explicit. */
export const sphereCenterInspection=(view:SphericalView)=>view.mode==='globe'&&view.interior===true&&view.interiorView==='center';
export const INITIAL_SPHERICAL_VIEW: SphericalView = Object.freeze({ mode: 'globe', frame: Object.freeze({ right: [0, 1, 0] as Vec3, up: [0, 0, 1] as Vec3, forward: [1, 0, 0] as Vec3 }), zoom: 1, pan: Object.freeze({ x: 0, y: 0 }) });
export const NET_FACES: Readonly<Record<CubeFace, readonly [number, number]>> = Object.freeze({ ny: [0, 1], px: [1, 1], py: [2, 1], nx: [3, 1], pz: [1, 0], nz: [1, 2] });
const Q = Math.PI / 4;
const finitePoint = (point: ScreenPoint) => Number.isFinite(point.x) && Number.isFinite(point.y);
export function sphericalLayout(view: SphericalView, size: Viewport) {
  if(view.eyeMeters&&(view.eyeMeters.length!==3||!view.eyeMeters.every(Number.isFinite)))throw RangeError('Finite spherical inspection eye required.');
  if (!(size.width > 0 && size.height > 0) || !Number.isFinite(size.width + size.height) || !Number.isFinite(view.zoom) || view.zoom < 1 || view.zoom > 4 || !finitePoint(view.pan)) throw new RangeError('Invalid spherical viewport or view.');
  const f = view.frame;
  if (!['globe', 'net'].includes(view.mode) || ![f.right, f.up, f.forward].every((v) => v.length === 3 && v.every(Number.isFinite) && Math.abs(Math.hypot(...v) - 1) < 1e-10)
    || Math.abs(dot3(f.right, f.up)) > 1e-10 || dot3(cross3(f.right, f.up), f.forward) < 1 - 1e-10) throw new RangeError('A finite orthonormal right-handed camera frame is required.');
  return { x: size.width / 2, y: size.height / 2, radius: Math.min(size.width, size.height) * .42 * view.zoom,
    face: Math.min(size.width / 4.4, size.height / 3.6) * view.zoom };
}
/** Recenter through camera orientation, with a deterministic fallback at the current up pole. */
export function recenterSphere(view: SphericalView, direction: Vec3): SphericalView {
  const forward = unitDirection(view.cutGlobe?cutGlobeNormal(view.cutGlobe,unitDirection(direction)):direction);
  let up = view.frame.up;
  if (Math.abs(dot3(up, forward)) > .999999) up = Math.abs(forward[2]) < .9 ? [0, 0, 1] : [0, 1, 0];
  const right = unitDirection(cross3(up, forward)); up = unitDirection(cross3(forward, right));
  return { ...view, frame: { right, up, forward } };
}
export function rotateSphere(view: SphericalView, dx: number, dy: number): SphericalView {
  if (!Number.isFinite(dx + dy)) throw new RangeError('Invalid rotation.');
  const { right, up, forward } = view.frame, yaw = -dx, pitch = dy;
  const f = forward.map((v, i) => v * Math.cos(yaw) + right[i]! * Math.sin(yaw)) as unknown as Vec3;
  const r = unitDirection(cross3(up, f));
  const nextForward = unitDirection(f.map((v, i) => v * Math.cos(pitch) + up[i]! * Math.sin(pitch)) as unknown as Vec3);
  return { ...view, frame: { forward: nextForward, right: r, up: unitDirection(cross3(nextForward, r)) } };
}
export const zoomSphere = (view: SphericalView, factor: number): SphericalView => {
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Invalid spherical zoom.');
  return { ...view, zoom: Math.max(1, Math.min(4, view.zoom * factor)) };
};
export function panSphereNet(view: SphericalView, dx: number, dy: number, size: Viewport): SphericalView {
  if (!Number.isFinite(dx + dy)) throw new RangeError('Invalid net pan.');
  const face = sphericalLayout(view, size).face;
  // Enough travel to center every face, with finite bounded navigation state.
  return { ...view, pan: { x: Math.max(-3, Math.min(3, view.pan.x + dx / face)), y: Math.max(-2, Math.min(2, view.pan.y + dy / face)) } };
}
/** Local net s,t are right/down in [0,1]; cap orientations are essential to the five joined folds. */
export function netFaceCoordinates(face: CubeFace, u: number, v: number): ScreenPoint {
  return face === 'pz' ? { x: (v / Q + 1) / 2, y: (u / Q + 1) / 2 }
    : face === 'nz' ? { x: (1 - v / Q) / 2, y: (1 - u / Q) / 2 }
      : { x: (u / Q + 1) / 2, y: (1 - v / Q) / 2 };
}
export function netFaceAngles(face: CubeFace, s: number, t: number) {
  return face === 'pz' ? { u: (2 * t - 1) * Q, v: (2 * s - 1) * Q }
    : face === 'nz' ? { u: (1 - 2 * t) * Q, v: (1 - 2 * s) * Q }
      : { u: (2 * s - 1) * Q, v: (1 - 2 * t) * Q };
}
export function netFaceRect(face: CubeFace, view: SphericalView, size: Viewport) {
  const l = sphericalLayout(view, size), [column, row] = NET_FACES[face];
  return { x: l.x + (column - 2 + view.pan.x) * l.face, y: l.y + (row - 1.5 + view.pan.y) * l.face, side: l.face };
}
/** Classify folds in net coordinates, independently of viewport clipping/zoom. */
export function netEdgeIsJoined(terrain: SphericalTerrain, face: CubeFace, edge: PatchEdge): boolean {
  return [-Q, Q].every((along) => {
    const position = { ...terrain.metadata.identity, patchId: face, u: edge.startsWith('u') ? (edge.endsWith('min') ? -1 : 1) * Q : along, v: edge.startsWith('v') ? (edge.endsWith('min') ? -1 : 1) * Q : along };
    const to = terrain.geometry.crossEdge(position, edge).position, a = netFaceCoordinates(face, position.u, position.v), b = netFaceCoordinates(to.patchId, to.u, to.v);
    return Math.hypot(NET_FACES[face][0] + a.x - NET_FACES[to.patchId][0] - b.x, NET_FACES[face][1] + a.y - NET_FACES[to.patchId][1] - b.y) < 1e-12;
  });
}
/** Direction -> all visible chart occurrences. Globe occlusion is explicit; net cut copies are presentation only. */
export function projectSphere(terrain: SphericalTerrain, input: Vec3, view: SphericalView, size: Viewport): readonly (ScreenPoint & { readonly face: CubeFace })[] {
  const direction = unitDirection(input), l = sphericalLayout(view, size), positions = terrain.geometry.positionsForDirection(direction);
  if(view.cutGlobe){const g=view.cutGlobe;if(view.mode==='globe'){if(!cutGlobeVisible(g,direction,view.frame.forward))return [];const q=cutGlobePosition(g,direction),point={x:l.x+l.radius*dot3(q,view.frame.right),y:l.y-l.radius*dot3(q,view.frame.up),face:positions[0]!.patchId};return point.x>=0&&point.y>=0&&point.x<=size.width&&point.y<=size.height?[point]:[];}if(view.mapRegion&&view.mapRegion!=='all'&&cutGlobeRegion(g,direction)!==view.mapRegion)return [];}
  if (view.mode === 'globe') {
    if(sphereCenterInspection(view)){const z=dot3(direction,view.frame.forward);if(z<=1e-12)return[];const p={x:l.x-l.radius*dot3(direction,view.frame.right)/z,y:l.y-l.radius*dot3(direction,view.frame.up)/z,face:positions[0]!.patchId};return p.x>=-1e-9&&p.y>=-1e-9&&p.x<=size.width+1e-9&&p.y<=size.height+1e-9?[{...p,x:Math.max(0,Math.min(size.width,p.x)),y:Math.max(0,Math.min(size.height,p.y))}]:[];}
    if (dot3(direction, view.frame.forward) < -1e-14) return [];
    const point = { x: l.x + l.radius * dot3(direction, view.frame.right), y: l.y - l.radius * dot3(direction, view.frame.up), face: positions[0]!.patchId };
    return point.x >= 0 && point.y >= 0 && point.x <= size.width && point.y <= size.height ? [point] : [];
  }
  return positions.map((position) => {
    const r = netFaceRect(position.patchId, view, size), local = netFaceCoordinates(position.patchId, position.u, position.v);
    return { x: r.x + local.x * r.side, y: r.y + local.y * r.side, face: position.patchId };
  }).filter((point) => point.x >= 0 && point.y >= 0 && point.x <= size.width && point.y <= size.height);
}
export function unprojectSphere(terrain: SphericalTerrain, point: ScreenPoint, view: SphericalView, size: Viewport): Vec3 | null {
  if (!finitePoint(point) || point.x < 0 || point.y < 0 || point.x > size.width || point.y > size.height) return null;
  const l = sphericalLayout(view, size);
  if (view.mode === 'globe') {
    const x = (point.x - l.x) / l.radius, y = (l.y - point.y) / l.radius, squared = x * x + y * y;
    if(view.cutGlobe){const f=view.frame,o=f.right.map((v,i)=>v*x+f.up[i]!*y+f.forward[i]!*4) as unknown as Vec3;return traceCutGlobe(view.cutGlobe,o,f.forward.map(v=>-v) as unknown as Vec3)?.direction??null;}
    if(sphereCenterInspection(view)){const f=view.frame;return unitDirection([0,1,2].map(i=>-f.right[i]!*x+f.up[i]!*y+f.forward[i]!)as unknown as Vec3);}
    if (squared > 1 + 1e-14) return null;
    const z = Math.sqrt(Math.max(0, 1 - squared)), f = view.frame;
    return unitDirection([0, 1, 2].map((i) => f.right[i]! * x + f.up[i]! * y + f.forward[i]! * z) as unknown as Vec3);
  }
  // Stable CUBE_FACES order resolves coincident fold/corner hits deterministically.
  for (const face of CUBE_FACES) {
    const r = netFaceRect(face, view, size), s = (point.x - r.x) / r.side, t = (point.y - r.y) / r.side;
    if (s < -1e-14 || t < -1e-14 || s > 1 + 1e-14 || t > 1 + 1e-14) continue;
    const direction=terrain.geometry.direction({ ...terrain.metadata.identity, patchId: face, ...netFaceAngles(face, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, t))) });
    return view.cutGlobe&&view.mapRegion&&view.mapRegion!=='all'&&cutGlobeRegion(view.cutGlobe,direction)!==view.mapRegion?null:direction;
  }
  return null;
}
/** Readout always resolves one canonical nearest sample; display interpolation never becomes authoritative detail. */
export function inspectSphere(terrain: SphericalTerrain, direction: Vec3) {
  const position = terrain.geometry.positionsForDirection(direction)[0]!, n = terrain.metadata.representation.cellsPerEdge;
  const key = terrain.resolve({ ...position, column: Math.round((position.u / Q + 1) * n / 2), row: Math.round((position.v / Q + 1) * n / 2) });
  return { direction: unitDirection(direction), position, key, elevation: terrain.read(key) };
}
