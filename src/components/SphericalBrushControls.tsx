'use client';
import {type PhysicalSphericalBrushRange,sphericalBrushFromControls,type SphericalControlState} from '../editor/spherical-controls.ts';
export {defaultSphericalControls,sphericalBrushFromControls,type SphericalControlState} from '../editor/spherical-controls.ts';
export function SphericalBrushControls({ value, radius, onChange, folded=false,physical=false,radiusRange }: { value: SphericalControlState; radius: number; onChange(value: SphericalControlState): void;folded?:boolean;physical?:boolean;radiusRange?:PhysicalSphericalBrushRange }) {
  return <div className="spherical-brush-controls">
    <h2>Physical brush</h2>
    <label> {physical?'Physical brush radius (m)':'Spherical brush radius (m)'}<input type="number" min={radiusRange?.minimum??radius * .005} max={radiusRange?.maximum??radius * .2} step="any" value={value.radius} onChange={(e) => onChange({ ...value, radius: e.target.value })} /></label>
    <p>{physical?'Brush radius range:':'Development radius range:'} {(radiusRange?.minimum??radius * .005).toLocaleString()}–{(radiusRange?.maximum??radius * .2).toLocaleString()} m. {physical?'Measured along the rounded physical surface.':folded?'Measured along the connected retained and concave surface.':'Measured along the reference sphere.'}</p>
    {(value.tool === 'raise' || value.tool === 'lower') && <label>{physical?'Physical strength (m/dab)':'Spherical strength (m/dab)'}<input type="number" min="0" step="any" value={value.strength} onChange={(e) => onChange({ ...value, strength: e.target.value })} /></label>}
    {(value.tool === 'smooth' || value.tool === 'flatten') && <label>{physical?'Physical intensity (%)':'Spherical intensity (%)'}<input type="number" min="0" max="100" step="any" value={value.intensity} onChange={(e) => onChange({ ...value, intensity: e.target.value })} /></label>}
    {value.tool === 'flatten' && <label>{physical?'Physical target elevation (m)':'Spherical target elevation (m)'}<input type="number" step="any" value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value })} /></label>}
    <label><input type="checkbox" checked={value.edgeAssist} onChange={(e) => onChange({ ...value, edgeAssist: e.target.checked })} /> Assist drawing at net screen edges</label>
    {!folded&&<label><input type="checkbox" checked={value.limbAssist} onChange={(e) => onChange({ ...value, limbAssist: e.target.checked })} /> Assist drawing near the globe limb</label>}
    {!folded&&<p>Hold a brush near the globe's circular edge briefly to reveal adjoining terrain in the same stroke. Rotation waits for pending brush work. Outside the globe, drawing stops. Net assistance follows displayed joins; gaps and disconnected cuts end a stroke.</p>}
    {value.tool !== 'navigate' && !sphericalBrushFromControls(value, radius,radiusRange) && <p role="alert">Enter valid physical brush settings before drawing.</p>}
  </div>;
}
