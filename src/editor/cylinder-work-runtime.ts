import { createCylindricalTerrain } from '../terrain/cylindrical.ts';
import type { prepareCylindricalDab } from '../terrain/cylindrical-brush.ts';
import { beginCylindricalStroke } from '../terrain/cylindrical-stroke.ts';
import type { CylindricalHistory } from './cylindrical-history.ts';
import { prepareCylinderStencil } from '../rendering/cylindrical-raster.ts';
import type { CylinderWorkInput, CylinderWorkOutput } from './cylinder-work-protocol.ts';
import { paintingMetrics, resetPaintingMetrics, paintingStage, recordPaintingStage } from './painting-metrics.ts';

/** One short-lived source epoch, one proposal in flight. This copy cannot publish
 * terrain. It advances ONLY after the canonical host acknowledges the exact dab. */
export function createCylinderWorkRuntime(send: (message: CylinderWorkOutput) => void, schedule: (fn: () => void) => void) {
  let task = -1, sequence = 0, canonicalRevision = 0, expectedWrites = 0, queued = false, waiting = false, acknowledged = false;
  let stroke: ReturnType<typeof beginCylindricalStroke> | undefined;
  let preview: ReturnType<typeof prepareCylinderStencil> | undefined;
  let terrain: ReturnType<typeof createCylindricalTerrain> | undefined;
  const fail = (e: unknown) => { const stats = stroke?.statistics; stroke?.cancel(); preview?.job.cancel(); stroke = undefined; preview = undefined; terrain = undefined; waiting = false; send({ type: 'error', task, message: String(e), stats, stages: paintingMetrics() }); };
  const kick = () => { if (!queued && !waiting && (stroke || preview)) { queued = true; schedule(tick); } };
  function tick() {
    queued = false;
    try {
      const at = performance.now(); let calls = 0;
      while (!waiting && calls++ < 64 && performance.now() - at < 6) {
        if (preview) {
          paintingStage('footprintPreparation', () => preview!.job.pump(16));
          if (preview.job.status === 'ready') {
            const job = preview.job, changes = [...job.preparedChanges(terrain!)];
            const stencil = preview.finish();
            send({ type: 'prepared', task, sequence: ++sequence, sourceRevision: canonicalRevision, center: stencil.center, settings: stencil.settings, indices: stencil.indices, before: Float32Array.from(changes, c => c.before), after: Float32Array.from(changes, c => c.after), affectedSamples: stencil.affectedSamples, previewStages: paintingMetrics() });
            preview = undefined; terrain = undefined; send({ type: 'done', task, stages: paintingMetrics() }); break;
          }
        } else if (stroke) {
          stroke.pump(16);
          if (waiting) break;
          if (stroke.status === 'complete') { send({ type: 'done', task, stats: stroke.statistics, stages: paintingMetrics() }); stroke = undefined; terrain = undefined; break; }
          if (!stroke.statistics.hasPendingWork) break;
        } else break;
      }
      if (stroke && !waiting) { send({ type: 'progress', task, stats: stroke.statistics }); if (stroke.statistics.hasPendingWork) kick(); }
      else if (preview) kick();
    } catch (e) { fail(e); }
  }
  return {
    receive(m: CylinderWorkInput) {
      try {
        if (m.type === 'start') {
          if (stroke || preview) throw new Error('Cylinder worker already owns an active task.');
          task = m.task; sequence = 0; canonicalRevision = m.revision; waiting = false; acknowledged = false; resetPaintingMetrics(m.measure === true);
          const snapshotAt = performance.now();
          terrain = createCylindricalTerrain({ terrainId: m.metadata.terrainId, geometry: m.metadata.geometry, resolution: m.metadata.representation.resolution });
          if (m.values.length !== terrain.sampleCount) throw new Error('Invalid preparation snapshot length.');
          for (const key of terrain.samples()) terrain.write(key, m.values[key.index]!);
          m.values = new Float32Array(0); // Release the transport copy immediately.
          recordPaintingStage('snapshotLoad', performance.now() - snapshotAt);
          if (m.preview) preview = prepareCylinderStencil(terrain, m.center, m.settings, m.preview);
          else {
            // No history allocation or publication in this realm. This operation
            // only advances the scratch epoch after the host has committed it.
            const scratch = { beginOperation: () => ({ synchronized() {}, commitDab: (job: ReturnType<typeof prepareCylindricalDab>) => paintingStage('scratchAcknowledgement', () => job.commit()), finish() {} }) } as unknown as CylindricalHistory;
            stroke = beginCylindricalStroke(terrain, scratch, m.center, m.settings, { ...m.options, commitReady: job => {
              if (acknowledged) { acknowledged = false; return true; }
              const changes = [...job.preparedChanges(terrain!)];
              waiting = true; expectedWrites = changes.length;
              send({ type: 'prepared', task, sequence: ++sequence, sourceRevision: canonicalRevision, center: job.center, settings: job.settings, indices: Uint32Array.from(changes, c => c.index), before: Float32Array.from(changes, c => c.before), after: Float32Array.from(changes, c => c.after), affectedSamples: job.statistics.affectedSamples, stats: stroke!.statistics, dabStatistics: job.statistics });
              return false;
            } });
          }
          kick(); return;
        }
        if (m.task !== task || !stroke) return;
        if (m.type === 'move') {
          if (m.ordinal !== stroke.statistics.acceptedPositions + 1) throw new Error('Out-of-order cylinder input.');
          stroke.move(m.point);
        } else if (m.type === 'release') stroke.release();
        else if (m.type === 'ack') {
          if (!waiting || m.sequence !== sequence || m.revision !== canonicalRevision + expectedWrites) throw new Error('Invalid cylinder acknowledgement.');
          canonicalRevision = m.revision; waiting = false; acknowledged = true;
        }
        kick();
      } catch (e) { fail(e); }
    },
  };
}
