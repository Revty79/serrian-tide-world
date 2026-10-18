import { CUBE_FACES, type CubeFace } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { netFaceAngles, netFaceRect, type ScreenPoint, type SphericalView, type Viewport } from './spherical-view.ts';
/** The complete displayed segment must remain in a chain of physically joined net tiles.
 * Sampling endpoints alone is unsafe: a sparse jump can cross an empty tile or a visual cut.
 */
export function continuousNetSegment(terrain: SphericalTerrain, a: ScreenPoint, b: ScreenPoint, view: SphericalView, size: Viewport): boolean {
  const parameters = [0, 1];
  for (const face of CUBE_FACES) {
    const r = netFaceRect(face, view, size);
    if (a.x !== b.x) for (const x of [r.x, r.x + r.side]) { const t = (x - a.x) / (b.x - a.x); if (t > 0 && t < 1) parameters.push(t); }
    if (a.y !== b.y) for (const y of [r.y, r.y + r.side]) { const t = (y - a.y) / (b.y - a.y); if (t > 0 && t < 1) parameters.push(t); }
  }
  parameters.sort((x, y) => x - y);
  let previous: CubeFace | undefined;
  for (let i = 1; i < parameters.length; i++) {
    if (parameters[i]! - parameters[i - 1]! < 1e-12) continue;
    const t = (parameters[i]! + parameters[i - 1]!) / 2, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    const face = CUBE_FACES.find((face) => { const r = netFaceRect(face, view, size); return x >= r.x - 1e-9 && x <= r.x + r.side + 1e-9 && y >= r.y - 1e-9 && y <= r.y + r.side + 1e-9; });
    if (!face) return false;
    if (previous && face !== previous) {
      // Any touching tiles in this verified net share a fold; diagonal corner jumps are terminated.
      const p = netFaceRect(previous, view, size), q = netFaceRect(face, view, size);
      if (Math.abs(Math.abs(p.x - q.x) + Math.abs(p.y - q.y) - p.side) > 1e-7) return false;
      const hit = { x: a.x + (b.x - a.x) * parameters[i - 1]!, y: a.y + (b.y - a.y) * parameters[i - 1]! };
      // Verify actual physical connection, not just grid proximity.
      const directions = [previous, face].map((f) => { const r = netFaceRect(f, view, size); return terrain.geometry.direction({ ...terrain.metadata.identity, patchId: f, ...netFaceAngles(f, Math.max(0, Math.min(1, (hit.x - r.x) / r.side)), Math.max(0, Math.min(1, (hit.y - r.y) / r.side))) }); });
      if (Math.hypot(...directions[0]!.map((v, i) => v - directions[1]![i]!)) > 1e-9) return false;
    }
    previous = face;
  }
  return previous !== undefined;
}
