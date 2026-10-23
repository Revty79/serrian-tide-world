import type {ConnectedWorkerTerrain} from './connected-worker-stroke.ts';
import type {ConnectedHistory} from './connected-history.ts';
import type {ConnectedWorkerInput,ConnectedWorkOutput} from './connected-work-protocol.ts';
import type {ConnectedStrokeOptions,beginConnectedStroke} from '../terrain/connected-stroke.ts';
import type {prepareConnectedDab,CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {ConnectedStencil} from './connected-session-contracts.ts';
import {paintingMetrics,resetPaintingMetrics,paintingStage,recordPaintingStage} from './painting-metrics.ts';
export interface ConnectedRuntimeAdapter<T extends ConnectedWorkerTerrain,Metadata,View>{
 create(metadata:Metadata):T;
 createFromSnapshot?(metadata:Metadata,values:Float32Array):T;
 begin(terrain:T,history:ConnectedHistory<T>,first:SurfacePosition,settings:CylindricalBrushSettings,options:ConnectedStrokeOptions<T>):ReturnType<typeof beginConnectedStroke<T>>;
 preview(terrain:T,center:SurfacePosition,settings:CylindricalBrushSettings,view:View):{readonly job:ReturnType<typeof prepareConnectedDab<T>>;finish():ConnectedStencil};
}
/** One short-lived source epoch, one proposal in flight. This copy cannot publish
 * terrain. It advances ONLY after the canonical host acknowledges the exact dab. */
export function createConnectedWorkRuntime<T extends ConnectedWorkerTerrain,Metadata,View>(send:(message:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void,adapter:ConnectedRuntimeAdapter<T,Metadata,View>) {
  let task = -1, sequence = 0, canonicalRevision = 0, expectedWrites = 0, queued = false, waiting = false, acknowledged = false;
  let stroke: ReturnType<ConnectedRuntimeAdapter<T,Metadata,View>['begin']> | undefined;
  let preview: ReturnType<ConnectedRuntimeAdapter<T,Metadata,View>['preview']> | undefined;
  let terrain: T | undefined;
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
    receive(m: ConnectedWorkerInput<Metadata,ConnectedStrokeOptions<T>,View>) {
      try {
        if (m.type === 'start') {
          if (stroke || preview) throw new Error('Cylinder worker already owns an active task.');
          task = m.task; sequence = 0; canonicalRevision = m.revision; waiting = false; acknowledged = false; resetPaintingMetrics(m.measure === true);
          const snapshotAt = performance.now();
          terrain = adapter.createFromSnapshot?adapter.createFromSnapshot(m.metadata,m.values):adapter.create(m.metadata);
          if (m.values.length !== terrain.sampleCount) throw new Error('Invalid preparation snapshot length.');
          if(!adapter.createFromSnapshot)for (const key of terrain.samples()) terrain.write(key, m.values[key.index]!);
          m.values = new Float32Array(0); // Release the transport copy immediately.
          recordPaintingStage('snapshotLoad', performance.now() - snapshotAt);
          if (m.preview) preview = adapter.preview(terrain, m.center, m.settings, m.preview);
          else {
            // No history allocation or publication in this realm. This operation
            // only advances the scratch epoch after the host has committed it.
            const scratch = { beginOperation: () => ({ synchronized() {}, commitDab: (job: ReturnType<typeof prepareConnectedDab<T>>) => paintingStage('scratchAcknowledgement', () => job.commit()), finish() {} }) } as unknown as ConnectedHistory<T>;
            stroke = adapter.begin(terrain, scratch, m.center, m.settings, { ...m.options, commitReady: job => {
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
