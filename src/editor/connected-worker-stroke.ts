import {CYLINDER_STROKE_LIMITS,type CylinderStrokeStatus,type ConnectedStrokeOptions,type ConnectedStrokeStatistics, type beginConnectedStroke} from '../terrain/connected-stroke.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory,ConnectedCommitJob} from './connected-history.ts';
import type {ConnectedSessionTerrain} from './connected-session-contracts.ts';
import type {ConnectedPreparedPatch,ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import {OrderedSurfaceInput,RevisionLease,SurfaceProgressSignal} from './surface-work.ts';
import {paintingStage,paintingMetricsEnabled} from './painting-metrics.ts';
export interface ConnectedWorkerTerrain extends ConnectedSessionTerrain {readonly geometry:{normalize(p:SurfacePosition):SurfacePosition};readonly metadata:ConnectedSessionTerrain['metadata'];write(key:{readonly index:number},value:number):unknown}
export interface ConnectedWorkerAdapter<T extends ConnectedWorkerTerrain>{begin(terrain:T,history:ConnectedHistory<T>,first:SurfacePosition,settings:CylindricalBrushSettings,options:ConnectedStrokeOptions<T>):ReturnType<typeof beginConnectedStroke<T>>;preparedPatch(terrain:T,prepared:ConnectedPreparedPatch):ConnectedCommitJob<T>}
/** Accepted cylinder worker transport: ordered input, one leased proposal,
 * canonical acknowledgement, exact history and pre-publication fallback. */
let nextTask = 0;
export function beginConnectedWorkerStroke<T extends ConnectedWorkerTerrain>(terrain:T, history:ConnectedHistory<T>, first:SurfacePosition, settings:CylindricalBrushSettings, options:ConnectedStrokeOptions<T>, changed:()=>void, adapter:ConnectedWorkerAdapter<T>, factory:()=>Worker) {
  const task = ++nextTask, lease = new RevisionLease(task, terrain.revision), input = new OrderedSurfaceInput(options.maxPendingPositions ?? CYLINDER_STROKE_LIMITS.maxPendingPositions, options.maxAcceptedPositions ?? CYLINDER_STROKE_LIMITS.maxAcceptedPositions);
  const operation = history.beginOperation(terrain);
  const signal = new SurfaceProgressSignal();
  const notify = () => { signal.notify(); changed(); };
  let worker: Worker | undefined, status: CylinderStrokeStatus = 'drawing', lastSequence = 0, closed = false;
  let local: ReturnType<ConnectedWorkerAdapter<T>['begin']> | undefined;
  let stats: ConnectedStrokeStatistics | undefined, failure: { name: string; message: string } | undefined;
  const queued: SurfacePosition[] = [];
  const diagnostics = { backend: 'worker', fallbackReason: '', startupMs: 0, proposals: 0, staleResults: 0, mainCommitMaxMs: 0, stages: {} as object };
  const at = performance.now();
  const cleanup = () => { clearTimeout(timeout); worker?.terminate(); worker = undefined; lease.cancel(); queued.length = 0; };
  const end = (reason: 'released' | 'cancelled' | 'failed' | 'disposed') => { if (closed) return; closed = true; status = reason === 'released' ? 'complete' : reason; operation.finish(reason); cleanup(); notify(); };
  const fail = (e: unknown) => { failure = { name: 'CylinderPreparationError', message: String(e) }; end('failed'); };
  const send = (m: ConnectedWorkerInput<T['metadata'],ConnectedStrokeOptions<T>>) => worker!.postMessage(m);
  // Failure before the first proposal can replay all accepted input into the
  // unchanged cooperative engine. No canonical dab has been committed yet.
  const fallback = (e: unknown) => {
    if (closed) return;
    if (lastSequence || terrain.revision !== initialRevision) { fail(e); return; }
    clearTimeout(timeout); worker?.terminate(); worker = undefined; diagnostics.backend = 'cooperative fallback'; diagnostics.fallbackReason = String(e);
    try {
      local = adapter.begin(terrain, { ...history, beginOperation: () => operation }, first, settings, options);
      for (const p of queued) local.move(p); queued.length = 0;
      if (status === 'draining') local.release(); notify();
    } catch (error) { fail(error); }
  };
  const initialRevision = terrain.revision;
  const timeout = setTimeout(() => fallback('Cylinder worker startup timed out.'), 10000);
  try {
    worker = factory();
    worker.onerror = e => { e.preventDefault(); fallback(e.message || 'Cylinder worker failed.'); };
    worker.onmessageerror = () => fallback('Cylinder worker response could not be decoded.');
    worker.onmessage = (event: MessageEvent<ConnectedWorkOutput>) => {
      const m = event.data;
      if (closed || local || m.task !== task) { diagnostics.staleResults++; return; }
      clearTimeout(timeout); diagnostics.startupMs ||= performance.now() - at;
      try {
        if (m.stats) { stats = m.stats; input.progress(stats.processedPositions); }
        if (m.type === 'prepared') {
          if (!m.stats || !m.dabStatistics || m.sequence !== lastSequence + 1) throw new Error('Out-of-order cylinder proposal or missing numerical certificate.');
          const certificate = m.dabStatistics;
          if (certificate.affectedSamples !== m.affectedSamples || ![certificate.maxPreRoundElevationErrorMeters, certificate.maxFalloffError, certificate.peakPreparedBytes].every(v => Number.isFinite(v) && v >= 0)) throw new Error('Invalid cylinder numerical certificate.');
          lease.validate(m.task, m.sourceRevision, terrain.revision); operation.synchronized();
          const started = performance.now();
          const writes = paintingStage('historyCheckpointDisplayHandoff', () => operation.commitDab(adapter.preparedPatch(terrain, m)));
          stats = { ...m.stats, committedDabs: m.stats.committedDabs + 1, writes: m.stats.writes + writes, processedPositions: Math.max(1, m.stats.processedPositions), lastCommittedCenter: m.center,
            sumPreRoundElevationErrorMeters: m.stats.sumPreRoundElevationErrorMeters + certificate.maxPreRoundElevationErrorMeters,
            maxPreRoundElevationErrorMeters: Math.max(m.stats.maxPreRoundElevationErrorMeters, certificate.maxPreRoundElevationErrorMeters),
            maxFalloffError: Math.max(m.stats.maxFalloffError, certificate.maxFalloffError),
            peakPreparedDabBytes: Math.max(m.stats.peakPreparedDabBytes, certificate.peakPreparedBytes) };
          input.progress(stats.processedPositions);
          diagnostics.mainCommitMaxMs = Math.max(diagnostics.mainCommitMaxMs, performance.now() - started);
          lastSequence = m.sequence; diagnostics.proposals++; lease.acknowledged(terrain.revision);
          queued.length = 0;
          // The scratch epoch is immutable while waiting. It may apply this
          // identical patch only AFTER this canonical acknowledgement.
          send({ type: 'ack', task, sequence: m.sequence, revision: terrain.revision });
        } else if (m.type === 'done') { diagnostics.stages = m.stages; end('released'); }
        else if (m.type === 'error') { diagnostics.stages = m.stages; fail(m.message); }
        notify();
      } catch (e) { fail(e); }
    };
    const values = paintingStage('sourceSnapshot', () => terrain.copyElevations());
    paintingStage('workerDispatch', () => worker!.postMessage({ type: 'start', task, metadata: terrain.metadata, revision: terrain.revision, values, center: first, settings, options, measure: paintingMetricsEnabled() }, [values.buffer]));
  } catch (e) { fallback(e); }
  return {
    get status() { return local?.status ?? status; }, get failure() { return local?.failure ?? failure; }, diagnostics,
    get statistics(): ConnectedStrokeStatistics {
      if (local) return local.statistics;
      // Same diagnostic shape as the existing engine, with main-side accepted
      // accounting including positions still in the worker message channel.
      return { pumps: 0, paths: 0, pathBoxes: 0, failedPathBoxAllowance: 0, committedDabs: 0, writes: 0, distanceQueries: 0, distanceBoxes: 0, failedQueryBoxAllowance: 0, dabCandidates: 0, peakPreparedDabBytes: 0, sumPreRoundElevationErrorMeters: 0, maxPreRoundElevationErrorMeters: 0, maxFalloffError: 0, maximumPathPieces: 0, traveledMeters: 0, residualMeters: 0, spacingErrorBoundMeters: 0, lastCommittedCenter: undefined, ...stats, acceptedPositions: input.accepted, processedPositions: input.processed, discardedPositions: closed && status !== 'complete' ? input.accepted - input.processed : 0, pendingPositions: input.pending, peakPendingPositions: Math.max(input.peak, stats?.peakPendingPositions ?? 0), hasPendingWork: !closed && (status === 'draining' || input.processed < input.accepted) };
    },
    move(point: SurfacePosition) {
      if (local) return local.move(point);
      if (status !== 'drawing' || closed) throw new Error('Cylinder stroke is no longer accepting input.');
      try { operation.synchronized(); const p = terrain.geometry.normalize(point), ordinal = input.accept(); if (!lastSequence) queued.push(p); send({ type: 'move', task, point: p, ordinal }); }
      catch (e) { fail(e); throw e; }
    },
    release() { if (local) return local.release(); if (status === 'drawing' && !closed) { operation.synchronized(); status = 'draining'; send({ type: 'release', task }); notify(); } return status; },
    cancel() { if (local) return local.cancel(); end('cancelled'); return status; },
    pump(steps = 16) { if (local) return local.pump(steps); return status; },
    waitForProgress() { return closed ? Promise.resolve() : local ? new Promise<void>(r => setTimeout(r, 0)) : signal.wait(); },
  };
}
