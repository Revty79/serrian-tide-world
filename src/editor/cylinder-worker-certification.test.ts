import test from 'node:test';
import assert from 'node:assert/strict';
import { createCylinderWorkRuntime } from './cylinder-work-runtime.ts';
import { beginWorkerCylinderStroke } from './cylinder-worker-stroke.ts';
import { createCylinderPreviewTerrain } from './cylinder-preview-session.ts';
import { createCylindricalHistory } from './cylindrical-history.ts';
import { beginCylindricalStroke } from '../terrain/cylindrical-stroke.ts';
import { CYLINDER_PREVIEW_DAB_LIMITS } from '../rendering/cylindrical-raster.ts';
import type { CylinderWorkInput, CylinderWorkOutput } from './cylinder-work-protocol.ts';

test('cancellation immediately after canonical publication retains exact committed-dab certification totals', async () => {
  const t = createCylinderPreviewTerrain(128), ref = createCylinderPreviewTerrain(128), settings = { version: 1 as const, tool: 'raise' as const, radiusMeters: 83700, strengthMeters: 237 };
  const options = { spacingMeters: settings.radiusMeters * .2371, dabLimits: CYLINDER_PREVIEW_DAB_LIMITS, maxDabs: 2048 };
  const point = (terrain: typeof t) => ({ ...terrain.metadata.identity, patchId: 'side', u: .013, v: 43700 });
  const reference = beginCylindricalStroke(ref, createCylindricalHistory(ref), point(ref), settings, options);
  reference.release(); while (reference.status === 'draining') reference.pump(16);
  let dead = false;
  const port = { onmessage: undefined as ((e: { data: CylinderWorkOutput }) => void) | undefined, terminate() { dead = true; }, postMessage(m: CylinderWorkInput) { setImmediate(() => { if (!dead) runtime.receive(m); }); } };
  const runtime = createCylinderWorkRuntime(m => setImmediate(() => { if (!dead) port.onmessage?.({ data: m }); }), fn => setImmediate(() => { if (!dead) fn(); }));
  let stroke: ReturnType<typeof beginWorkerCylinderStroke>;
  stroke = beginWorkerCylinderStroke(t, createCylindricalHistory(t), point(t), settings, options, () => { if (stroke?.diagnostics.proposals === 1 && stroke.status === 'drawing') stroke.cancel(); }, () => port as unknown as Worker);
  for (let i = 0; stroke.status === 'drawing'; i++) { assert.ok(i < 10000); await new Promise<void>(r => setImmediate(r)); }
  assert.equal(stroke.status, 'cancelled');
  assert.deepEqual(new Uint32Array(t.copyElevations().buffer), new Uint32Array(ref.copyElevations().buffer));
  for (const name of ['committedDabs', 'writes', 'sumPreRoundElevationErrorMeters', 'maxPreRoundElevationErrorMeters', 'maxFalloffError', 'peakPreparedDabBytes'] as const) assert.equal(stroke.statistics[name], reference.statistics[name], name);
});
