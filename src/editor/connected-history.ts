import { paintingStage } from './painting-metrics.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import {MAX_INDEXED_PATCH_SAMPLES as MAX_CYLINDER_PATCH_SAMPLES,type IndexedTerrain,type IndexedPatchBlock as CylinderPatchBlock} from '../terrain/indexed-float32.ts';

const CHUNK = 1024, BYTES = CHUNK * 12;
export const CYLINDER_HISTORY_LIMITS = Object.freeze({ maxEntries: 32, maxBytes: 8 * 1024 * 1024, maxStrokeSamples: MAX_CYLINDER_PATCH_SAMPLES });
export type CylinderHistoryLimits = { readonly [K in keyof typeof CYLINDER_HISTORY_LIMITS]?: number };
export type CylinderStrokeTermination = 'released' | 'cancelled' | 'failed' | 'disposed';
export interface ConnectedCommitJob<T> {
 readonly statistics:{readonly affectedSamples:number};
 readonly center:SurfacePosition;readonly settings:CylindricalBrushSettings;readonly sourceRevision:number;
 preparedChanges(terrain:T):Iterable<{readonly index:number;readonly before:number;readonly after:number}>;
 commit():number;
}
interface Chunk { indices: Uint32Array; before: Float32Array; after: Float32Array; beforeWords: Uint32Array; afterWords: Uint32Array }
interface Record { chunks: (Chunk | undefined)[]; slots: Map<number, number>; count: number; bytes: number; dabs: number; reason: CylinderStrokeTermination }

