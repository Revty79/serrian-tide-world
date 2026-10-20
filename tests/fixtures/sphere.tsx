// Test-only inspection/performance host. No globals or inspection hooks enter the product bundle.
import { createRoot } from 'react-dom/client';
import { SphericalViewport } from '../../src/components/SphericalViewport.tsx';
import { createSphericalTerrain } from '../../src/terrain/spherical.ts';
import { fillSphericalPreviewRange } from '../../src/terrain/spherical-preview-fixture.ts';
import { CUBE_FACES, type CubeFace, type Vec3 } from '../../src/surfaces/cube-sphere.ts';
import { buildSphericalFaceTexture, makeSphericalDisplayCache, type FaceTexture } from '../../src/rendering/spherical-raster.ts';
import { INITIAL_SPHERICAL_VIEW, inspectSphere, projectSphere, unprojectSphere, netFaceRect, type SphericalView } from '../../src/rendering/spherical-view.ts';
import '../../src/styles.css';
const n = Number(new URL(location.href).searchParams.get('n') || 128);
const start = performance.now();
const authority = createSphericalTerrain({ terrainId: 'fixture', identity: { worldId: 'test-world', surfaceId: 'test-surface' }, radiusMeters: 1234567, cellsPerEdge: n });
fillSphericalPreviewRange(authority, 0, authority.sampleCount);
const metadata = authority.metadata, original = new Uint32Array(authority.copyElevations().buffer), revision = authority.revision;
const source = authority.copyElevations(), faces = Object.fromEntries(CUBE_FACES.map((face) => [face, buildSphericalFaceTexture(authority, source, face)])) as Record<CubeFace, FaceTexture>;
const cache = makeSphericalDisplayCache(faces, revision), preparedMs = performance.now() - start;
let reads = 0, copies = 0;
const terrain = { ...authority, get revision() { return authority.revision; }, read: (key: Parameters<typeof authority.read>[0]) => { reads++; return authority.read(key); }, copyElevations: () => { copies++; return authority.copyElevations(); } };
function view(): SphericalView {
  const canvas = document.querySelector<HTMLCanvasElement>('[aria-label="Spherical terrain preview"]')!;
  return { ...INITIAL_SPHERICAL_VIEW, mode: canvas.dataset.mode as SphericalView['mode'], zoom: Number(canvas.dataset.zoom), frame: JSON.parse(canvas.dataset.frame!), pan: JSON.parse(canvas.dataset.pan!) };
}
export function project(direction: Vec3) { return projectSphere(authority, direction, view(), { width: innerWidth, height: innerHeight }); }
export function expected(direction: Vec3) { return inspectSphere(authority, direction); }
export function clickTarget(direction: Vec3, face: CubeFace) {
  const state = view(), size = { width: innerWidth, height: innerHeight }, point = projectSphere(authority, direction, state, size).find((p) => p.face === face)!;
  const rect = netFaceRect(face, state, size);
  // Native pointer coordinates are CSS pixels. On small nets a sample can be smaller than a pixel;
  // inspect the actual clicked location, nudged inside its face at a cut to avoid rounding into a gap.
  const x = Math.round(Math.max(rect.x + 1, Math.min(rect.x + rect.side - 1, point.x))), y = Math.round(Math.max(rect.y + 1, Math.min(rect.y + rect.side - 1, point.y)));
  return { x, y, sample: inspectSphere(authority, unprojectSphere(authority, { x, y }, state, size)!) };
}
export function statistics() {
  const current = new Uint32Array(authority.copyElevations().buffer);
  return { exactBitsUnchanged: current.every((value, i) => value === original[i]), metadataSame: metadata === authority.metadata, revision, currentRevision: authority.revision, samples: authority.sampleCount, authorityBytes: authority.elevationByteLength, cacheBytes: cache.byteLength, fieldBytes: cache.elevationField?.byteLength ?? 0, copies, reads, preparedMs };
}
createRoot(document.getElementById('root')!).render(<main className="atlas-app"><SphericalViewport terrain={terrain} cache={cache} preparationMs={preparedMs} onClose={() => {}} /></main>);
