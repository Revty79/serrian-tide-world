import { CUBE_FACES, QUARTER_PI, type CubeFace } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { elevationToColor } from './elevation-colors.ts';
import { sphericalLayout, type SphericalView, type Viewport } from './spherical-view.ts';

export interface FaceTexture { readonly side: number; readonly pixels: Uint8ClampedArray; readonly sampleIndices?: Uint32Array }
export interface SphericalDisplayCache { readonly faces: Readonly<Record<CubeFace, FaceTexture>>; sourceRevision: number; readonly byteLength: number }
// Camera-local rays depend only on viewport/layout/quality, never terrain or orientation.
// Two entries cover editing/navigation and settled quality. Absolute module-wide cap;
// no per-world accumulation, elevation copies or background construction.
const MAX_RAY_CACHE_BYTES = 8 * 1024 * 1024;
interface RayGrid { key: string; x: Float64Array; y: Float64Array; z: Float64Array; alpha: Uint8ClampedArray; bytes: number }
const rayGrids: RayGrid[] = [];
export function sphericalRasterCacheBytes() { return rayGrids.reduce((n, grid) => n + grid.bytes, 0); }
function rayGrid(key: string, columns: number, rows: number, left: number, top: number, width: number, height: number, l: ReturnType<typeof sphericalLayout>, scale: number) {
  const found = rayGrids.findIndex((g) => g.key === key);
  if (found >= 0) { const grid = rayGrids.splice(found, 1)[0]!; rayGrids.push(grid); return grid; }
  const bytes = (columns + rows) * 8 + columns * rows * 9;
  if (bytes > MAX_RAY_CACHE_BYTES) return;
  while (rayGrids.length && (rayGrids.length >= 2 || sphericalRasterCacheBytes() + bytes > MAX_RAY_CACHE_BYTES)) rayGrids.shift();
  const grid: RayGrid = { key, x: new Float64Array(columns), y: new Float64Array(rows), z: new Float64Array(columns * rows), alpha: new Uint8ClampedArray(columns * rows), bytes };
  grid.z.fill(NaN);
  for (let column = 0; column < columns; column++) grid.x[column] = (left + (column + .5) * width / columns - l.x) / l.radius;
  for (let row = 0; row < rows; row++) {
    const y = grid.y[row] = (l.y - top - (row + .5) * height / rows) / l.radius;
    for (let column = 0; column < columns; column++) {
      const x = grid.x[column]!, squared = x * x + y * y;
      const coverage = Math.max(0, Math.min(1, (1 - Math.sqrt(squared)) * l.radius * scale + .5));
      if (coverage === 0) continue;
      const i = row * columns + column; grid.z[i] = Math.sqrt(Math.max(0, 1 - squared)); grid.alpha[i] = coverage * 255;
    }
  }
  rayGrids.push(grid); return grid;
}
/** Derived RGBA only, never another writable elevation authority. One temporary source copy is shared by all six builds. */
export function buildSphericalFaceTexture(terrain: SphericalTerrain, source: Float32Array, face: CubeFace, retainIndices = false): FaceTexture {
  const steps = sphericalFaceTextureSteps(terrain, source, face, retainIndices);
  let result = steps.next(); while (!result.done) result = steps.next(); return result.value;
}
/** Identical synchronous arithmetic, with optional cooperative checkpoints for loading. */
export function* sphericalFaceTextureSteps(terrain: SphericalTerrain, source: Float32Array, face: CubeFace, retainIndices = false): Generator<void, FaceTexture> {
  if (source.length !== terrain.sampleCount) throw new RangeError('Invalid spherical display snapshot.');
  const n = terrain.metadata.representation.cellsPerEdge, resolution = Math.min(512, n * 2), side = resolution + 1;
  const indices = new Uint32Array((n + 1) ** 2), pixels = new Uint8ClampedArray(side * side * 4);
  for (let row = 0; row <= n; row++) for (let column = 0; column <= n; column++) {
    const index = row * (n + 1) + column; indices[index] = terrain.resolve({ ...terrain.metadata.identity, patchId: face, column, row }).index;
    if (index % 2048 === 2047) yield;
  }
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const u = x * n / resolution, v = y * n / resolution, left = Math.min(n - 1, Math.floor(u)), top = Math.min(n - 1, Math.floor(v)), fx = u - left, fy = v - top;
    const at = (dx: number, dy: number) => source[indices[(top + dy) * (n + 1) + left + dx]!]!;
    const h = (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) + (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy;
    const color = elevationToColor(h, terrain.metadata.seaLevel), offset = (y * side + x) * 4;
    pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; pixels[offset + 3] = 255;
    if (x === side - 1 && y % 8 === 7) yield;
  }
  return { side, pixels, ...(retainIndices ? { sampleIndices: indices } : {}) };
}
/** Camera-space ray casting with a bounded raster, independent of numerical N after cache construction. */
export function renderSphericalGlobe(cache: SphericalDisplayCache, view: SphericalView, size: Viewport, pixelBudget = 420_000, reusable?: Uint8ClampedArray) {
  if (!Number.isSafeInteger(pixelBudget) || pixelBudget < 1 || pixelBudget > 2_000_000) throw new RangeError('Invalid spherical raster budget.');
  const l = sphericalLayout(view, size), left = Math.max(0, l.x - l.radius), top = Math.max(0, l.y - l.radius);
  const width = Math.min(size.width, l.x + l.radius) - left, height = Math.min(size.height, l.y + l.radius) - top;
  const scale = Math.min(1.5, Math.sqrt(pixelBudget / (width * height))), columns = Math.max(1, Math.floor(width * scale)), rows = Math.max(1, Math.floor(height * scale));
  const pixels = reusable?.length === columns * rows * 4 ? reusable : new Uint8ClampedArray(columns * rows * 4), f = view.frame;
  const rays = rayGrid([columns, rows, left, top, width, height, l.x, l.y, l.radius, scale].join(','), columns, rows, left, top, width, height, l, scale);
  pixels.fill(0);
  for (let row = 0; row < rows; row++) {
    const y = rays ? rays.y[row]! : (l.y - top - (row + .5) * height / rows) / l.radius;
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column, x = rays ? rays.x[column]! : (left + (column + .5) * width / columns - l.x) / l.radius;
      let z: number, alpha: number;
      if (rays) { z = rays.z[index]!; if (Number.isNaN(z)) continue; alpha = rays.alpha[index]!; }
      else { const squared = x * x + y * y, coverage = Math.max(0, Math.min(1, (1 - Math.sqrt(squared)) * l.radius * scale + .5)); if (coverage === 0) continue; z = Math.sqrt(Math.max(0, 1 - squared)); alpha = coverage * 255; }
      const a = f.right[0] * x + f.up[0] * y + f.forward[0] * z, b = f.right[1] * x + f.up[1] * y + f.forward[1] * z, c = f.right[2] * x + f.up[2] * y + f.forward[2] * z;
      const ax = Math.abs(a), ay = Math.abs(b), az = Math.abs(c);
      // The fixed face bases are signed axis permutations. Retain atan and all
      // interpolation arithmetic; eliminate per-ray object/basis dot products.
      let face: CubeFace, normal: number, du: number, dv: number;
      if (ax >= ay && ax >= az) { if (a >= 0) { face = 'px'; normal = a; du = b; } else { face = 'nx'; normal = -a; du = -b; } dv = c; }
      else if (ay >= az) { if (b >= 0) { face = 'py'; normal = b; du = -a; } else { face = 'ny'; normal = -b; du = a; } dv = c; }
      else if (c >= 0) { face = 'pz'; normal = c; du = a; dv = b; }
      else { face = 'nz'; normal = -c; du = a; dv = -b; }
      const u = Math.atan(du / normal), v = Math.atan(dv / normal);
      const texture = cache.faces[face], side = texture.side, tx = Math.max(0, Math.min(side - 1, (u / QUARTER_PI + 1) * (side - 1) / 2)), ty = Math.max(0, Math.min(side - 1, (v / QUARTER_PI + 1) * (side - 1) / 2));
      const ix = Math.min(side - 2, Math.floor(tx)), iy = Math.min(side - 2, Math.floor(ty)), fx = tx - ix, fy = ty - iy, offset = (row * columns + column) * 4, source = texture.pixels, p = (iy * side + ix) * 4;
      const inverseX = 1 - fx, inverseY = 1 - fy, shade = .72 + .28 * z;
      for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = ((source[p + channel]! * inverseX + source[p + 4 + channel]! * fx) * inverseY + (source[p + side * 4 + channel]! * inverseX + source[p + (side + 1) * 4 + channel]! * fx) * fy) * shade;
      pixels[offset + 3] = alpha;
    }
  }
  return { pixels, columns, rows, left, top, width, height };
}
export function makeSphericalDisplayCache(faces: Record<CubeFace, FaceTexture>, sourceRevision: number): SphericalDisplayCache {
  return { faces, sourceRevision, byteLength: CUBE_FACES.reduce((sum, face) => sum + faces[face].pixels.byteLength + (faces[face].sampleIndices?.byteLength ?? 0), 0) };
}
