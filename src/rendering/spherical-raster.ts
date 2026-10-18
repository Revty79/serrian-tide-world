import { CUBE_FACES, FACE_BASES, QUARTER_PI, type CubeFace } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { elevationToColor } from './elevation-colors.ts';
import { sphericalLayout, type SphericalView, type Viewport } from './spherical-view.ts';

export interface FaceTexture { readonly side: number; readonly pixels: Uint8ClampedArray }
export interface SphericalDisplayCache { readonly faces: Readonly<Record<CubeFace, FaceTexture>>; readonly sourceRevision: number; readonly byteLength: number }
/** Derived RGBA only, never another writable elevation authority. One temporary source copy is shared by all six builds. */
export function buildSphericalFaceTexture(terrain: SphericalTerrain, source: Float32Array, face: CubeFace): FaceTexture {
  if (source.length !== terrain.sampleCount) throw new RangeError('Invalid spherical display snapshot.');
  const n = terrain.metadata.representation.cellsPerEdge, resolution = Math.min(512, n * 2), side = resolution + 1;
  const indices = new Uint32Array((n + 1) ** 2), pixels = new Uint8ClampedArray(side * side * 4);
  for (let row = 0; row <= n; row++) for (let column = 0; column <= n; column++) indices[row * (n + 1) + column] = terrain.resolve({ ...terrain.metadata.identity, patchId: face, column, row }).index;
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const u = x * n / resolution, v = y * n / resolution, left = Math.min(n - 1, Math.floor(u)), top = Math.min(n - 1, Math.floor(v)), fx = u - left, fy = v - top;
    const at = (dx: number, dy: number) => source[indices[(top + dy) * (n + 1) + left + dx]!]!;
    const h = (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) + (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy;
    const color = elevationToColor(h, terrain.metadata.seaLevel), offset = (y * side + x) * 4;
    pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; pixels[offset + 3] = 255;
  }
  return { side, pixels };
}
/** Camera-space ray casting with a bounded raster, independent of numerical N after cache construction. */
export function renderSphericalGlobe(cache: SphericalDisplayCache, view: SphericalView, size: Viewport, pixelBudget = 420_000, reusable?: Uint8ClampedArray) {
  if (!Number.isSafeInteger(pixelBudget) || pixelBudget < 1 || pixelBudget > 2_000_000) throw new RangeError('Invalid spherical raster budget.');
  const l = sphericalLayout(view, size), left = Math.max(0, l.x - l.radius), top = Math.max(0, l.y - l.radius);
  const width = Math.min(size.width, l.x + l.radius) - left, height = Math.min(size.height, l.y + l.radius) - top;
  const scale = Math.min(1.5, Math.sqrt(pixelBudget / (width * height))), columns = Math.max(1, Math.floor(width * scale)), rows = Math.max(1, Math.floor(height * scale));
  const pixels = reusable?.length === columns * rows * 4 ? reusable : new Uint8ClampedArray(columns * rows * 4), f = view.frame;
  pixels.fill(0);
  for (let row = 0; row < rows; row++) {
    const y = (l.y - top - (row + .5) * height / rows) / l.radius;
    for (let column = 0; column < columns; column++) {
      const x = (left + (column + .5) * width / columns - l.x) / l.radius, squared = x * x + y * y;
      const coverage = Math.max(0, Math.min(1, (1 - Math.sqrt(squared)) * l.radius * scale + .5));
      if (coverage === 0) continue;
      const z = Math.sqrt(Math.max(0, 1 - squared));
      const a = f.right[0] * x + f.up[0] * y + f.forward[0] * z, b = f.right[1] * x + f.up[1] * y + f.forward[1] * z, c = f.right[2] * x + f.up[2] * y + f.forward[2] * z;
      const ax = Math.abs(a), ay = Math.abs(b), az = Math.abs(c);
      const face: CubeFace = ax >= ay && ax >= az ? a >= 0 ? 'px' : 'nx' : ay >= az ? b >= 0 ? 'py' : 'ny' : c >= 0 ? 'pz' : 'nz';
      const basis = FACE_BASES[face], normal = a * basis.normal[0] + b * basis.normal[1] + c * basis.normal[2];
      const u = Math.atan((a * basis.u[0] + b * basis.u[1] + c * basis.u[2]) / normal), v = Math.atan((a * basis.v[0] + b * basis.v[1] + c * basis.v[2]) / normal);
      const texture = cache.faces[face], side = texture.side, tx = Math.max(0, Math.min(side - 1, (u / QUARTER_PI + 1) * (side - 1) / 2)), ty = Math.max(0, Math.min(side - 1, (v / QUARTER_PI + 1) * (side - 1) / 2));
      const ix = Math.min(side - 2, Math.floor(tx)), iy = Math.min(side - 2, Math.floor(ty)), fx = tx - ix, fy = ty - iy, offset = (row * columns + column) * 4, source = texture.pixels, p = (iy * side + ix) * 4;
      for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = ((source[p + channel]! * (1 - fx) + source[p + 4 + channel]! * fx) * (1 - fy) + (source[p + side * 4 + channel]! * (1 - fx) + source[p + (side + 1) * 4 + channel]! * fx) * fy) * (.72 + .28 * z);
      pixels[offset + 3] = coverage * 255;
    }
  }
  return { pixels, columns, rows, left, top, width, height };
}
export function makeSphericalDisplayCache(faces: Record<CubeFace, FaceTexture>, sourceRevision: number): SphericalDisplayCache {
  return { faces, sourceRevision, byteLength: CUBE_FACES.reduce((sum, face) => sum + faces[face].pixels.byteLength, 0) };
}
