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
export interface WordHistoryJournal {
 readonly version:1;readonly words:number;readonly state:number;readonly sequence:number;
 readonly undo:readonly WordHistoryEntry[];readonly redo:readonly WordHistoryEntry[];
}
interface WordHistoryEntry {readonly start:number;readonly indices?:readonly number[];readonly before:readonly number[];readonly after:readonly number[];readonly from:number;readonly to:number}
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
  private readonly strictWords:boolean;
  constructor(terrain: Pick<Terrain,'elevations'> | Uint32Array, budget = HISTORY_BYTES, limit = HISTORY_ENTRIES) {
    this.budget = budget; this.limit = limit;this.strictWords=terrain instanceof Uint32Array;
    this.bits = terrain instanceof Uint32Array ? terrain : new Uint32Array(terrain.elevations.buffer, terrain.elevations.byteOffset, terrain.elevations.length);
    if (budget < this.bits.byteLength * 2 + 64 || limit < 1) throw new RangeError('History budget must fit one complete operation.');
  }
  get stateId() { return this.current; }
  get canUndo() { return this.undoEntries.length > 0; }
  get canRedo() { return this.redoEntries.length > 0; }
  get retainedBytes() { return [...this.undoEntries, ...this.redoEntries].reduce((sum, entry) => sum + entry.bytes, 0); }
  get length() { return this.undoEntries.length + this.redoEntries.length; }
  /** Detached, bounded metadata journal. Existing terrain editing does not call
   * this API; restoring a journal never writes the authoritative words. */
  exportJournal():WordHistoryJournal {
    if(this.pending)throw Error('Finish the current operation before saving history.');
    const entry=(e:Entry):WordHistoryEntry=>({start:e.start,...(e.indices?{indices:Array.from(e.indices)}:{}),before:Array.from(e.before),after:Array.from(e.after),from:e.from,to:e.to});
    return{version:1,words:this.bits.length,state:this.current,sequence:this.sequence,undo:this.undoEntries.map(entry),redo:this.redoEntries.map(entry)};
  }
  restoreJournal(input:WordHistoryJournal,validateState:(words:Uint32Array)=>void=()=>{}) {
    if(this.pending)throw Error('Finish the current operation before restoring history.');
    const exact=(v:unknown,fields:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==fields.sort().join(','))throw Error('Unsupported history journal fields.');};
    const integer=(n:number,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(n)||n<0||n>max)throw Error('Invalid history journal integer.');return n;};
    const dense=(a:unknown,max:number)=>{if(!Array.isArray(a)||a.length>max||Object.keys(a).length!==a.length||Object.keys(a).some((key,i)=>key!==String(i)))throw Error('History journal array exceeds its bounds.');};
    exact(input,['version','words','state','sequence','undo','redo']);
    if(input.version!==1||input.words!==this.bits.length)throw Error('Incompatible history journal.');integer(input.sequence);integer(input.state,input.sequence);
    dense(input.undo,this.limit);dense(input.redo,this.limit);if(input.undo.length+input.redo.length>this.limit)throw Error('History journal entry limit exceeded.');
    let bytes=0;const identities=new Set<number>();
    const entry=(e:WordHistoryEntry):Entry=>{
      exact(e,e.indices===undefined?['start','before','after','from','to']:['start','indices','before','after','from','to']);
      dense(e.before,this.bits.length);dense(e.after,this.bits.length);if(!e.before.length||e.before.length!==e.after.length)throw Error('Invalid history journal values.');
      integer(e.start,this.bits.length-1);integer(e.from,input.sequence);integer(e.to,input.sequence);if(e.to<=e.from||identities.has(e.to))throw Error('Invalid history journal state chain.');identities.add(e.to);
      if(e.indices!==undefined){dense(e.indices,this.bits.length);if(e.indices.length!==e.before.length||e.start!==0)throw Error('Invalid sparse history journal.');let last=-1;for(const i of e.indices){integer(i,this.bits.length-1);if(i<=last)throw Error('History indices must be unique and sorted.');last=i;}}
      else if(e.start+e.before.length>this.bits.length)throw Error('History span exceeds authoritative words.');
      bytes+=e.before.length*(e.indices?12:8)+64;if(bytes>this.budget)throw Error('History journal byte budget exceeded.');
      for(const n of [...e.before,...e.after])integer(n,0xffffffff);
      return{start:e.start,...(e.indices?{indices:Uint32Array.from(e.indices)}:{}),before:Uint32Array.from(e.before),after:Uint32Array.from(e.after),from:e.from,to:e.to,bytes:e.before.length*(e.indices?12:8)+64};
    };
    const undo=input.undo.map(entry),redo=input.redo.map(entry);
    const walk=(entries:Entry[],forward:boolean)=>{const words=this.bits.slice();let state=input.state;for(let j=entries.length-1;j>=0;j--){const e=entries[j]!,source=forward?e.before:e.after,target=forward?e.after:e.before;
      if(state!==(forward?e.from:e.to))throw Error('History journal states are disconnected.');
      for(let i=0;i<source.length;i++){const at=e.indices?.[i]??e.start+i;if(words[at]!==source[i])throw Error('History journal source does not match the saved World.');words[at]=target[i]!;}
      state=forward?e.to:e.from;validateState(words);
    }};
    validateState(this.bits.slice());walk(undo,false);walk(redo,true);
    this.undoEntries=undo;this.redoEntries=redo;this.current=input.state;this.sequence=input.sequence;
  }
  begin() { if (!this.pending) this.pending = this.bits.slice(); }
  /** Prepare a bounded word journal before publishing a metadata replacement. */
  replace(next: Uint32Array) {
    if (this.pending || next.length !== this.bits.length) throw Error('Invalid history replacement.');
    return this.record(this.bits,next,true);
  }
  /** Detached replay candidate: callers can validate geometry before replay. */
  preview(redo=false) {
    if(this.pending)throw Error('Finish the current operation first.');
    const entry=(redo?this.redoEntries:this.undoEntries).at(-1);if(!entry)return;
    const next=this.bits.slice(),values=redo?entry.after:entry.before;
    if(entry.indices)entry.indices.forEach((index,offset)=>{next[index]=values[offset]!;});else next.set(values,entry.start);
    return next;
  }
  commit(): boolean {
    const previous = this.pending;
    this.pending = undefined;
    if (!previous) return false;
    return this.record(previous,this.bits,false);
  }
  private record(previous:Uint32Array,next:Uint32Array,publish:boolean):boolean {
    let first = -1;
    let last = 0;
    let count = 0;
    for (let i = 0; i < next.length; i++) if (previous[i] !== next[i]) { if (first < 0) first = i; last = i; count++; }
    if (first < 0) return false;
    const span = last - first + 1;
    let entry: Entry;
    if (count * 12 < span * 8) {
      const indices = new Uint32Array(count), before = new Uint32Array(count), after = new Uint32Array(count);
      let offset = 0;
      for (let i = first; i <= last; i++) if (previous[i] !== next[i]) { indices[offset] = i; before[offset] = previous[i]!; after[offset++] = next[i]!; }
      entry = { indices, start: 0, before, after, from: this.current, to: this.sequence+1, bytes: count * 12 + 64 };
    } else {
      entry = { start: first, before: previous.slice(first, last + 1), after: next.slice(first, last + 1), from: this.current, to: this.sequence+1, bytes: span * 8 + 64 };
    }
    const entries=[...this.undoEntries,entry],redo:Entry[]=[];let bytes=entries.reduce((sum,e)=>sum+e.bytes,0);
    while(bytes>this.budget||entries.length>this.limit)bytes-=entries.shift()!.bytes;
    if(publish)this.bits.set(next);
    this.redoEntries = redo;this.undoEntries=entries;this.sequence=entry.to;
    this.current = entry.to;
    return true;
  }
  private apply(entry: Entry, values: Uint32Array) {
    if (entry.indices) entry.indices.forEach((index, offset) => { this.bits[index] = values[offset]!; });
    else this.bits.set(values, entry.start);
  }
  private validateSource(entry:Entry,values:Uint32Array){if(!this.strictWords)return;for(let i=0;i<values.length;i++)if(this.bits[entry.indices?.[i]??entry.start+i]!==values[i])throw Error('History source words changed; replay was not published.');}
  undo(): boolean {
    this.commit();
    const entry = this.undoEntries.at(-1);
    if (!entry) return false;
    this.validateSource(entry,entry.after);const undo=this.undoEntries.slice(0,-1),redo=[...this.redoEntries,entry];
    this.apply(entry, entry.before); this.current = entry.from;this.undoEntries=undo;this.redoEntries=redo;return true;
  }
  redo(): boolean {
    this.commit();
    const entry = this.redoEntries.at(-1);
    if (!entry) return false;
    this.validateSource(entry,entry.before);const redo=this.redoEntries.slice(0,-1),undo=[...this.undoEntries,entry];
    this.apply(entry, entry.after); this.current = entry.to;this.undoEntries=undo;this.redoEntries=redo;return true;
  }
}
