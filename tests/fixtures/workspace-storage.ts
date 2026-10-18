import { benchmark } from './sphere-storage.ts';

/** A sustained workload, with no synthetic sleeps or counted idle frames.
 * Fast N=128 pipelines may finish within one vsync. Exercise three complete real
 * encode/atomic-write/read/validate/restore/cache cycles and retain every result.
 */
export async function benchmarkWorkspace(n: number) {
  const cycles = [];
  for (let i = 0; i < 3; i++) cycles.push(await benchmark(n));
  const first = cycles[0]!;
  return { ...first, cycles, exact: cycles.every((c) => c.exact), metadataExact: cycles.every((c) => c.metadataExact), ticks: cycles.reduce((sum, c) => sum + c.ticks, 0), maxAnimationFrameGapMs: Math.max(...cycles.map((c) => c.maxAnimationFrameGapMs)) };
}
