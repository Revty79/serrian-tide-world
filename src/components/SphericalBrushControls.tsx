'use client';
import type { SphericalBrushSettings } from '../terrain/spherical-brush.ts';
import { FLOAT32_MAX } from '../terrain/brush-math.ts';

export interface SphericalControlState { tool: 'navigate' | SphericalBrushSettings['tool']; radius: string; strength: string; intensity: string; target: string; edgeAssist: boolean }
export const defaultSphericalControls = (radius: number): SphericalControlState => ({ tool: 'raise', radius: String(radius * .08), strength: '200', intensity: '50', target: '0', edgeAssist: true });
export function sphericalBrushFromControls(controls: SphericalControlState, sphereRadius: number): SphericalBrushSettings | undefined {
  if (controls.tool === 'navigate' || !controls.radius.trim()) return;
  const radiusMeters = Number(controls.radius), strengthMeters = Number(controls.strength), intensity = Number(controls.intensity) / 100, targetElevation = Number(controls.target);
  if (!Number.isFinite(radiusMeters) || radiusMeters < sphereRadius * .005 || radiusMeters > sphereRadius * .2 || radiusMeters / 4 === 0) return;
  if (controls.tool === 'raise' || controls.tool === 'lower') return controls.strength.trim() && Number.isFinite(strengthMeters) && strengthMeters > 0 && strengthMeters <= FLOAT32_MAX && Math.fround(strengthMeters) > 0 ? { tool: controls.tool, radiusMeters, strengthMeters } : undefined;
  if (!controls.intensity.trim() || !Number.isFinite(intensity) || intensity < 0 || intensity > 1) return;
  if (controls.tool === 'smooth') return { tool: 'smooth', radiusMeters, intensity };
  return controls.target.trim() && Number.isFinite(targetElevation) && Math.abs(targetElevation) <= FLOAT32_MAX ? { tool: 'flatten', radiusMeters, intensity, targetElevation } : undefined;
}
export function SphericalBrushControls({ value, radius, onChange }: { value: SphericalControlState; radius: number; onChange(value: SphericalControlState): void }) {
  return <div className="spherical-brush-controls">
    <h2>Physical brush</h2>
    <label> Spherical brush radius (m)<input type="number" min={radius * .005} max={radius * .2} step="any" value={value.radius} onChange={(e) => onChange({ ...value, radius: e.target.value })} /></label>
    <p>Development radius range: {(radius * .005).toLocaleString()}–{(radius * .2).toLocaleString()} m. Measured along the reference sphere.</p>
    {(value.tool === 'raise' || value.tool === 'lower') && <label>Spherical strength (m/dab)<input type="number" min="0" step="any" value={value.strength} onChange={(e) => onChange({ ...value, strength: e.target.value })} /></label>}
    {(value.tool === 'smooth' || value.tool === 'flatten') && <label>Spherical intensity (%)<input type="number" min="0" max="100" step="any" value={value.intensity} onChange={(e) => onChange({ ...value, intensity: e.target.value })} /></label>}
    {value.tool === 'flatten' && <label>Spherical target elevation (m)<input type="number" step="any" value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value })} /></label>}
    <label><input type="checkbox" checked={value.edgeAssist} onChange={(e) => onChange({ ...value, edgeAssist: e.target.checked })} /> Assist drawing at net screen edges</label>
    <p>Net assistance pans only through displayed joins. Gaps and disconnected cuts end a stroke. At a globe limb, lift and rotate/recenter; automatic globe rotation while painting is not enabled.</p>
    {value.tool !== 'navigate' && !sphericalBrushFromControls(value, radius) && <p role="alert">Enter valid physical brush settings before drawing.</p>}
  </div>;
}