/** Exact finite-Float32 words, private bounded storage; no browser/session input dependencies. */
export function createConnectedHistory<T extends IndexedTerrain<{readonly index:number}>>(terrain:T, input:CylinderHistoryLimits = {}) {
  const limits = Object.freeze({ ...CYLINDER_HISTORY_LIMITS, ...input });
  for (const name of Object.keys(CYLINDER_HISTORY_LIMITS) as (keyof typeof limits)[]) if (!Number.isSafeInteger(limits[name]) || limits[name] < 1 || limits[name] > CYLINDER_HISTORY_LIMITS[name]) throw new RangeError('Cylinder history limits may only lower the hard budgets.');
  const entries: (Record | undefined)[] = new Array(limits.maxEntries);
  let size = 0, cursor = 0, bytes = 0, active: Record | undefined, evictions = 0, branches = 0, peakTypedBytes = 0;
  const chunkAt = (r: Record, slot: number) => r.chunks[Math.floor(slot / CHUNK)]!;
  const apply = (redo: boolean) => {
    if (active) throw new Error('End the cylindrical stroke before using history.');
    if (redo ? cursor === size : cursor === 0) return false;
    const r = entries[redo ? cursor : cursor - 1]!, revision = terrain.revision;
    const indices: number[] = [];
    for (const [index, slot] of r.slots) { const c = chunkAt(r, slot), i = slot % CHUNK; if (!Object.is(c.before[i], c.after[i])) indices.push(index); }
    indices.sort((a, b) => a - b);
    const blocks: { indices: Uint32Array; values: Float32Array; count: number }[] = [];
    for (let offset = 0; offset < indices.length; offset += CHUNK) {
      const count = Math.min(CHUNK, indices.length - offset), block = { indices: new Uint32Array(count), values: new Float32Array(count), count };
      for (let i = 0; i < count; i++) {
        const index = indices[offset + i]!, slot = r.slots.get(index)!, c = chunkAt(r, slot), j = slot % CHUNK;
        if (!Object.is(terrain.read(terrain.keyAt(index)), redo ? c.before[j] : c.after[j])) throw new Error('Cylinder history conflicts with an externally changed sample.');
        block.indices[i] = index; block.values[i] = (redo ? c.after[j] : c.before[j])!;
      }
      blocks.push(block);
    }
    terrain.commitPreparedPatch(terrain.keyAt(0), revision, blocks as readonly CylinderPatchBlock[]);
    cursor += redo ? 1 : -1; return true;
  };
  return Object.freeze({
    limits,
    get canUndo() { return !active && cursor > 0; }, get canRedo() { return !active && cursor < size; },
    get statistics() { return Object.freeze({ entries: size, cursor, retainedBytes: bytes + (active?.bytes ?? 0), activeBytes: active?.bytes ?? 0, activeSamples: active?.count ?? 0, evictions, branches, peakTypedBytes }); },
    get operations() { return Object.freeze(entries.slice(0, size).map(r => Object.freeze({ samples: r!.count, bytes: r!.bytes, dabs: r!.dabs, termination: r!.reason }))); },
    undo: () => apply(false), redo: () => apply(true),
    clear() { if (active) throw new Error('End the cylindrical stroke before clearing history.'); for (let i = 0; i < size; i++) entries[i] = undefined; size = 0; cursor = 0; bytes = 0; },
    *changes(operation: number) {
      if (!Number.isInteger(operation) || operation < 0 || operation >= size) throw new RangeError('Invalid cylinder history operation.');
      const r = entries[operation]!;
      for (let slot = 0; slot < r.count; slot++) { const c = chunkAt(r, slot), i = slot % CHUNK; yield Object.freeze({ index: c.indices[i]!, beforeWord: c.beforeWords[i]!, afterWord: c.afterWords[i]! }); }
    },
    beginOperation(expectedTerrain:T) {
      if (expectedTerrain !== terrain) throw new Error('Foreign cylinder history authority.');
      if (active) throw new Error('A cylinder history operation is already active.');
      let pending: Record | undefined = { chunks: new Array(Math.ceil(limits.maxStrokeSamples / CHUNK)), slots: new Map(), count: 0, bytes: 0, dabs: 0, reason: 'released' };
      active = pending; let expectedRevision = terrain.revision, closed = false;
      const synchronized = () => { if (closed || active !== pending || terrain.revision !== expectedRevision) throw new Error('Cylinder stroke source revision changed or its history operation ended.'); };
      return Object.freeze({
        synchronized,
        commitDab(job:ConnectedCommitJob<T>) {
          synchronized();
          const r = pending!;
          const changes = [];
          for (const change of job.preparedChanges(terrain)) { if (changes.length >= MAX_CYLINDER_PATCH_SAMPLES) throw new RangeError('Cylinder history handoff sample limit exceeded.'); changes.push(change); }
          let added = 0; for (const c of changes) if (!r.slots.has(c.index)) added++;
          const nextCount = r.count + added, nextBytes = Math.ceil(nextCount / CHUNK) * BYTES;
          if (nextCount > limits.maxStrokeSamples || nextBytes > limits.maxBytes) throw new RangeError('Cylinder stroke history sample/memory budget exhausted.');
          let keepBytes = 0; for (let i = 0; i < cursor; i++) keepBytes += entries[i]!.bytes;
          let evict = 0;
          if (changes.length) while (cursor - evict >= limits.maxEntries || keepBytes + nextBytes > limits.maxBytes) { keepBytes -= entries[evict++]!.bytes; }
          const oldCount = r.count, oldBytes = r.bytes;
          try {
            for (let i = oldBytes / BYTES; i < nextBytes / BYTES; i++) {
              const before = new Float32Array(CHUNK), after = new Float32Array(CHUNK);
              r.chunks[i] = { indices: new Uint32Array(CHUNK), before, after, beforeWords: new Uint32Array(before.buffer), afterWords: new Uint32Array(after.buffer) };
            }
            peakTypedBytes = Math.max(peakTypedBytes, bytes + nextBytes);
            for (const change of changes) {
              let slot = r.slots.get(change.index);
              if (slot === undefined) { slot = r.count++; r.slots.set(change.index, slot); const c = chunkAt(r, slot), j = slot % CHUNK; c.indices[j] = change.index; c.before[j] = change.before; }
              chunkAt(r, slot).after[slot % CHUNK] = change.after;
            }
            synchronized(); const writes = paintingStage('canonicalCommit', () => job.commit()); expectedRevision = terrain.revision; r.bytes = nextBytes; r.dabs++;
            if (changes.length) {
              for (let i = cursor; i < size; i++) { bytes -= entries[i]!.bytes; entries[i] = undefined; branches++; } size = cursor;
              for (let i = 0; i < evict; i++) { bytes -= entries[i]!.bytes; evictions++; }
              if (evict) { for (let i = evict; i < size; i++) entries[i - evict] = entries[i]; for (let i = size - evict; i < size; i++) entries[i] = undefined; size -= evict; cursor = size; }
            }
            return writes;
          } catch (error) {
            for (const change of changes) { const slot = r.slots.get(change.index); if (slot === undefined) continue; if (slot >= oldCount) r.slots.delete(change.index); else chunkAt(r, slot).after[slot % CHUNK] = change.before; }
            for (let i = oldBytes / BYTES; i < r.chunks.length; i++) r.chunks[i] = undefined;
            r.count = oldCount; r.bytes = oldBytes; throw error;
          }
        },
        finish(reason: CylinderStrokeTermination) {
          if (!['released', 'cancelled', 'failed', 'disposed'].includes(reason)) throw new RangeError('Invalid cylinder stroke termination.');
          if (closed) return false;
          const r = pending!; pending = undefined;
          closed = true; active = undefined; r.reason = reason;
          let changed = false; for (let slot = 0; slot < r.count; slot++) { const c = chunkAt(r, slot), i = slot % CHUNK; if (!Object.is(c.before[i], c.after[i])) { changed = true; break; } }
          if (!changed) return false;
          // Storage/entry capacity was reserved before every successful dab.
          entries[size++] = r; bytes += r.bytes; cursor = size; return true;
        },
      });
    },
  });
}
export type ConnectedHistory<T extends IndexedTerrain<{readonly index:number}>>=ReturnType<typeof createConnectedHistory<T>>;
