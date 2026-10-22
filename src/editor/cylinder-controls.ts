import {PHYSICAL_UI_SPACING_RATIO} from './physical-brush-policy.ts';
import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import { FLOAT32_MAX } from '../terrain/brush-math.ts';
import {DEFAULT_ADDITIVE_STRENGTH_METERS} from './brush-defaults.ts';
export interface CylinderControls { readonly tool: 'navigate' | CylindricalBrushSettings['tool']; readonly radius: string; readonly strength: string; readonly intensity: string; readonly target: string }
export const CYLINDER_UI_SPACING_RATIO = PHYSICAL_UI_SPACING_RATIO;
export const defaultCylinderControls = (radius: number): CylinderControls => ({ tool: 'raise', radius: String(radius * .0837), strength: String(DEFAULT_ADDITIVE_STRENGTH_METERS), intensity: '50', target: '0' });
export function cylinderBrushFromControls(c: CylinderControls, radius: number): CylindricalBrushSettings | undefined {
  return physicalBrushFromControls(c,.005*radius,2*radius);
}
/** Same tool validation; each geometry supplies its proven radius domain. */
export function physicalBrushFromControls(c:CylinderControls,minRadius:number,maxRadius:number):CylindricalBrushSettings|undefined{
  const r = Number(c.radius), strength = Number(c.strength), intensity = Number(c.intensity) / 100, target = Number(c.target);
  if (c.tool === 'navigate' || !c.radius.trim() || !Number.isFinite(r) || r < minRadius || r > maxRadius) return;
  if (c.tool === 'raise' || c.tool === 'lower') return c.strength.trim() && Number.isFinite(strength) && strength > 0 && strength <= FLOAT32_MAX && Math.fround(strength) > 0 ? { version: 1, tool: c.tool, radiusMeters: r, strengthMeters: strength } : undefined;
  if (!c.intensity.trim() || !Number.isFinite(intensity) || intensity < 0 || intensity > 1) return;
  if (c.tool === 'smooth') return { version: 1, tool: 'smooth', radiusMeters: r, intensity };
  if (c.tool !== 'flatten') return;
  return c.target.trim() && Number.isFinite(target) && Math.abs(target) <= FLOAT32_MAX ? { version: 1, tool: 'flatten', radiusMeters: r, intensity, targetElevation: target } : undefined;
}
