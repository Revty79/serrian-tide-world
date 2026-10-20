import type { SphericalTerrain } from '../terrain/spherical.ts';
import { HISTORY_BYTES, HISTORY_ENTRIES } from './terrain-history.ts';

interface Entry { indices?: Uint32Array; start: number; before: Uint32Array; after: Uint32Array; from: number; to: number; bytes: number }
/** Copies only: never receives a mutable view of spherical authority. Restores through validated canonical writes. */
export class SphericalHistory {
  private readonly terrain: SphericalTerrain;
  private readonly budget: number;
  private readonly limit: number;
  private pending?: Uint32Array;
  private undoEntries: Entry[] = [];
  private redoEntries: Entry[] = [];
  private expectedRevision: number;
  private sequence = 0;
  private current = 0;
  constructor(terrain: SphericalTerrain, budget = HISTORY_BYTES, limit = HISTORY_ENTRIES) {
    if (!Number.isSafeInteger(budget) || budget < terrain.elevationByteLength * 2 + 64 || !Number.isSafeInteger(limit) || limit < 1) throw new RangeError('History budget must fit one full-surface operation and a positive entry limit.');
    this.terrain = terrain; this.budget = budget; this.limit = limit; this.expectedRevision = terrain.revision;
  }
  owns(terrain: SphericalTerrain) { return terrain === this.terrain; }
  get stateId() { return this.current; }
  get canUndo() { return this.undoEntries.length > 0; }
  get canRedo() { return this.redoEntries.length > 0; }
  get length() { return this.undoEntries.length + this.redoEntries.length; }
  get retainedBytes() { return [...this.undoEntries, ...this.redoEntries].reduce((sum, entry) => sum + entry.bytes, 0); }
  get pendingBytes() { return this.pending?.byteLength ?? 0; }
  private snapshot() {
    const copy = this.terrain.copyElevations();
    if (!copy.every(Number.isFinite)) throw new RangeError('History requires finite spherical elevations.');
    return new Uint32Array(copy.buffer, copy.byteOffset, copy.length);
  }
  clear() {
    if (this.pending) throw new Error('End and commit the active spherical operation before clearing history.');
    this.pending = undefined; this.undoEntries = []; this.redoEntries = [];
    this.current = ++this.sequence; this.expectedRevision = this.terrain.revision;
  }
  /** An external revision cannot be folded into this editor's pending Undo entry. */
  discardUntracked() {
    this.pending = undefined; this.undoEntries = []; this.redoEntries = [];
    this.current = ++this.sequence; this.expectedRevision = this.terrain.revision;
  }
  private synchronized() {
    if (this.terrain.revision !== this.expectedRevision) { this.clear(); throw new Error('Untracked spherical edit: history was cleared to protect current terrain.'); }
  }
  begin() {
    if (this.pending) throw new Error('A spherical history operation is already active.');
    this.synchronized(); this.pending = this.snapshot();
  }
  commit(): boolean {
    const previous = this.pending;
    if (!previous) return false;
    const next = this.snapshot(); this.pending = undefined; this.expectedRevision = this.terrain.revision;
    let first = -1, last = 0, count = 0;
    for (let i = 0; i < next.length; i++) if (previous[i] !== next[i]) { if (first < 0) first = i; last = i; count++; }
    if (first < 0) return false;
    const span = last - first + 1; let entry: Entry;
    if (count * 12 < span * 8) {
      const indices = new Uint32Array(count), before = new Uint32Array(count), after = new Uint32Array(count); let offset = 0;
      for (let i = first; i <= last; i++) if (previous[i] !== next[i]) { indices[offset] = i; before[offset] = previous[i]!; after[offset++] = next[i]!; }
      entry = { indices, start: 0, before, after, from: this.current, to: ++this.sequence, bytes: count * 12 + 64 };
    } else entry = { start: first, before: previous.slice(first, last + 1), after: next.slice(first, last + 1), from: this.current, to: ++this.sequence, bytes: span * 8 + 64 };
    this.redoEntries = []; this.undoEntries.push(entry); this.current = entry.to;
    while (this.retainedBytes > this.budget || this.length > this.limit) this.undoEntries.shift();
    return true;
  }
  private apply(entry: Entry, words: Uint32Array) {
    const floats = new Float32Array(words.buffer, words.byteOffset, words.length);
    for (let i = 0; i < words.length; i++) this.terrain.write(this.terrain.keyAt(entry.indices ? entry.indices[i]! : entry.start + i), floats[i]!);
    this.expectedRevision = this.terrain.revision;
  }
  undo(): boolean {
    if (this.pending) throw new Error('End and commit the spherical operation before Undo.');
    this.synchronized(); const entry = this.undoEntries.pop();
    if (!entry) return false;
    this.apply(entry, entry.before); this.current = entry.from; this.redoEntries.push(entry); return true;
  }
  redo(): boolean {
    if (this.pending) throw new Error('End and commit the spherical operation before Redo.');
    this.synchronized(); const entry = this.redoEntries.pop();
    if (!entry) return false;
    this.apply(entry, entry.after); this.current = entry.to; this.undoEntries.push(entry); return true;
  }
}
