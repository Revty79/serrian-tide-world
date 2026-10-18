// Test-only numerical oracle and instrumentation. Never imported by the application.
import { createRoot } from 'react-dom/client';
import { SphericalViewport } from '../../src/components/SphericalViewport.tsx';
import { createSphericalTerrain } from '../../src/terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings } from '../../src/terrain/spherical-brush.ts';
import { SphericalSession } from '../../src/editor/spherical-session.ts';
import { CUBE_FACES, FACE_BASES, FACE_CONNECTIONS, dot3, unitDirection, type CubeFace, type Vec3 } from '../../src/surfaces/cube-sphere.ts';
import { buildSphericalFaceTexture, makeSphericalDisplayCache, type FaceTexture } from '../../src/rendering/spherical-raster.ts';
import { INITIAL_SPHERICAL_VIEW, inspectSphere, projectSphere, unprojectSphere, netFaceRect, type SphericalView } from '../../src/rendering/spherical-view.ts';
import '../../src/styles.css';
const n = Number(new URL(location.href).searchParams.get('n') || 128), radiusMeters = 1000000;
const identity = { worldId: 'browser-editor', surfaceId: 'sphere' };
const authority = createSphericalTerrain({ terrainId: 'browser-editor', identity, radiusMeters, cellsPerEdge: n });
const source = authority.copyElevations(), faces = Object.fromEntries(CUBE_FACES.map((f) => [f, buildSphericalFaceTexture(authority, source, f, true)])) as Record<CubeFace, FaceTexture>;
const cache = makeSphericalDisplayCache(faces, authority.revision);
let copies = 0, reads = 0;
const provider = { ...authority, get revision() { return authority.revision; }, read: (key: Parameters<typeof authority.read>[0]) => { reads++; return authority.read(key); }, copyElevations: () => { copies++; return authority.copyElevations(); } };
const editor = new SphericalSession(provider, cache);
type Operation = { center: Vec3; settings: SphericalBrushSettings; hemisphere?: Vec3; points: Vec3[] };
let original: Float32Array, operations: Operation[] = [], current: Operation | undefined, recording = false;
const begin = editor.begin.bind(editor), move = editor.move.bind(editor), release = editor.release.bind(editor), cancel = editor.cancel.bind(editor);
editor.begin = (d, s, h) => { const result = begin(d, s, h); if (recording && result) { current = { center: d, settings: s, hemisphere: h, points: [] }; operations.push(current); } return result; };
editor.move = (d) => { if (recording && editor.painting && !editor.processing) current?.points.push(d); move(d); };
editor.release = () => { release(); current = undefined; };
editor.cancel = () => { cancel(); current = undefined; };
export function startRecording() { original = authority.copyElevations(); operations = []; current = undefined; recording = true; }
export function compareRecording() {
  recording = false;
  const reference = createSphericalTerrain({ terrainId: 'browser-editor', identity, radiusMeters, cellsPerEdge: n });
  for (let i = 0; i < original.length; i++) reference.write(reference.keyAt(i), original[i]!);
  for (const op of operations) {
    const stroke = startSphericalBrushStroke(reference, { ...identity, direction: op.center }, op.settings, undefined, op.hemisphere ? { hemisphere: op.hemisphere } : undefined);
    for (const direction of op.points) stroke.moveTo({ ...identity, direction }); stroke.end();
  }
  const expected = new Uint32Array(reference.copyElevations().buffer), actual = new Uint32Array(authority.copyElevations().buffer);
  return { operations: operations.length, points: operations.reduce((sum, op) => sum + op.points.length, 0), exact: actual.every((v, i) => v === expected[i]), tools: operations.map((op) => op.settings.tool) };
}
export function view(): SphericalView {
  const el = document.querySelector<HTMLCanvasElement>('[aria-label="Spherical terrain preview"]')!;
  return { ...INITIAL_SPHERICAL_VIEW, mode: el.dataset.mode as SphericalView['mode'], zoom: Number(el.dataset.zoom), frame: JSON.parse(el.dataset.frame!), pan: JSON.parse(el.dataset.pan!) };
}
export function project(d: Vec3) { return projectSphere(authority, d, view(), { width: innerWidth, height: innerHeight }); }
export function rect(f: CubeFace) { return netFaceRect(f, view(), { width: innerWidth, height: innerHeight }); }
export function at(x: number, y: number) { const d = unprojectSphere(authority, { x, y }, view(), { width: innerWidth, height: innerHeight }); return d && inspectSphere(authority, d); }
export async function digest() { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', authority.copyElevations().buffer as ArrayBuffer))].map((v) => v.toString(16).padStart(2, '0')).join(''); }
export function statistics() {
  const values = authority.copyElevations();
  return { revision: authority.revision, cacheRevision: cache.sourceRevision, copies, reads, samples: authority.sampleCount, authorityBytes: authority.elevationByteLength, cacheBytes: cache.byteLength, historyBytes: editor.history.retainedBytes, pendingBytes: editor.history.pendingBytes, historyEntries: editor.history.length, modified: editor.modified, pendingPoints: editor.pendingPoints, backlogged: editor.backlogged, min: values.reduce((a, b) => Math.min(a, b)), max: values.reduce((a, b) => Math.max(a, b)), changedSamples: values.reduce((count, v) => count + (v !== -100 ? 1 : 0), 0), ...editor.statistics };
}
export function boundaryLocations(): Vec3[] {
  const points: Vec3[] = [];
  for (const c of FACE_CONNECTIONS) if (CUBE_FACES.indexOf(c.face) < CUBE_FACES.indexOf(c.toFace)) points.push(unitDirection(FACE_BASES[c.face].normal.map((v, i) => v + FACE_BASES[c.toFace].normal[i]!) as unknown as Vec3));
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) points.push(unitDirection([x, y, z]));
  points.push([0, 0, 1], [0, 0, -1], unitDirection([1e-6, 0, 1]), unitDirection([1e-6, 0, -1])); return points;
}
export function changesBehind(forward: Vec3) { let count = 0; for (const k of authority.samples()) if (dot3(authority.directionAt(k), forward) < 0 && authority.read(k) !== -100) count++; return count; }
createRoot(document.getElementById('root')!).render(<main className="atlas-app"><SphericalViewport terrain={provider} cache={cache} editor={editor} onClose={() => {}} /></main>);
