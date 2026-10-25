import type { SphericalBrushSettings } from '../terrain/spherical-brush.ts';
import { FLOAT32_MAX } from '../terrain/brush-math.ts';
import {DEFAULT_ADDITIVE_STRENGTH_METERS} from './brush-defaults.ts';

export interface SphericalControlState { tool: 'navigate' | SphericalBrushSettings['tool']; radius: string; strength: string; intensity: string; target: string; edgeAssist: boolean; limbAssist: boolean }
export const defaultSphericalControls = (radius: number): SphericalControlState => ({ tool: 'raise', radius: String(radius * .08), strength: String(DEFAULT_ADDITIVE_STRENGTH_METERS), intensity: '50', target: '0', edgeAssist: true, limbAssist: true });
export function sphericalBrushFromControls(controls: SphericalControlState, sphereRadius: number): SphericalBrushSettings | undefined {
  if (controls.tool === 'navigate' || !controls.radius.trim()) return;
  const radiusMeters = Number(controls.radius), strengthMeters = Number(controls.strength), intensity = Number(controls.intensity) / 100, targetElevation = Number(controls.target);
  if (!Number.isFinite(radiusMeters) || radiusMeters < sphereRadius * .005 || radiusMeters > sphereRadius * .2 || radiusMeters / 4 === 0) return;
  if (controls.tool === 'raise' || controls.tool === 'lower') return controls.strength.trim() && Number.isFinite(strengthMeters) && strengthMeters > 0 && strengthMeters <= FLOAT32_MAX && Math.fround(strengthMeters) > 0 ? { tool: controls.tool, radiusMeters, strengthMeters } : undefined;
  if (!controls.intensity.trim() || !Number.isFinite(intensity) || intensity < 0 || intensity > 1) return;
  if (controls.tool === 'smooth') return { tool: 'smooth', radiusMeters, intensity };
  return controls.target.trim() && Number.isFinite(targetElevation) && Math.abs(targetElevation) <= FLOAT32_MAX ? { tool: 'flatten', radiusMeters, intensity, targetElevation } : undefined;
}
