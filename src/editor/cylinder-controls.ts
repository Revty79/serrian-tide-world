import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import { FLOAT32_MAX } from '../terrain/brush-math.ts';
export interface CylinderControls { readonly tool: 'navigate' | CylindricalBrushSettings['tool']; readonly radius: string; readonly strength: string; readonly intensity: string; readonly target: string }
export const CYLINDER_UI_SPACING_RATIO = .2371;
export const defaultCylinderControls = (radius: number): CylinderControls => ({ tool: 'raise', radius: String(radius * .0837), strength: '200', intensity: '50', target: '0' });
export function cylinderBrushFromControls(c: CylinderControls, radius: number): CylindricalBrushSettings | undefined {
  const r = Number(c.radius), strength = Number(c.strength), intensity = Number(c.intensity) / 100, target = Number(c.target);
  if (c.tool === 'navigate' || !c.radius.trim() || !Number.isFinite(r) || r < .005 * radius || r > 2 * radius) return;
  if (c.tool === 'raise' || c.tool === 'lower') return c.strength.trim() && Number.isFinite(strength) && strength > 0 && strength <= FLOAT32_MAX && Math.fround(strength) > 0 ? { version: 1, tool: c.tool, radiusMeters: r, strengthMeters: strength } : undefined;
  if (!c.intensity.trim() || !Number.isFinite(intensity) || intensity < 0 || intensity > 1) return;
  if (c.tool === 'smooth') return { version: 1, tool: 'smooth', radiusMeters: r, intensity };
  if (c.tool !== 'flatten') return;
  return c.target.trim() && Number.isFinite(target) && Math.abs(target) <= FLOAT32_MAX ? { version: 1, tool: 'flatten', radiusMeters: r, intensity, targetElevation: target } : undefined;
}
