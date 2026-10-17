import type { Terrain } from '../terrain/model.ts';

interface Entry {
  indices?: Uint32Array;
  start: number;
  before: Uint32Array;
  after: Uint32Array;
  from: number;
  to: number;
  bytes: number;
}
export const HISTORY_BYTES = 16 * 1024 * 1024;
export const HISTORY_ENTRIES = 100;

/** Bit-exact terrain-only history. One transient snapshot; retained entries store changed samples/spans. */
export class TerrainHistory {
  private readonly bits: Uint32Array;
  private pending?: Uint32Array;
  private undoEntries: Entry[] = [];
  private redoEntries: Entry[] = [];
  private sequence = 0;
  private current = 0;
  private readonly budget: number;
  private readonly limit: number;
  constructor(terrain: Terrain, budget = HISTORY_BYTES, limit = HISTORY_ENTRIES) {
    this.budget = budget; this.limit = limit;
    this.bits = new Uint32Array(terrain.elevations.buffer, terrain.elevations.byteOffset, terrain.elevations.length);
    if (budget < this.bits.byteLength * 2 + 64 || limit < 1) throw new RangeError('History budget must fit one complete operation.');
  }
  get stateId() { return this.current; }
  get canUndo() { return this.undoEntries.length > 0; }
  get canRedo() { return this.redoEntries.length > 0; }
  get retainedBytes() { return [...this.undoEntries, ...this.redoEntries].reduce((sum, entry) => sum + entry.bytes, 0); }
  get length() { return this.undoEntries.length + this.redoEntries.length; }
  begin() { if (!this.pending) this.pending = this.bits.slice(); }
  commit(): boolean {
    const previous = this.pending;
    this.pending = undefined;
    if (!previous) return false;
    let first = -1;
    let last = 0;
    let count = 0;
    for (let i = 0; i < this.bits.length; i++) if (previous[i] !== this.bits[i]) { if (first < 0) first = i; last = i; count++; }
    if (first < 0) return false;
    const span = last - first + 1;
    let entry: Entry;
    if (count * 12 < span * 8) {
      const indices = new Uint32Array(count), before = new Uint32Array(count), after = new Uint32Array(count);
      let next = 0;
      for (let i = first; i <= last; i++) if (previous[i] !== this.bits[i]) { indices[next] = i; before[next] = previous[i]!; after[next++] = this.bits[i]!; }
      entry = { indices, start: 0, before, after, from: this.current, to: ++this.sequence, bytes: count * 12 + 64 };
    } else {
      entry = { start: first, before: previous.slice(first, last + 1), after: this.bits.slice(first, last + 1), from: this.current, to: ++this.sequence, bytes: span * 8 + 64 };
    }
    this.redoEntries = [];
    this.undoEntries.push(entry);
    this.current = entry.to;
    while (this.retainedBytes > this.budget || this.length > this.limit) this.undoEntries.shift();
    return true;
  }
  private apply(entry: Entry, values: Uint32Array) {
    if (entry.indices) entry.indices.forEach((index, offset) => { this.bits[index] = values[offset]!; });
    else this.bits.set(values, entry.start);
  }
  undo(): boolean {
    this.commit();
    const entry = this.undoEntries.pop();
    if (!entry) return false;
    this.apply(entry, entry.before); this.current = entry.from; this.redoEntries.push(entry); return true;
  }
  redo(): boolean {
    this.commit();
    const entry = this.redoEntries.pop();
    if (!entry) return false;
    this.apply(entry, entry.after); this.current = entry.to; this.undoEntries.push(entry); return true;
  }
}
