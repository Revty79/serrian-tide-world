import { paintingStage } from '../editor/painting-metrics.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import { reconstructCylinderPath, type CylinderPathOptions, type CylinderPhysicalPath } from '../surfaces/cylinder-path.ts';
import { cylinderPathSpacings } from '../surfaces/cylinder-path-spacing.ts';
import type { CylindricalHistory, CylinderStrokeTermination } from '../editor/cylindrical-history.ts';
import { prepareCylindricalDab, CYLINDER_DAB_LIMITS, type CylindricalBrushSettings, type CylinderDabLimits } from './cylindrical-brush.ts';
import type { CylindricalTerrain } from './cylindrical.ts';

export const CYLINDER_STROKE_LIMITS = Object.freeze({ maxPendingPositions: 256, maxAcceptedPositions: 65536, maxDabs: 16384, maxTotalDistanceQueries: 262144, maxTotalDistanceBoxes: 1048576, maxTotalCandidates: 1048576, maxTotalPathBoxes: 262144 });
type StrokeBudgetOptions = { readonly [K in keyof typeof CYLINDER_STROKE_LIMITS]?: number };
export interface CylinderStrokeOptions extends StrokeBudgetOptions {
  /** Optional execution barrier. The ready dab and all path residuals stay put
   * until its host acknowledges preparation. Does not change numerical work. */
  readonly commitReady?: (job: ReturnType<typeof prepareCylindricalDab>) => boolean;
  readonly spacingMeters?: number;
  readonly maxSpacingErrorMeters?: number;
  readonly localTransitionMeters?: number;
  readonly pathToleranceMeters?: number;
  readonly pathMaxBoxes?: number;
  readonly initialDirection?: CylinderPathOptions['continuity'];
  readonly dabLimits?: CylinderDabLimits;
}
export type CylinderStrokeStatus = 'drawing' | 'draining' | 'complete' | 'cancelled' | 'failed' | 'disposed';
export type CylinderTransitionIntent = 'local' | 'shortest-surface';

