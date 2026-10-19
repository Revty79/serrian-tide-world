import { createCylindricalTerrain, type CylindricalTerrain } from '../terrain/cylindrical.ts';
import { createCylindricalHistory, type CylindricalHistory } from './cylindrical-history.ts';
import { beginCylindricalStroke } from '../terrain/cylindrical-stroke.ts';
import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import { CYLINDER_PREVIEW_DAB_LIMITS, CylinderDisplayCache, cylinderPackedColor, cylinderVisibilityGuard, prepareCylinderStencil, type CylinderStencil } from '../rendering/cylindrical-raster.ts';
import type { CylinderView } from '../rendering/cylindrical-view.ts';
import { CYLINDER_UI_SPACING_RATIO } from './cylinder-controls.ts';

export const CYLINDER_PREVIEW_RESOLUTIONS = [64, 128, 256] as const;
export function createCylinderPreviewTerrain(angularSamples: number = 128) {
  if (!(CYLINDER_PREVIEW_RESOLUTIONS as readonly number[]).includes(angularSamples)) throw new RangeError('Supported cylinder preview detail: 64, 128 or 256.');
  return createCylindricalTerrain({ terrainId: crypto.randomUUID(), geometry: { identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 1000000, lengthMeters: 1600000 }, resolution: { angularSamples, axialCells: angularSamples / 2, radialCells: angularSamples / 4 } });
}
/** Browser-independent host adapter. All numerical operations use the existing B2B2 engine/history. */
export class CylinderPreviewSession {
  readonly terrain: CylindricalTerrain;
  readonly history: CylindricalHistory;
  readonly cache: CylinderDisplayCache;
  private stroke?: ReturnType<typeof beginCylindricalStroke>;
  private preview?: ReturnType<typeof prepareCylinderStencil>;
  private previewKey = '';
  private lastStrokeRevision = 0;
  private inputTimes: { ordinal: number; at: number }[] = [];
  private presentationTimes: { revision: number; at: number }[] = [];
  stencil?: CylinderStencil;
  lastDab?: CylinderStencil;
  message = 'Blank ocean. Session-only; saving is unavailable.';
  previewMessage = '';
  changed = () => {};
  stopped = () => {};
  private disposed = false;
  readonly statistics = { strokes: 0, dabs: 0, writes: 0, failures: 0, cancellations: 0, sliceMaxMs: 0, slices: 0, previewMaxMs: 0, stagedDisplayPeakBytes: 0, droppedTimingRecords: 0, lastStroke: {} as object, lastTermination: '' };
  constructor(terrain: CylindricalTerrain) { this.terrain = terrain; this.history = createCylindricalHistory(terrain); this.cache = new CylinderDisplayCache(terrain); }
  get painting() { return !!this.stroke; }
  get processing() { return this.stroke?.status === 'draining'; }
  get modified() { return this.terrain.revision !== 0; }
  get pendingPositions() { return this.stroke?.statistics.pendingPositions ?? 0; }
  get previewPending() { return !!this.preview; }
  private clearPreview() { this.preview?.job.cancel(); this.preview = undefined; this.previewKey = ''; this.stencil = undefined; this.previewMessage = ''; }
  begin(center: SurfacePosition, settings: CylindricalBrushSettings, view: CylinderView, at = performance.now()) {
    if (this.disposed || this.stroke) return false;
    this.clearPreview(); this.lastDab = undefined;
    const real = this.history, guard = cylinderVisibilityGuard(this.terrain, view);
    // Inherit the real closure-backed history. Override only its handoff to stage
    // derived colors/visibility before the SAME numerical transaction commits.
    const tracked = Object.create(real) as CylindricalHistory;
    Object.defineProperty(tracked, 'beginOperation', { value: (expected: CylindricalTerrain) => {
      const operation = real.beginOperation(expected);
      return Object.freeze({ ...operation, commitDab: (job: Parameters<typeof operation.commitDab>[0]) => {
        const changes = [...job.preparedChanges(this.terrain)], indices = Uint32Array.from(changes, c => c.index), colors = Uint32Array.from(changes, c => cylinderPackedColor(c.after, this.terrain.metadata.seaLevel));
        guard(job.center, indices);
        const stencil = { center: job.center, indices, revision: job.sourceRevision, settings: job.settings, affectedSamples: job.statistics.affectedSamples };
        this.statistics.stagedDisplayPeakBytes = Math.max(this.statistics.stagedDisplayPeakBytes, indices.byteLength + colors.byteLength);
        const count = operation.commitDab(job);
        this.cache.apply(indices, colors, this.terrain.revision); this.lastDab = stencil; return count;
      } });
    } });
    try {
      this.stroke = beginCylindricalStroke(this.terrain, tracked, center, settings, { spacingMeters: settings.radiusMeters * CYLINDER_UI_SPACING_RATIO, dabLimits: CYLINDER_PREVIEW_DAB_LIMITS, maxDabs: 2048 });
      this.lastStrokeRevision = this.terrain.revision; this.inputTimes = [{ ordinal: 1, at }]; this.message = 'Drawing physical terrain…'; this.changed(); return true;
    } catch (e) { this.message = e instanceof Error ? e.message : String(e); this.changed(); return false; }
  }
  move(point: SurfacePosition, at = performance.now()) {
    if (!this.stroke || this.stroke.status !== 'drawing') return false;
    try { this.stroke.move(point); this.inputTimes.push({ ordinal: this.stroke.statistics.acceptedPositions, at }); this.changed(); return true; }
    catch (e) { this.fail(e); return false; }
  }
  release() { if (this.stroke) { try { this.stroke.release(); this.message = 'Finishing accepted physical input…'; this.changed(); } catch (e) { this.fail(e); } } }
  private collectTimings() {
    const processed = this.stroke?.statistics.processedPositions ?? 0;
    while (this.inputTimes[0] && this.inputTimes[0].ordinal <= processed) {
      const value = this.inputTimes.shift()!;
      if (this.presentationTimes.length >= 512) { this.presentationTimes.shift(); this.statistics.droppedTimingRecords++; }
      this.presentationTimes.push({ revision: this.terrain.revision, at: value.at });
    }
  }
  private finish() {
    if (!this.stroke) return;
    this.collectTimings(); const s = this.stroke;
    this.statistics.strokes++; this.statistics.dabs += s.statistics.committedDabs; this.statistics.writes += s.statistics.writes;
    this.statistics.lastStroke = s.statistics; this.statistics.lastTermination = s.status;
    this.stroke = undefined; this.inputTimes = []; this.changed();
  }
  private fail(error: unknown) { this.message = `Stroke stopped safely: ${error instanceof Error ? error.message : String(error)} Committed prefix remains undoable.`; this.statistics.failures++; this.stroke?.cancel(); this.finish(); this.stopped(); }
  pump(budgetMs = 3) {
    const start = performance.now(); let calls = 0;
    try {
      while (this.stroke && calls++ < 8 && performance.now() - start < budgetMs) {
        this.stroke.pump(16); this.collectTimings();
        if (this.stroke.status === 'complete') { this.message = this.terrain.revision === this.lastStrokeRevision ? 'Stroke completed with no numerical changes. Session-only.' : 'Stroke complete. Undo restores the entire gesture. Session-only; cannot save.'; this.finish(); }
        else if (!this.stroke.statistics.hasPendingWork && this.stroke.status === 'drawing') break;
      }
    } catch (e) { this.fail(e); }
    this.statistics.slices++; this.statistics.sliceMaxMs = Math.max(this.statistics.sliceMaxMs, performance.now() - start);
    return !!this.stroke && (this.stroke.statistics.hasPendingWork || this.processing);
  }
  cancel(reason = 'Drawing interrupted') {
    if (this.stroke) { this.stroke.cancel(); this.statistics.cancellations++; const dropped = this.stroke.statistics.discardedPositions; this.message = `${reason}. Pending input discarded (${dropped}); committed prefix remains one undoable operation.`; this.finish(); }
    this.clearPreview(); this.changed();
  }
  undo() {
    this.cancel('Undo interrupted drawing');
    const operation = this.history.statistics.cursor - 1;
    try { if (this.history.undo()) { this.cache.refresh([...this.history.changes(operation)].map(c => c.index)); this.message = 'Exact whole-stroke Undo. Session-only.'; } }
    catch (e) { this.message = String(e); } this.lastDab = undefined; this.changed();
  }
  redo() {
    this.cancel('Redo interrupted drawing'); const operation = this.history.statistics.cursor;
    try { if (this.history.redo()) { this.cache.refresh([...this.history.changes(operation)].map(c => c.index)); this.message = 'Exact whole-stroke Redo. Session-only.'; } }
    catch (e) { this.message = String(e); } this.lastDab = undefined; this.changed();
  }
  requestPreview(center: SurfacePosition | undefined, settings: CylindricalBrushSettings | undefined, view: CylinderView) {
    if (this.stroke || this.disposed || !center || !settings) { this.clearPreview(); return; }
    const key = JSON.stringify([center, settings, view.mode, view.frame, this.terrain.revision]);
    if (key === this.previewKey) return;
    this.clearPreview(); this.previewKey = key;
    try { this.preview = prepareCylinderStencil(this.terrain, center, settings, view); this.previewMessage = 'Calculating exact canonical footprint…'; }
    catch (e) { this.previewMessage = String(e); }
  }
  pumpPreview() {
    if (!this.preview || this.stroke) return false;
    const start = performance.now();
    try {
      this.preview.job.pump(32);
      if (this.preview.job.status === 'ready') { this.stencil = this.preview.finish(); this.preview = undefined; this.previewMessage = `${this.stencil.indices.length} canonical samples would change (${this.stencil.affectedSamples} within the intrinsic footprint).`; }
    } catch (e) { this.preview?.job.cancel(); this.preview = undefined; this.stencil = undefined; this.previewMessage = `Preview unavailable: ${e instanceof Error ? e.message : String(e)}`; }
    this.statistics.previewMaxMs = Math.max(this.statistics.previewMaxMs, performance.now() - start); return !!this.preview;
  }
  presented(revision: number, now = performance.now()) { const values: number[] = []; this.presentationTimes = this.presentationTimes.filter(p => { if (p.revision > revision) return true; values.push(now - p.at); return false; }); return values; }
  dispose() { this.cancel('Preview closed'); this.disposed = true; this.history.clear(); this.cache.dispose(); this.lastDab = undefined; this.presentationTimes = []; this.changed = () => {}; this.stopped = () => {}; }
}
