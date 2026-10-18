import { SphericalHistory } from './spherical-history.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings } from '../terrain/spherical-brush.ts';
import type { Vec3 } from '../surfaces/cube-sphere.ts';
import { updateSphericalTextures } from '../rendering/spherical-texture-updates.ts';
import type { SphericalDisplayCache } from '../rendering/spherical-raster.ts';

/** One authority/history shared by every view. Host owns the disposable session lifetime. */
export class SphericalSession {
  readonly terrain: SphericalTerrain;
  readonly history: SphericalHistory;
  readonly cache: SphericalDisplayCache;
  private readonly provider: SphericalTerrain;
  private dirtyIndices = new Set<number>();
  private trackedRevision: number;
  private stroke?: ReturnType<typeof startSphericalBrushStroke>;
  private queue: { direction: Vec3; at: number }[] = [];
  private segment?: Generator<boolean>;
  private segmentAt = 0;
  private presentedInputs: number[] = [];
  private released = false;
  private initialState = 0;
  private strokeRevision = 0;
  changed = () => {};
  error = (_message: string) => {};
  readonly statistics = { dabs: 0, writes: 0, updatedPixels: 0, updatedRegions: 0, fullRebuilds: 0, maxDabMs: 0, slices: 0 };
  constructor(terrain: SphericalTerrain, cache: SphericalDisplayCache) {
    this.terrain = terrain; this.cache = cache; this.trackedRevision = terrain.revision;
    this.provider = { ...terrain, get revision() { return terrain.revision; }, write: (key, value) => {
      const revision = terrain.revision; terrain.write(key, value);
      if (terrain.revision !== revision) this.dirtyIndices.add(key.index);
      this.trackedRevision = terrain.revision;
    } };
    this.history = new SphericalHistory(this.provider);
  }
  get modified() { return this.history.stateId !== this.initialState || this.painting && this.terrain.revision !== this.strokeRevision; }
  get painting() { return !!this.stroke; }
  get processing() { return !!this.stroke && this.released; }
  get pendingPoints() { return this.queue.length; }
  get backlogged() { return !!this.segment || this.queue.length > 0; }
  begin(direction: Vec3, settings: SphericalBrushSettings, hemisphere?: Vec3) {
    if (this.stroke) return false;
    const start = performance.now();
    this.strokeRevision = this.terrain.revision;
    this.stroke = startSphericalBrushStroke(this.provider, { ...this.terrain.metadata.identity, direction }, settings, this.history, hemisphere ? { hemisphere } : undefined);
    this.presentedInputs.push(start);
    this.statistics.maxDabMs = Math.max(this.statistics.maxDabMs, performance.now() - start);
    this.released = false; this.changed(); return true;
  }
  move(direction: Vec3) {
    if (!this.stroke || this.released) return;
    if (this.queue.length >= 2048) { this.cancel(); this.error('Stroke input limit reached. Completed terrain is retained; start a new stroke.'); return; }
    this.queue.push({ direction, at: performance.now() }); this.changed();
  }
  release() { this.released = true; this.changed(); }
  /** Each yield applies one complete pre-dab snapshot. Pointer segments and spacing are never dropped/coarsened. */
  pump(budgetMs = 6) {
    const start = performance.now(); let count = 0;
    try {
      while (this.stroke && (this.segment || this.queue.length) && count < 8 && performance.now() - start < budgetMs) {
        if (!this.segment) { const point = this.queue.shift()!; this.segmentAt = point.at; this.segment = this.stroke.moveToSteps({ ...this.terrain.metadata.identity, direction: point.direction }); }
        const before = performance.now(), result = this.segment.next();
        this.statistics.maxDabMs = Math.max(this.statistics.maxDabMs, performance.now() - before);
        if (result.done) { this.presentedInputs.push(this.segmentAt); this.segment = undefined; } else count++;
      }
      if (this.stroke && this.released && !this.segment && !this.queue.length) this.finish();
    } catch (cause) { this.cancel(); this.error(cause instanceof Error ? cause.message : 'Spherical stroke stopped safely.'); }
    this.statistics.slices++; return !!this.stroke && (!!this.segment || !!this.queue.length || this.released);
  }
  private finish() {
    if (!this.stroke) return;
    const stats = this.stroke.statistics; this.statistics.dabs += stats.dabs; this.statistics.writes += stats.writes;
    this.stroke.end(); this.stroke = undefined; this.changed();
  }
  cancel() { this.segment?.return(undefined); this.segment = undefined; this.queue = []; this.finish(); }
  undo() { this.cancel(); const result = this.history.undo(); this.changed(); return result; }
  redo() { this.cancel(); const result = this.history.redo(); this.changed(); return result; }
  /** Call after painting the updated cache: complete physical input segment -> displayed terrain. */
  presentedLatencies(now: number) { const values = this.presentedInputs.map((at) => now - at); this.presentedInputs = []; return values; }
  updateDisplay() {
    const external = this.terrain.revision !== this.trackedRevision;
    if (external) { this.statistics.fullRebuilds++; this.trackedRevision = this.terrain.revision; }
    const regions = updateSphericalTextures(this.terrain, this.cache, external ? 'all' : this.dirtyIndices);
    this.dirtyIndices.clear();
    this.statistics.updatedRegions += regions.length;
    this.statistics.updatedPixels += regions.reduce((sum, r) => sum + (r.right - r.left + 1) * (r.bottom - r.top + 1), 0);
    return regions;
  }
}