/** One numerical gesture. Accepted points are ordered; pump performs at most one path/task/dab commit. */
export function beginCylindricalStroke(terrain: CylindricalTerrain, history: CylindricalHistory, first: SurfacePosition, inputSettings: CylindricalBrushSettings, input: CylinderStrokeOptions = {}) {
  const limits = Object.freeze(Object.fromEntries(Object.entries(CYLINDER_STROKE_LIMITS).map(([name, maximum]) => {
    const value = input[name as keyof typeof CYLINDER_STROKE_LIMITS] ?? maximum;
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new RangeError('Cylinder stroke limits may only lower hard budgets.');
    return [name, value];
  })) as Record<keyof typeof CYLINDER_STROKE_LIMITS, number>);
  const dabLimits = Object.freeze({ ...input.dabLimits });
  const boundedDabLimits = (queries: number, boxes: number, candidates: number): CylinderDabLimits => {
    const q = limits.maxTotalDistanceQueries - queries, b = limits.maxTotalDistanceBoxes - boxes, c = limits.maxTotalCandidates - candidates;
    if (q < 1 || b < 1 || c < 1) throw new RangeError('Cylinder aggregate dab work budget exhausted.');
    return { ...dabLimits, maxDistanceQueries: Math.min(dabLimits.maxDistanceQueries ?? CYLINDER_DAB_LIMITS.maxDistanceQueries, q), maxDistanceBoxes: Math.min(dabLimits.maxDistanceBoxes ?? CYLINDER_DAB_LIMITS.maxDistanceBoxes, b), maxCandidates: Math.min(dabLimits.maxCandidates ?? CYLINDER_DAB_LIMITS.maxCandidates, c) };
  };
  const initial = prepareCylindricalDab(terrain, first, inputSettings, boundedDabLimits(0, 0, 0)), settings = initial.settings;
  const spacing = input.spacingMeters ?? settings.radiusMeters / 4, maxError = input.maxSpacingErrorMeters ?? spacing / 64;
  const localLimit = input.localTransitionMeters ?? Math.min(settings.radiusMeters * 4, Math.PI * terrain.metadata.geometry.radiusMeters / 4);
  const pathMaxBoxes = input.pathMaxBoxes ?? 32768, pathTolerance = input.pathToleranceMeters;
  if (![spacing, maxError, localLimit].every(v => Number.isFinite(v) && v > 0) || maxError >= spacing / 4 || !Number.isInteger(pathMaxBoxes) || pathMaxBoxes < 1 || pathMaxBoxes > 32768 || pathTolerance !== undefined && (!Number.isFinite(pathTolerance) || pathTolerance <= 0)) throw new RangeError('Invalid cylinder physical spacing, transition, precision or path budget.');
  let direction = input.initialDirection;
  if (direction) { const p = reconstructCylinderPath(terrain.geometry, first, first, { version: 1, continuity: direction }); direction = Object.freeze({ patchId: direction.patchId, direction: Object.freeze([...direction.direction]) as typeof direction.direction }); void p; }
  const operation = history.beginOperation(terrain);
  const queue: ({ point: SurfacePosition; intent: CylinderTransitionIntent } | undefined)[] = new Array(limits.maxPendingPositions);
  let head = 0, queued = 0, previous: SurfacePosition = initial.center, path: CylinderPhysicalPath | undefined, sampler: ReturnType<typeof cylinderPathSpacings> | undefined;
  let job: ReturnType<typeof prepareCylindricalDab> | undefined = initial, residual = 0, spacingError = 0, status: CylinderStrokeStatus = 'drawing';
  let failure: Readonly<{ name: string; message: string }> | undefined;
  const stats = { pumps: 0, acceptedPositions: 1, processedPositions: 0, discardedPositions: 0, paths: 0, pathBoxes: 0, failedPathBoxAllowance: 0, committedDabs: 0, writes: 0, distanceQueries: 0, distanceBoxes: 0, failedQueryBoxAllowance: 0, dabCandidates: 0, peakPreparedDabBytes: 0, sumPreRoundElevationErrorMeters: 0, maxPreRoundElevationErrorMeters: 0, maxFalloffError: 0, peakPendingPositions: 0, maximumPathPieces: 0, traveledMeters: 0 };
  let lastCommittedCenter: SurfacePosition | undefined;
  const account = () => { if (job) { const s = job.statistics; stats.distanceQueries += s.distanceQueries; stats.distanceBoxes += s.distanceBoxes; stats.failedQueryBoxAllowance += s.failedQueryBoxAllowance; stats.dabCandidates += s.candidates; stats.peakPreparedDabBytes = Math.max(stats.peakPreparedDabBytes, s.peakPreparedBytes); stats.maxPreRoundElevationErrorMeters = Math.max(stats.maxPreRoundElevationErrorMeters, s.maxPreRoundElevationErrorMeters); stats.maxFalloffError = Math.max(stats.maxFalloffError, s.maxFalloffError); if (job.status === 'committed') stats.sumPreRoundElevationErrorMeters += s.maxPreRoundElevationErrorMeters; } };
  const finish = (reason: CylinderStrokeTermination) => {
    if (job) { account(); job.cancel(); job = undefined; }
    if (sampler) { try { sampler.return(); } catch (error) { failure ??= Object.freeze({ name: 'SpacingCancellationError', message: String(error) }); } sampler = undefined; }
    path = undefined; for (let i = 0; i < queue.length; i++) queue[i] = undefined; queued = 0;
    stats.discardedPositions = stats.acceptedPositions - stats.processedPositions;
    operation.finish(reason);
    status = reason === 'released' ? 'complete' : reason;
  };
  const fail = (error: unknown): never => {
    failure = Object.freeze({ name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) });
    finish('failed'); throw error;
  };
  const completeIfDrained = () => { if (status === 'draining' && !job && !sampler && queued === 0) finish('released'); };
  return Object.freeze({
    settings, spacingMeters: spacing, limits, history,
    get status(): CylinderStrokeStatus { return status; }, get failure() { return failure; },
    get statistics() { const pending = job?.statistics; return Object.freeze({ ...stats, hasPendingWork: Boolean(job || sampler || queued), pendingPositions: queued, residualMeters: residual, spacingErrorBoundMeters: spacingError, lastCommittedCenter, distanceQueries: stats.distanceQueries + (pending?.distanceQueries ?? 0), distanceBoxes: stats.distanceBoxes + (pending?.distanceBoxes ?? 0), dabCandidates: stats.dabCandidates + (pending?.candidates ?? 0) }); },
    move(point: SurfacePosition, intent: CylinderTransitionIntent = 'local') {
      if (status !== 'drawing') throw new Error('Cylinder stroke is no longer accepting input.');
      try {
        operation.synchronized();
        if (!['local', 'shortest-surface'].includes(intent)) throw new RangeError('Unknown cylinder transition intent.');
        const normalized = Object.freeze(terrain.geometry.normalize(point));
        if (queued >= limits.maxPendingPositions || stats.acceptedPositions >= limits.maxAcceptedPositions) throw new RangeError('Cylinder accepted-input queue/count budget exhausted.');
        queue[(head + queued) % queue.length] = { point: normalized, intent }; queued++; stats.acceptedPositions++;
        stats.peakPendingPositions = Math.max(stats.peakPendingPositions, queued);
      } catch (error) { fail(error); }
    },
    release() { if (status === 'drawing') { try { operation.synchronized(); status = 'draining'; completeIfDrained(); } catch (error) { fail(error); } } return status; },
    cancel() { if (status === 'drawing' || status === 'draining') finish('cancelled'); return status; },
    dispose() { if (status === 'drawing' || status === 'draining') finish('disposed'); status = 'disposed'; },
    pump(candidateSteps = 64): CylinderStrokeStatus {
      if (!Number.isInteger(candidateSteps) || candidateSteps < 1 || candidateSteps > 512) throw new RangeError('Cylinder stroke pump requires 1-512 candidate steps.');
      if (status !== 'drawing' && status !== 'draining') return status;
      try {
        operation.synchronized(); stats.pumps++;
        if (job) {
          if (job.status === 'preparing') paintingStage('dabPreparation', () => job!.pump(candidateSteps));
          if (job.status === 'ready') {
            if (stats.committedDabs >= limits.maxDabs) throw new RangeError('Cylinder stroke dab budget exhausted.');
            if (input.commitReady && !input.commitReady(job)) return status;
            const writes = operation.commitDab(job); account(); lastCommittedCenter = job.center; job = undefined; stats.committedDabs++; stats.writes += writes;
            if (stats.processedPositions === 0) stats.processedPositions = 1;
          }
        } else if (sampler) {
          const next = paintingStage('spacing', () => sampler!.next());
          if (!next.done) job = prepareCylindricalDab(terrain, next.value.position, settings, boundedDabLimits(stats.distanceQueries, stats.distanceBoxes + stats.failedQueryBoxAllowance, stats.dabCandidates));
          else {
            residual = next.value.residualMeters; spacingError = next.value.roundoffBoundMeters;
            const end = path!.atDistance(path!.lengthMeters, 'incoming');
            if (end.tangent && end.oneSidedPatchId) direction = Object.freeze({ patchId: end.oneSidedPatchId, direction: end.tangent });
            previous = path!.end; stats.traveledMeters += path!.lengthMeters; stats.processedPositions++; path = undefined; sampler = undefined;
          }
        } else if (queued) {
          const input = queue[head]!;
          const remainingPathBoxes = Math.min(pathMaxBoxes, limits.maxTotalPathBoxes - stats.pathBoxes);
          if (remainingPathBoxes < 1) throw new RangeError('Cylinder aggregate path work budget exhausted.');
          stats.failedPathBoxAllowance = remainingPathBoxes;
          const nextPath = reconstructCylinderPath(terrain.geometry, previous, input.point, { version: 1, continuity: direction, absoluteToleranceMeters: pathTolerance, maxBoxes: remainingPathBoxes });
          stats.failedPathBoxAllowance = 0; stats.pathBoxes += nextPath.distance.evaluatedBoxes;
          if (!Number.isFinite(stats.traveledMeters + nextPath.lengthMeters)) throw new RangeError('Cylinder traveled-distance accumulator is unrepresentable.');
          if (input.intent === 'local' && nextPath.lengthUpperBoundMeters > localLimit) throw new RangeError('Cylinder input jump requires intermediate physical points or explicit shortest-surface intent.');
          const nextSampler = cylinderPathSpacings(nextPath, { spacingMeters: spacing, residualMeters: residual, residualErrorBoundMeters: spacingError + nextPath.lengthErrorBoundMeters, maxPoints: Math.max(1, limits.maxDabs - stats.committedDabs) });
          if (nextSampler.expectedPoints > limits.maxDabs - stats.committedDabs || nextSampler.roundoffBoundMeters > maxError) throw new RangeError('Cylinder stroke dab/accumulated-spacing-error budget exhausted.');
          path = nextPath; sampler = nextSampler; queue[head] = undefined; head = (head + 1) % queue.length; queued--; stats.paths++; stats.maximumPathPieces = Math.max(stats.maximumPathPieces, path.pieces.length);
        }
        completeIfDrained(); return status;
      } catch (error) { return fail(error); }
    },
  });
}
