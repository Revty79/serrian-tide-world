import { SphericalHistory } from './spherical-history.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings, type SphericalBrushVisibility } from '../terrain/spherical-brush.ts';
import type { Vec3 } from '../surfaces/cube-sphere.ts';
import { updateSphericalTextures } from '../rendering/spherical-texture-updates.ts';
import type { SphericalDisplayCache } from '../rendering/spherical-raster.ts';
import { yieldPersistence } from '../persistence/cooperative-work.ts';
import { SphericalElevationField } from '../rendering/spherical-elevation.ts';
import { beginSphereWorkerStroke, sphereWorkerFactory, type SphereWorkerFactory } from './sphere-worker-stroke.ts';
import { sphericalWorkDecision } from './spherical-work-policy.ts';

/** One authority/history shared by every view. Host owns the disposable session lifetime. */
export class SphericalSession {
  readonly terrain: SphericalTerrain;
  readonly history: SphericalHistory;
  readonly cache: SphericalDisplayCache;
  private readonly provider: SphericalTerrain;
  private dirtyIndices = new Set<number>();
  private trackedRevision: number;
  private stroke?: ReturnType<typeof startSphericalBrushStroke>;
  private remote?: ReturnType<typeof beginSphereWorkerStroke>;
  private workerFactory?: SphereWorkerFactory;
  private warmWorker?: Worker;
  private coarse = false;
  private field?: SphericalElevationField;
  private displayJob?: ReturnType<SphericalElevationField['prepare']>;
  private displayAll = false;
  private lastWork: object = { backend: 'cooperative' };
  private queue: { direction: Vec3; visibility?: SphericalBrushVisibility; at: number }[] = [];
  private segment?: Generator<boolean>;
  private segmentAt = 0;
  private presentedInputs: number[] = [];
  private presentedInputCount = 0;
  private released = false;
  private initialState = 0;
  private checkpointName: string;
  name: string;
  hasSaved: boolean;
  locked = false;
  private failure?: unknown;
  private strokeRevision = 0;
  changed = () => {};
  error = (_message: string) => {};
  beforeOperation=()=>{};
  readonly statistics = { dabs: 0, writes: 0, updatedPixels: 0, updatedRegions: 0, fullRebuilds: 0, maxDabMs: 0, slices: 0 };
  constructor(terrain: SphericalTerrain, cache: SphericalDisplayCache, name = 'Untitled sphere', saved = false) {
    this.name = name; this.checkpointName = name; this.hasSaved = saved;
    this.terrain = terrain; this.cache = cache; this.trackedRevision = terrain.revision;
    this.provider = { ...terrain, get revision() { return terrain.revision; }, write: (key, value) => {
      const revision = terrain.revision; terrain.write(key, value);
      if (terrain.revision !== revision) this.dirtyIndices.add(key.index);
      this.trackedRevision = terrain.revision;
    } };
    this.history = new SphericalHistory(this.provider);
  }
  get modified() { return this.history.stateId !== this.initialState || this.name !== this.checkpointName || this.painting && (this.terrain.revision !== this.strokeRevision || !!this.remote?.hasPending); }
  markSaved(name: string) { this.name = name; this.checkpointName = name; this.initialState = this.history.stateId; this.hasSaved = true; this.changed(); }
  get painting() { return !!this.stroke || !!this.remote; }
  get processing() { return this.painting && this.released; }
  get pendingPoints() { return this.remote?.pending ?? this.queue.length; }
  get backlogged() { return this.remote ? this.remote.hasPending : !!this.segment || this.queue.length > 0; }
  get displayPending() { return !!this.displayJob || !!this.field && (this.field.sourceRevision !== this.terrain.revision || this.dirtyIndices.size > 0); }
  get workDiagnostics() { return this.remote ? { ...this.lastWork, ...this.remote.diagnostics, statistics: this.remote.statistics } : this.lastWork; }
  get presentationTimingBounds() { return { retained: this.presentedInputs.length, capacity: 512, total: this.presentedInputCount }; }
  private notePresentationInput(at: number) { this.presentedInputCount++; if (this.presentedInputs.length === 512) this.presentedInputs.shift(); this.presentedInputs.push(at); }
  enableBackground(coarse: boolean, factory: SphereWorkerFactory = sphereWorkerFactory) {
    this.disableBackground(); this.coarse = coarse;
    const warm = () => { try { this.warmWorker = factory(); } catch { this.warmWorker = undefined; } };
    this.workerFactory = () => { const worker = this.warmWorker ?? factory(); this.warmWorker = undefined; warm(); return worker; }; warm();
  }
  disableBackground() { this.cancel(); this.warmWorker?.terminate(); this.warmWorker = undefined; this.workerFactory = undefined; }
  useElevationField(field: SphericalElevationField) { this.displayJob?.return([]); this.displayJob = undefined; this.field = field; this.cache.sourceRevision = field.sourceRevision; if (field.sourceRevision !== this.terrain.revision) this.displayAll = true; }
  releaseDisplay() { this.displayJob?.return([]); this.displayJob = undefined; this.field = undefined; }
  begin(direction: Vec3, settings: SphericalBrushSettings, hemisphere?: Vec3) {
    if (this.painting || this.locked) return false;
    this.beforeOperation();
    const start = performance.now();
    this.strokeRevision = this.terrain.revision;
    const decision = sphericalWorkDecision(this.terrain, direction, settings, this.coarse); this.lastWork = { ...decision, backend: this.workerFactory ? decision.backend : 'cooperative' };
    if (this.workerFactory && decision.backend === 'worker') this.remote = beginSphereWorkerStroke(this.provider, this.history, direction, settings, hemisphere, () => this.changed(), this.workerFactory, this.field?.directions);
    else this.stroke = startSphericalBrushStroke(this.provider, { ...this.terrain.metadata.identity, direction }, settings, this.history, hemisphere ? { hemisphere } : undefined);
    this.notePresentationInput(start);
    this.statistics.maxDabMs = Math.max(this.statistics.maxDabMs, performance.now() - start);
    this.released = false; this.changed(); return true;
  }
  move(direction: Vec3, visibility?: SphericalBrushVisibility) {
    if (!this.painting || this.released || this.locked) return;
    if (this.remote) { this.remote.move(direction, visibility); if (this.remote.status === 'failed') this.pump(0); this.changed(); return; }
    if (this.queue.length >= 2048) { this.cancel(); this.error('Stroke input limit reached. Completed terrain is retained; start a new stroke.'); return; }
    // Capture at acceptance, never read a mutable/global camera while delayed dabs run.
    const copy = (v: Vec3): Vec3 => [v[0], v[1], v[2]];
    this.queue.push({ direction: copy(direction), visibility: visibility && { hemisphere: copy(visibility.hemisphere), ...(visibility.endHemisphere ? { endHemisphere: copy(visibility.endHemisphere) } : {}) }, at: performance.now() }); this.changed();
  }
  release() { this.released = true; this.remote?.release(); this.changed(); }
  /** Each yield applies one complete pre-dab snapshot. Pointer segments and spacing are never dropped/coarsened. */
  pump(budgetMs = 6) {
    const start = performance.now(); let count = 0;
    try {
      if (this.remote) {
        do { this.remote.pump(); } while (!this.remote.isRemote && this.remote.hasPending && ++count < 8 && performance.now() - start < budgetMs);
        if (['complete', 'cancelled', 'failed'].includes(this.remote.status)) { if (this.remote.failure) { this.failure = this.remote.failure; this.error(String(this.remote.failure)); } this.finish(); }
        this.statistics.slices++; return this.painting && this.backlogged;
      }
      if (this.stroke && this.terrain.revision !== this.trackedRevision) { this.cancel(); return false; }
      while (this.stroke && (this.segment || this.queue.length) && count < 8 && performance.now() - start < budgetMs) {
        if (!this.segment) { const point = this.queue.shift()!; this.segmentAt = point.at; this.segment = this.stroke.moveToSteps({ ...this.terrain.metadata.identity, direction: point.direction }, point.visibility); }
        const before = performance.now(), result = this.segment.next();
        this.statistics.maxDabMs = Math.max(this.statistics.maxDabMs, performance.now() - before);
        if (result.done) { this.notePresentationInput(this.segmentAt); this.segment = undefined; } else count++;
      }
      if (this.stroke && this.released && !this.segment && !this.queue.length) this.finish();
    } catch (cause) { this.failure = cause; this.cancel(); this.error(cause instanceof Error ? cause.message : 'Spherical stroke stopped safely.'); }
    this.statistics.slices++; return !!this.stroke && (!!this.segment || !!this.queue.length || this.released);
  }
  private finish() {
    if (this.remote) { if (this.remote.status !== 'complete') this.presentedInputs = []; const stats = this.remote.statistics; this.statistics.dabs += stats.dabs; this.statistics.writes += stats.writes; this.lastWork = { ...this.lastWork, ...this.remote.diagnostics, statistics: stats }; this.remote = undefined; this.changed(); return; }
    if (!this.stroke) return;
    const stats = this.stroke.statistics; this.statistics.dabs += stats.dabs; this.statistics.writes += stats.writes;
    this.stroke.end(); this.stroke = undefined; this.changed();
  }
  cancel() { this.presentedInputs = []; if (!this.remote && this.stroke && this.terrain.revision !== this.trackedRevision) { this.history.discardUntracked(); this.trackedRevision = this.terrain.revision; this.displayAll = true; this.failure = new Error('Untracked spherical edit: history cleared to protect current terrain.'); this.error(String(this.failure)); } this.remote?.cancel(); this.segment?.return(undefined); this.segment = undefined; this.queue = []; this.finish(); }
  undo() { if (this.locked) return false; this.cancel(); const result = this.history.undo(); this.changed(); return result; }
  redo() { if (this.locked) return false; this.cancel(); const result = this.history.redo(); this.changed(); return result; }
  async drainForSave(yieldWork = yieldPersistence) {
    const previousFailure = this.failure; this.release();
    while (this.painting) { this.pump(8); if (this.painting && this.remote?.isRemote) await this.remote.waitForProgress(); else if (this.painting) await yieldWork(); }
    if (this.failure !== previousFailure) throw new Error('Queued brush work failed. Applied edits are retained; inspect them before retrying Save.');
  }
  /** Call after painting the current epoch. Pending preparation has not reached
   * that image yet; these conservative drain/readiness timings are not first pixels. */
  presentedLatencies(now: number) { if (this.backlogged) return []; const values = this.presentedInputs.map((at) => now - at); this.presentedInputs = []; return values; }
  updateDisplay() {
    const external = this.terrain.revision !== this.trackedRevision;
    if (external) { this.statistics.fullRebuilds++; this.trackedRevision = this.terrain.revision; }
    if (this.field) {
      if (external) this.displayAll = true;
      if (!this.displayJob && (this.displayAll || this.dirtyIndices.size)) { const changed = this.displayAll ? 'all' as const : this.dirtyIndices; this.dirtyIndices = new Set(); this.displayAll = false; this.displayJob = this.field.prepare(changed); }
      const start = performance.now();
      while (this.displayJob) { const next = this.displayJob.next(); if (next.done) { this.displayJob = undefined; this.cache.sourceRevision = this.field.sourceRevision; this.statistics.updatedRegions += next.value.length; this.statistics.updatedPixels += next.value.reduce((sum,r)=>sum+(r.right-r.left+1)*(r.bottom-r.top+1),0); return next.value; } if (performance.now() - start >= 4) break; }
      return [];
    }
    const regions = updateSphericalTextures(this.terrain, this.cache, external ? 'all' : this.dirtyIndices);
    this.dirtyIndices.clear();
    this.statistics.updatedRegions += regions.length;
    this.statistics.updatedPixels += regions.reduce((sum, r) => sum + (r.right - r.left + 1) * (r.bottom - r.top + 1), 0);
    return regions;
  }
}
