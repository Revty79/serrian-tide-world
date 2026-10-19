/** Small shared orchestration contract; surface providers own every formula. */
export class RevisionLease {
  private ended = false;
  readonly task: number;
  private revision: number;
  constructor(task: number, revision: number) { this.task = task; this.revision = revision; }
  validate(task: number, sourceRevision: number, currentRevision: number) {
    if (this.ended || task !== this.task || sourceRevision !== this.revision || currentRevision !== this.revision) throw new Error('Stale surface preparation; canonical terrain was not changed.');
  }
  acknowledged(revision: number) {
    if (this.ended || !Number.isSafeInteger(revision) || revision < this.revision) throw new Error('Invalid surface commit acknowledgement.');
    this.revision = revision;
  }
  cancel() { this.ended = true; }
}

/** Pending count includes messages in transit and provider-side input. No drops. */
export class OrderedSurfaceInput {
  accepted = 1;
  processed = 0;
  peak = 0;
  readonly maxPending: number;
  readonly maxAccepted: number;
  constructor(maxPending = 256, maxAccepted = 65536) { this.maxPending = maxPending; this.maxAccepted = maxAccepted; }
  accept() {
    if (this.accepted - Math.max(1, this.processed) >= this.maxPending || this.accepted >= this.maxAccepted) throw new RangeError('Surface accepted-input queue/count budget exhausted; committed prefix remains undoable.');
    this.accepted++; this.peak = Math.max(this.peak, this.pending);
    return this.accepted;
  }
  progress(processed: number) {
    if (!Number.isSafeInteger(processed) || processed < this.processed || processed > this.accepted) throw new Error('Invalid ordered surface progress.');
    this.processed = processed;
  }
  get pending() { return this.accepted - Math.max(1, this.processed); }
}

/** One shared event wait, not a high-priority polling loop. In particular,
 * scheduler.yield() polling can starve the normal worker-message task queue. */
export class SurfaceProgressSignal {
  private promise?: Promise<void>;
  private resolve?: () => void;
  wait() { return this.promise ??= new Promise<void>(r => { this.resolve = r; }); }
  notify() { const resolve = this.resolve; this.promise = undefined; this.resolve = undefined; resolve?.(); }
}
