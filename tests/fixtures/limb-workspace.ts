// Test-only observer/oracle for the actual unified workspace; no DOM root or product mutation.
import { raw } from './sphere-storage.ts';
import { decodeSphericalHeightmap } from '../../src/persistence/spherical-format.ts';
import { createSphericalTerrain } from '../../src/terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings, type SphericalBrushVisibility } from '../../src/terrain/spherical-brush.ts';
import { unprojectSphere, type SphericalView } from '../../src/rendering/spherical-view.ts';
import { dot3, type Vec3 } from '../../src/surfaces/cube-sphere.ts';
type Segment = { direction: Vec3; visibility: SphericalBrushVisibility; serial?: number; at: number };
let first: Segment, segments: Segment[] = [], gaps: number[] = [], running = false, previous = 0, started = 0;
let dispose = () => {};
const canvas = () => document.querySelector<HTMLCanvasElement>('canvas')!;
function view(): SphericalView { const c = canvas(); return { mode: c.dataset.mode as 'globe' | 'net', frame: JSON.parse(c.dataset.frame!), zoom: Number(c.dataset.zoom), pan: JSON.parse(c.dataset.pan!) }; }
const blank = () => createSphericalTerrain({ terrainId: 'reference', identity: { worldId: 'oracle', surfaceId: 'sphere' }, radiusMeters: Number(canvas().dataset.radius), cellsPerEdge: Number(canvas().dataset.resolution) });
export function observe() {
  dispose(); segments = []; gaps = []; running = true; previous = started = performance.now();
  const c = canvas(), geometry = blank(); let down = false;
  const physical = (e: PointerEvent): Segment => { const r = c.getBoundingClientRect(), v = view(); return { direction: unprojectSphere(geometry, { x: e.clientX - r.left, y: e.clientY - r.top }, v, { width: r.width, height: r.height })!, visibility: { hemisphere: v.frame.forward }, at: performance.now() }; };
  const start = (e: PointerEvent) => { if (down) return; down = true; first = physical(e); };
  const move = (e: PointerEvent) => { if (down) segments.push(physical(e)); };
  const up = (e: PointerEvent) => { if (down) segments.push(physical(e)); down = false; };
  c.addEventListener('pointerdown', start, true); c.addEventListener('pointermove', move, true); c.addEventListener('pointerup', up, true);
  const observer = new MutationObserver((records) => { for (const r of records) if (r.attributeName === 'data-limb-step') { const step = JSON.parse(c.dataset.limbStep!); if (segments.length >= 2000) throw new Error('Test trace bound exceeded'); segments.push(step); } });
  observer.observe(c, { attributes: true, attributeFilter: ['data-limb-step'] });
  const beat = (now: number) => { if (!running) return; gaps.push(now - previous); previous = now; requestAnimationFrame(beat); }; requestAnimationFrame(beat);
  dispose = () => { running = false; observer.disconnect(); c.removeEventListener('pointerdown', start, true); c.removeEventListener('pointermove', move, true); c.removeEventListener('pointerup', up, true); };
}
export function finish() { dispose(); return { first, segments, frameGapsMs: gaps, wallMs: performance.now() - started }; }
export function measurements() { return { frameGapsMs: [...gaps], wallMs: performance.now() - started }; }
export async function compare(id: string, settings: SphericalBrushSettings) {
  const record = await raw(id), { terrain: actual } = await decodeSphericalHeightmap(record), reference = blank();
  const stroke = startSphericalBrushStroke(reference, { ...reference.metadata.identity, direction: first.direction }, settings, undefined, first.visibility);
  for (const s of segments) stroke.moveTo({ ...reference.metadata.identity, direction: s.direction }, s.visibility);
  stroke.end();
  const a = new Uint32Array(actual.copyElevations().buffer), b = new Uint32Array(reference.copyElevations().buffer), last = view().frame.forward;
  let mismatches = 0, changed = 0, hidden = 0, newlyExposed = 0; const changedFaces = new Set<string>();
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) mismatches++;
    if (actual.read(actual.keyAt(i)) !== -100) { changed++; const d = actual.directionAt(actual.keyAt(i)); for (const a of actual.aliases(actual.keyAt(i))) changedFaces.add(a.patchId); if (dot3(d, last) < 0) hidden++; if (dot3(d, first.visibility.hemisphere) < 0) newlyExposed++; }
  }
  const steps = segments.filter((s) => s.serial !== undefined);
  return { mismatches, changed, hidden, newlyExposed, changedFaces: [...changedFaces].sort(), dabs: stroke.statistics.dabs, stepCount: steps.length, serials: steps.map((s) => s.serial), sampleCount: actual.sampleCount };
}
let responseBase: Float32Array | undefined;
export async function baseline(id: string) { responseBase = (await decodeSphericalHeightmap(await raw(id))).terrain.copyElevations(); }
export async function sampleResponse(id: string, settings: SphericalBrushSettings, direction: Vec3) {
  const { terrain: actual } = await decodeSphericalHeightmap(await raw(id)), expected = blank(), v = view();
  if (responseBase) for (let i = 0; i < responseBase.length; i++) expected.write(expected.keyAt(i), responseBase[i]!);
  startSphericalBrushStroke(expected, { ...expected.metadata.identity, direction }, settings, undefined, v.mode === 'globe' ? { hemisphere: v.frame.forward } : undefined).end();
  const a = new Uint32Array(actual.copyElevations().buffer), b = new Uint32Array(expected.copyElevations().buffer);
  let changed = 0, max = -Infinity;
  for (let i = 0; i < a.length; i++) { const value = actual.read(actual.keyAt(i)); if (value !== (responseBase?.[i] ?? -100)) changed++; max = Math.max(max, value); }
  return { exact: a.every((word, i) => word === b[i]), max, changed };
}
