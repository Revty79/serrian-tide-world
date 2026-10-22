import type {ConnectedWorkerTerrain} from './connected-worker-stroke.ts';
import type {ConnectedCommitJob} from './connected-history.ts';
import type {ConnectedPreparedPatch} from './connected-work-protocol.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS as CYLINDER_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
/** Validate the entire untrusted worker handoff before history or terrain changes. */
export function connectedPreparedPatch<T extends ConnectedWorkerTerrain>(t:T,p:ConnectedPreparedPatch):ConnectedCommitJob<T> {
  if (!(p.indices instanceof Uint32Array) || !(p.before instanceof Float32Array) || !(p.after instanceof Float32Array)
    || !(p.indices.buffer instanceof ArrayBuffer) || !(p.before.buffer instanceof ArrayBuffer) || !(p.after.buffer instanceof ArrayBuffer)
    || p.indices.length !== p.before.length || p.indices.length !== p.after.length || p.indices.byteLength + p.after.byteLength > CYLINDER_PREVIEW_DAB_LIMITS.maxPreparedBytes
    || p.indices.length > CYLINDER_PREVIEW_DAB_LIMITS.maxCandidates || p.sourceRevision !== t.revision) throw new Error('Invalid or stale cylinder preparation.');
  const center = t.geometry.normalize(p.center); let previous = -1;
  for (let i = 0; i < p.indices.length; i++) {
    const index = p.indices[i]!;
    if (index <= previous || index >= t.sampleCount || !Number.isFinite(p.before[i]) || !Number.isFinite(p.after[i]) || Object.is(p.before[i], p.after[i]) || !Object.is(t.read(t.keyAt(index)), p.before[i])) throw new Error('Cylinder prepared words do not match the canonical source.');
    previous = index;
  }
  let committed = false;
  const synchronized = () => { if (committed || t.revision !== p.sourceRevision) throw new Error('Stale cylinder prepared epoch.'); };
  return {
    center, settings: { ...p.settings, maxFalloffError: p.settings.maxFalloffError ?? 1e-6 }, sourceRevision: p.sourceRevision, statistics: { affectedSamples: p.affectedSamples },
    *preparedChanges(expected) {
      if (expected !== t) throw new Error('Foreign cylinder prepared authority.');
      synchronized();
      for (let i = 0; i < p.indices.length; i++) { synchronized(); yield { index: p.indices[i]!, before: p.before[i]!, after: p.after[i]! }; }
    },
    commit() { synchronized(); const writes = t.commitPreparedPatch(t.keyAt(0), p.sourceRevision, [{ indices: p.indices, values: p.after, count: p.indices.length }]); committed = true; return writes; },
  };
}
