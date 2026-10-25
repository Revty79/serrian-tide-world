'use client';
import {sphericalBrushFromControls,type SphericalControlState} from '../editor/spherical-controls.ts';
export {defaultSphericalControls,sphericalBrushFromControls,type SphericalControlState} from '../editor/spherical-controls.ts';
export function SphericalBrushControls({ value, radius, onChange, folded=false }: { value: SphericalControlState; radius: number; onChange(value: SphericalControlState): void;folded?:boolean }) {
  return <div className="spherical-brush-controls">
    <h2>Physical brush</h2>
    <label> Spherical brush radius (m)<input type="number" min={radius * .005} max={radius * .2} step="any" value={value.radius} onChange={(e) => onChange({ ...value, radius: e.target.value })} /></label>
    <p>Development radius range: {(radius * .005).toLocaleString()}–{(radius * .2).toLocaleString()} m. {folded?'Measured along the connected retained and concave surface.':'Measured along the reference sphere.'}</p>
    {(value.tool === 'raise' || value.tool === 'lower') && <label>Spherical strength (m/dab)<input type="number" min="0" step="any" value={value.strength} onChange={(e) => onChange({ ...value, strength: e.target.value })} /></label>}
    {(value.tool === 'smooth' || value.tool === 'flatten') && <label>Spherical intensity (%)<input type="number" min="0" max="100" step="any" value={value.intensity} onChange={(e) => onChange({ ...value, intensity: e.target.value })} /></label>}
    {value.tool === 'flatten' && <label>Spherical target elevation (m)<input type="number" step="any" value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value })} /></label>}
    <label><input type="checkbox" checked={value.edgeAssist} onChange={(e) => onChange({ ...value, edgeAssist: e.target.checked })} /> Assist drawing at net screen edges</label>
    {!folded&&<label><input type="checkbox" checked={value.limbAssist} onChange={(e) => onChange({ ...value, limbAssist: e.target.checked })} /> Assist drawing near the globe limb</label>}
    {!folded&&<p>Hold a brush near the globe's circular edge briefly to reveal adjoining terrain in the same stroke. Rotation waits for pending brush work. Outside the globe, drawing stops. Net assistance follows displayed joins; gaps and disconnected cuts end a stroke.</p>}
    {value.tool !== 'navigate' && !sphericalBrushFromControls(value, radius) && <p role="alert">Enter valid physical brush settings before drawing.</p>}
  </div>;
}
