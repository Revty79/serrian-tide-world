import { createCylindricalTerrain, type CylindricalTerrain } from '../terrain/cylindrical.ts';
import { createCylindricalHistory, type CylindricalHistory } from './cylindrical-history.ts';
import { beginCylindricalStroke } from '../terrain/cylindrical-stroke.ts';
import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import { CYLINDER_PREVIEW_DAB_LIMITS, CylinderDisplayCache, cylinderPackedColor, cylinderVisibilityGuard, prepareCylinderStencil, type CylinderStencil } from '../rendering/cylindrical-raster.ts';
import type { CylinderView } from '../rendering/cylindrical-view.ts';
import { CYLINDER_UI_SPACING_RATIO } from './cylinder-controls.ts';
import { yieldPersistence } from '../persistence/cooperative-work.ts';
import { beginWorkerCylinderStroke, cylinderWorkerFactory, type CylinderWorkerFactory } from './cylinder-worker-stroke.ts';
import type { CylinderWorkOutput } from './cylinder-work-protocol.ts';
import { cylinderPreparedPatch } from './cylinder-prepared-patch.ts';
import { paintingStage, paintingMetricsEnabled } from './painting-metrics.ts';

const historyWord = new DataView(new ArrayBuffer(4));
function valueOfWord(word: number) { historyWord.setUint32(0, word, true); return historyWord.getFloat32(0, true); }

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
  private stroke?: ReturnType<typeof beginCylindricalStroke> | ReturnType<typeof beginWorkerCylinderStroke>;
  private workerFactory?: CylinderWorkerFactory;
  private baseWorkerFactory?: CylinderWorkerFactory;
  private warmWorker?: Worker;
  private remotePreview?: Worker;
  private previewTask = 0;
  private previewTimeout?: ReturnType<typeof setTimeout>;
  workDiagnostics: object = { backend: 'cooperative' };
  previewDiagnostics: object = { backend: 'cooperative' };
  /** Browser host opts in. Numerical-only consumers retain the synchronous API. */
  enableWorkers(factory = cylinderWorkerFactory) {
    if (factory === this.baseWorkerFactory) return;
    this.warmWorker?.terminate(); this.baseWorkerFactory = factory;
    const warm = () => { if (this.disposed) return; try { this.warmWorker = factory(); this.warmWorker.onerror = e => { e.preventDefault(); this.warmWorker?.terminate(); this.warmWorker = undefined; }; } catch { this.warmWorker = undefined; } };
    warm();
    this.workerFactory = () => {
      const worker = this.warmWorker ?? factory(); this.warmWorker = undefined;
      // One unused preloaded realm plus one active task, never a worker per dab.
      warm(); return worker;
    };
  }
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
  name: string;
  hasSaved: boolean;
  locked = false;
  readonly persistent: boolean;
  private checkpointName: string;
  // Exact sparse differences from the saved content; independent of history retention/cursors.
  private checkpointDifferences = new Map<number, number>();
  readonly statistics = { strokes: 0, dabs: 0, writes: 0, failures: 0, cancellations: 0, sliceMaxMs: 0, slices: 0, previewMaxMs: 0, stagedDisplayPeakBytes: 0, droppedTimingRecords: 0, lastStroke: {} as object, lastTermination: '' };
  constructor(terrain: CylindricalTerrain, name = 'Untitled cylinder', saved = false, persistent = false) { this.terrain = terrain; this.history = createCylindricalHistory(terrain); this.cache = new CylinderDisplayCache(terrain); this.name = name; this.checkpointName = name; this.hasSaved = saved; this.persistent = persistent; if (persistent) this.message = saved ? 'Cylinder reopened. Continue editing the same geography.' : 'Blank ocean. Save explicitly to this browser.'; }
  get painting() { return !!this.stroke; }
  get processing() { return this.stroke?.status === 'draining'; }
  get modified() { return this.checkpointDifferences.size > 0 || this.name !== this.checkpointName; }
  get checkpointSamples() { return this.checkpointDifferences.size; }
  markSaved(name: string) { if (this.painting) throw new Error('Finish cylinder input before marking it saved.'); this.name = name; this.checkpointName = name; this.checkpointDifferences.clear(); this.hasSaved = true; this.changed(); }
  private track(index: number, before: number, after: number) {
    const savedValue = this.checkpointDifferences.get(index) ?? before;
    if (Object.is(after, savedValue)) this.checkpointDifferences.delete(index); else this.checkpointDifferences.set(index, savedValue);
  }
  get pendingPositions() { return this.stroke?.statistics.pendingPositions ?? 0; }
  get pendingWork() { return !!this.stroke?.statistics.hasPendingWork; }
  get previewPending() { return !!this.preview || !!this.remotePreview; }
  private clearPreview() { clearTimeout(this.previewTimeout); this.remotePreview?.terminate(); this.remotePreview = undefined; this.previewTask++; this.preview?.job.cancel(); this.preview = undefined; this.previewKey = ''; this.stencil = undefined; this.previewMessage = ''; }
  begin(center: SurfacePosition, settings: CylindricalBrushSettings, view: CylinderView, at = performance.now()) {
    if (this.disposed || this.stroke || this.locked) return false;
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
        const count = paintingStage('historyAndCommit', () => operation.commitDab(job));
        for (const c of changes) this.track(c.index, c.before, c.after);
        this.cache.apply(indices, colors, this.terrain.revision); this.lastDab = stencil; return count;
      } });
    } });
    try {
      const options = { spacingMeters: settings.radiusMeters * CYLINDER_UI_SPACING_RATIO, dabLimits: CYLINDER_PREVIEW_DAB_LIMITS, maxDabs: 2048 };
      this.stroke = this.workerFactory ? beginWorkerCylinderStroke(this.terrain, tracked, center, settings, options, () => this.changed(), this.workerFactory) : beginCylindricalStroke(this.terrain, tracked, center, settings, options);
      this.workDiagnostics = 'diagnostics' in this.stroke ? this.stroke.diagnostics : { backend: 'cooperative' };
      this.lastStrokeRevision = this.terrain.revision; this.inputTimes = [{ ordinal: 1, at }]; this.message = 'Drawing physical terrain…'; this.changed(); return true;
    } catch (e) { this.message = e instanceof Error ? e.message : String(e); this.changed(); return false; }
  }
  move(point: SurfacePosition, at = performance.now()) {
    if (!this.stroke || this.stroke.status !== 'drawing' || this.locked) return false;
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
    if (this.stroke && 'diagnostics' in this.stroke && this.stroke.diagnostics.backend === 'cooperative fallback' && !this.message.includes('Background preparation unavailable')) this.message += ' Background preparation unavailable; local processing may be slower.';
    try {
      while (this.stroke && calls++ < 8 && performance.now() - start < budgetMs) {
        this.stroke.pump(16); this.collectTimings();
        if (this.stroke.status === 'failed') { this.fail(this.stroke.failure?.message ?? 'Cylinder preparation failed.'); break; }
        if (this.stroke.status === 'complete') { this.message = this.terrain.revision === this.lastStrokeRevision ? 'Stroke completed with no numerical changes.' : `Stroke complete. Undo restores the entire gesture.${this.persistent ? '' : ' Session-only; cannot save.'}`; this.finish(); }
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
    if (this.locked) return;
    this.cancel('Undo interrupted drawing');
    const operation = this.history.statistics.cursor - 1;
    try { if (this.history.undo()) { for (const c of this.history.changes(operation)) this.track(c.index, valueOfWord(c.afterWord), valueOfWord(c.beforeWord)); this.cache.refresh([...this.history.changes(operation)].map(c => c.index)); this.message = 'Exact whole-stroke Undo.'; } }
    catch (e) { this.message = String(e); } this.lastDab = undefined; this.changed();
  }
  redo() {
    if (this.locked) return;
    this.cancel('Redo interrupted drawing'); const operation = this.history.statistics.cursor;
    try { if (this.history.redo()) { for (const c of this.history.changes(operation)) this.track(c.index, valueOfWord(c.beforeWord), valueOfWord(c.afterWord)); this.cache.refresh([...this.history.changes(operation)].map(c => c.index)); this.message = 'Exact whole-stroke Redo.'; } }
    catch (e) { this.message = String(e); } this.lastDab = undefined; this.changed();
  }
  requestPreview(center: SurfacePosition | undefined, settings: CylindricalBrushSettings | undefined, view: CylinderView) {
    if (this.stroke || this.disposed || this.locked || !center || !settings) { this.clearPreview(); return; }
    const key = JSON.stringify([center, settings, view.mode, view.frame, this.terrain.revision]);
    if (key === this.previewKey) return;
    this.clearPreview(); this.previewKey = key;
    if (this.workerFactory) {
      const task = this.previewTask, revision = this.terrain.revision, started = performance.now();
      try {
        const worker = this.workerFactory(); this.remotePreview = worker; this.previewMessage = 'Calculating exact canonical footprint…';
        const finish = () => { if (this.remotePreview === worker) { clearTimeout(this.previewTimeout); this.remotePreview = undefined; } worker.terminate(); this.changed(); };
        this.previewTimeout = setTimeout(() => { if (task === this.previewTask && this.remotePreview === worker) { this.previewMessage = 'Preview unavailable: background preparation timed out. Drawing and saving remain available.'; finish(); } }, 10000);
        worker.onerror = e => { e.preventDefault(); if (task === this.previewTask) this.previewMessage = `Preview unavailable: ${e.message || 'worker startup failed'}`; finish(); };
        worker.onmessageerror = () => { if (task === this.previewTask) this.previewMessage = 'Preview unavailable: worker response could not be decoded.'; finish(); };
        worker.onmessage = (event: MessageEvent<CylinderWorkOutput>) => {
          if (this.disposed || task !== this.previewTask || worker !== this.remotePreview || this.painting) return;
          const m = event.data;
          try {
            if (m.type === 'prepared') {
              if (m.task !== task || m.sourceRevision !== revision || revision !== this.terrain.revision) throw new Error('Preview source changed.');
              cylinderPreparedPatch(this.terrain, m); cylinderVisibilityGuard(this.terrain, view)(m.center, m.indices);
              this.stencil = { center: m.center, indices: m.indices, revision, settings: m.settings, affectedSamples: m.affectedSamples };
              this.previewDiagnostics = { backend: 'worker', revision, elapsedMs: performance.now() - started, stages: m.previewStages ?? {} };
              this.previewMessage = `${m.indices.length} canonical samples would change (${m.affectedSamples} within the intrinsic footprint).`; finish();
            } else if (m.type === 'error') { this.previewMessage = `Preview unavailable: ${m.message}`; finish(); }
          } catch (e) { this.stencil = undefined; this.previewMessage = `Preview unavailable: ${String(e)}`; finish(); }
        };
        const values = paintingStage('previewSourceSnapshot', () => this.terrain.copyElevations());
        worker.postMessage({ type: 'start', task, metadata: this.terrain.metadata, revision, values, center, settings, options: {}, preview: view, measure: paintingMetricsEnabled() }, [values.buffer]);
      } catch (e) { this.remotePreview?.terminate(); this.remotePreview = undefined; this.previewMessage = `Preview unavailable: ${String(e)}`; }
      return;
    }
    try { this.preview = prepareCylinderStencil(this.terrain, center, settings, view); this.previewMessage = 'Calculating exact canonical footprint…'; }
    catch (e) { this.previewMessage = String(e); }
  }
  pumpPreview() {
    if (this.remotePreview) return true;
    if (!this.preview || this.stroke) return false;
    const start = performance.now();
    try {
      paintingStage('footprintPreparation', () => this.preview!.job.pump(32));
      if (this.preview.job.status === 'ready') { this.stencil = this.preview.finish(); this.preview = undefined; this.previewMessage = `${this.stencil.indices.length} canonical samples would change (${this.stencil.affectedSamples} within the intrinsic footprint).`; }
    } catch (e) { this.preview?.job.cancel(); this.preview = undefined; this.stencil = undefined; this.previewMessage = `Preview unavailable: ${e instanceof Error ? e.message : String(e)}`; }
    this.statistics.previewMaxMs = Math.max(this.statistics.previewMaxMs, performance.now() - start); return !!this.preview;
  }
  presented(revision: number, now = performance.now()) { const values: number[] = []; this.presentationTimes = this.presentationTimes.filter(p => { if (p.revision > revision) return true; values.push(now - p.at); return false; }); return values; }
  async drainForSave(yieldWork = yieldPersistence) {
    const failures = this.statistics.failures; this.release();
    while (this.painting) {
      this.pump(3);
      if (this.stroke && 'waitForProgress' in this.stroke) await this.stroke.waitForProgress();
      await yieldWork();
    }
    if (this.statistics.failures !== failures) throw new Error('Queued cylinder input failed. Applied edits are retained; inspect them before retrying Save.');
  }
  dispose() { this.cancel('Cylinder closed'); this.disposed = true; this.warmWorker?.terminate(); this.warmWorker = undefined; this.history.clear(); this.cache.dispose(); this.lastDab = undefined; this.presentationTimes = []; this.checkpointDifferences.clear(); this.changed = () => {}; this.stopped = () => {}; }
}
