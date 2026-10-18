import { CUBE_FACES, FACE_BASES, FACE_CONNECTIONS, FACE_EDGES, QUARTER_PI, cross3, dot3, unitDirection, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import { greatCircleArc } from '../surfaces/great-circle.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { netEdgeIsJoined, netFaceCoordinates, netFaceRect, sphericalLayout, type ScreenPoint, type SphericalView, type Viewport } from './spherical-view.ts';

const TAU = Math.PI * 2;
/** Roots of a+b cos(t)+c sin(t)=0, in one full turn. */
function roots(a: number, b: number, c: number): number[] {
  const length = Math.hypot(b, c); if (length === 0 || Math.abs(a) > length + 1e-14) return [];
  const phase = Math.atan2(c, b), offset = Math.acos(Math.max(-1, Math.min(1, -a / length)));
  return [phase - offset, phase + offset].map((t) => (t % TAU + TAU) % TAU);
}
function partitions(values: number[], end = TAU) {
  return [0, ...values.filter((v) => v > 1e-12 && v < end - 1e-12), end].sort((a, b) => a - b).filter((v, i, a) => i === 0 || Math.abs(v - a[i - 1]!) > 1e-12);
}
export interface BrushPreviewSegment { readonly points: readonly ScreenPoint[]; readonly directions: readonly Vec3[]; readonly kind: 'cap' | 'clip' }
export function sphericalBrushContains(center: Vec3, direction: Vec3, angularRadius: number, hemisphere?: Vec3) {
  return dot3(unitDirection(center), unitDirection(direction)) > Math.cos(angularRadius) && (!hemisphere || dot3(hemisphere, direction) >= 0);
}
/** Analytic small-circle/chart/horizon intersections. Only the final display polyline is sampled. */
export function sphericalBrushPreview(terrain: SphericalTerrain, centerInput: Vec3, radiusMeters: number, view: SphericalView, size: Viewport): BrushPreviewSegment[] {
  const center = unitDirection(centerInput), alpha = radiusMeters / terrain.metadata.geometry.radiusMeters;
  if (!(alpha > 0 && alpha <= Math.PI)) return [];
  const normal = Math.abs(center[2]) < .9 ? [0, 0, 1] as Vec3 : [0, 1, 0] as Vec3;
  const a = unitDirection(cross3(normal, center)), b = cross3(center, a), cosine = Math.cos(alpha), sine = Math.sin(alpha);
  const curve = (t: number): Vec3 => unitDirection([0, 1, 2].map((i) => center[i]! * cosine + (a[i]! * Math.cos(t) + b[i]! * Math.sin(t)) * sine) as unknown as Vec3);
  const l = sphericalLayout(view, size), segments: BrushPreviewSegment[] = [];
  const project = (direction: Vec3, face?: CubeFace): ScreenPoint => {
    if (view.mode === 'globe') return { x: l.x + l.radius * dot3(direction, view.frame.right), y: l.y - l.radius * dot3(direction, view.frame.up) };
    const frame = FACE_BASES[face!], n = dot3(direction, frame.normal), local = netFaceCoordinates(face!, Math.atan2(dot3(direction, frame.u), n), Math.atan2(dot3(direction, frame.v), n)), r = netFaceRect(face!, view, size);
    return { x: r.x + local.x * r.side, y: r.y + local.y * r.side };
  };
  const emit = (from: number, to: number, fn: (t: number) => Vec3, kind: 'cap' | 'clip', face?: CubeFace) => {
    const count = Math.max(1, Math.ceil((to - from) / (TAU / 128)));
    const directions = Array.from({ length: count + 1 }, (_, i) => fn(from + (to - from) * i / count));
    segments.push({ directions, points: directions.map((d) => project(d, face)), kind });
  };
  const planes: Vec3[] = view.mode === 'globe' ? [view.frame.forward] : FACE_CONNECTIONS.filter((edge) => CUBE_FACES.indexOf(edge.face) < CUBE_FACES.indexOf(edge.toFace)).map((edge) => FACE_BASES[edge.face].normal.map((v, i) => v - FACE_BASES[edge.toFace].normal[i]!) as unknown as Vec3);
  const cuts = partitions(planes.flatMap((plane) => roots(dot3(center, plane) * cosine, dot3(a, plane) * sine, dot3(b, plane) * sine)));
  for (let i = 1; i < cuts.length; i++) {
    const from = cuts[i - 1]!, to = cuts[i]!, middle = curve((from + to) / 2);
    if (view.mode === 'globe' && dot3(middle, view.frame.forward) < 0) continue;
    emit(from, to, curve, 'cap', view.mode === 'net' ? terrain.geometry.positionsForDirection(middle)[0]!.patchId : undefined);
  }
  if (view.mode === 'globe') {
    const horizon = (t: number): Vec3 => view.frame.right.map((v, i) => v * Math.cos(t) + view.frame.up[i]! * Math.sin(t)) as unknown as Vec3;
    const cuts = partitions(roots(-cosine, dot3(center, view.frame.right), dot3(center, view.frame.up)));
    for (let i = 1; i < cuts.length; i++) if (dot3(center, horizon((cuts[i - 1]! + cuts[i]!) / 2)) >= cosine) emit(cuts[i - 1]!, cuts[i]!, horizon, 'clip');
  } else for (const face of CUBE_FACES) for (const edge of FACE_EDGES) {
    if (netEdgeIsJoined(terrain, face, edge)) continue;
    const endpoints = [-QUARTER_PI, QUARTER_PI].map((along) => terrain.geometry.direction({ ...terrain.metadata.identity, patchId: face, u: edge.startsWith('u') ? (edge.endsWith('min') ? -1 : 1) * QUARTER_PI : along, v: edge.startsWith('v') ? (edge.endsWith('min') ? -1 : 1) * QUARTER_PI : along }));
    const arc = greatCircleArc(endpoints[0]!, endpoints[1]!), tangent = unitDirection(cross3(cross3(endpoints[0]!, endpoints[1]!), endpoints[0]!));
    const splits = partitions(roots(-cosine, dot3(center, endpoints[0]!), dot3(center, tangent)), arc.angle);
    for (let i = 1; i < splits.length; i++) if (dot3(center, arc.at((splits[i - 1]! + splits[i]!) / (2 * arc.angle))) >= cosine) emit(splits[i - 1]!, splits[i]!, (t) => arc.at(t / arc.angle), 'clip', face);
  }
  return segments;
}
