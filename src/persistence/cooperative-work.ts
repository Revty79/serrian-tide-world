export interface PersistenceWork { progress?(stage: string, fraction: number): void; yield?(): Promise<void> }
/** Yield the main thread, not just the microtask queue. Also works in Node numerical tests. */
export function yieldPersistence(): Promise<void> {
  const scheduler = (globalThis as typeof globalThis & { scheduler?: { yield(): Promise<void> } }).scheduler;
  return scheduler?.yield ? scheduler.yield() : new Promise((resolve) => setTimeout(resolve, 0));
}
export async function workStep(work: PersistenceWork, stage: string, fraction: number) { work.progress?.(stage, fraction); await (work.yield ?? yieldPersistence)(); }
