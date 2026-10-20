// Read-only accepted-input recording in the normal Atlas document host.
import { current } from './sphere-standard-observer.ts';
import { SphericalSession } from '../../src/editor/spherical-session.ts';
import { createSphericalTerrain } from '../../src/terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings, type SphericalBrushVisibility } from '../../src/terrain/spherical-brush.ts';
import { dot3, type Vec3 } from '../../src/surfaces/cube-sphere.ts';
let source: Float32Array, first: Vec3, settings: SphericalBrushSettings, hemisphere: Vec3 | undefined;
let points: { direction: Vec3; visibility?: SphericalBrushVisibility }[] = [], recording = false;
const begin = SphericalSession.prototype.begin, move = SphericalSession.prototype.move;
SphericalSession.prototype.begin = function (d, s, h) { const accepted = begin.call(this, d, s, h); if (recording && accepted) { first = structuredClone(d); settings = { ...s }; hemisphere = h && structuredClone(h); } return accepted; };
SphericalSession.prototype.move = function (d, v) { if (recording && this.painting && !this.processing && !this.locked) points.push({ direction: structuredClone(d), visibility: v && structuredClone(v) }); move.call(this, d, v); };
export function record() { source = current().terrain.copyElevations(); points = []; recording = true; }
export function compare() {
  recording = false; const t = current().terrain, m = t.metadata;
  const reference = createSphericalTerrain({ terrainId: m.terrainId, identity: m.identity, radiusMeters: m.geometry.radiusMeters, cellsPerEdge: m.representation.cellsPerEdge });
  for (let i = 0; i < source.length; i++) reference.write(reference.keyAt(i), source[i]!);
  const stroke = startSphericalBrushStroke(reference, { ...m.identity, direction: first }, settings, undefined, hemisphere && { hemisphere });
  for (const point of points) stroke.moveTo({ ...m.identity, direction: point.direction }, point.visibility); stroke.end();
  const actual = new Uint32Array(t.copyElevations().buffer), expected = new Uint32Array(reference.copyElevations().buffer);
  const before = new Uint32Array(source.buffer); let newlyExposedChanged = 0;
  if (hemisphere) for (let i = 0; i < actual.length; i++) if (actual[i] !== before[i] && dot3(t.directionAt(t.keyAt(i)), hemisphere) < 0) newlyExposedChanged++;
  return { mismatches: actual.reduce((sum, word, i) => sum + (word !== expected[i] ? 1 : 0), 0), newlyExposedChanged, samples: actual.length, accepted: { first, settings, hemisphere, points }, statistics: stroke.statistics, work: current().workDiagnostics };
}
