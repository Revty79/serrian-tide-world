'use client';
import { assertInteractiveCylinderDimensions } from '../editor/cylinder-configuration.ts';
import { useLayoutEffect, useRef, useState } from 'react';
import { shapeName, type WorldSetup, type WorldShape } from '../editor/atlas-document.ts';
import {assertInteractiveCube} from '../editor/cube-configuration.ts';

/** Setup creates a new identity. It never converts the document behind the dialog. */
export function NewWorldDialog({ busy, hasDocument, create, close, error }: { busy: boolean; hasDocument: boolean; create(setup: WorldSetup): void; close(): void; error: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shape, setShape] = useState<WorldShape>('bounded'), [name, setName] = useState('Untitled world'), [radius, setRadius] = useState(''), [resolution, setResolution] = useState<128 | 256>(128);
  const [cylinderRadius, setCylinderRadius] = useState('1000000'), [length, setLength] = useState('1600000'), [detail, setDetail] = useState<64 | 128 | 256>(128);
  const [cubeEdge,setCubeEdge]=useState('1000000');let cubeValid=false;try{if(cubeEdge.trim()){assertInteractiveCube(Number(cubeEdge),resolution);cubeValid=true;}}catch{/* Invalid dimensions cannot create a World. */}
  let cylinderValid = false; try { if (cylinderRadius.trim() && length.trim()) { assertInteractiveCylinderDimensions(Number(cylinderRadius), Number(length)); cylinderValid = true; } } catch { /* Invalid dimensions keep creation disabled. */ }
  useLayoutEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const valid = !!name.trim() && (shape!=='cube'||cubeValid) && (shape !== 'cylinder' || cylinderValid) && (shape !== 'sphere' || radius.trim() !== '' && Number(radius) > 0 && Number.isFinite(Number(radius) * Math.PI));
  return <dialog ref={ref} className="new-world-dialog" aria-labelledby="new-world-title" onCancel={(event) => { event.preventDefault(); if (!busy) close(); }}>
    <form onSubmit={(event) => { event.preventDefault(); if (valid && !busy) create({ shape, name, radiusMeters: Number(shape === 'cylinder' ? cylinderRadius : radius), cellsPerEdge: resolution, lengthMeters: Number(length), cylinderDetail: detail,sideLengthMeters:Number(cubeEdge) }); }}>
      <h1 id="new-world-title">New World / Map</h1><p>Choose your working surface. Every view edits the same geography.</p>
      <fieldset disabled={busy}><legend className="sr-only">World setup</legend>
        <label htmlFor="new-world-name">World/map name</label><input autoFocus id="new-world-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="world-shape">World shape</label><select id="world-shape" value={shape} onChange={(e) => setShape(e.target.value as WorldShape)}>{(['bounded', 'wrapped', 'sphere', 'cylinder','cube'] as const).map((s) => <option key={s} value={s}>{shapeName(s)}</option>)}</select>
        <p className="hint">{shape==='cube'?'A solid physical cube. Six flat faces, shared edges and corners, one continuous terrain. Sculpt in 3D or on the unfolded map, then Save and Open on this device.':shape === 'cylinder' ? 'A physical capped cylinder: curved side and two circular caps share one connected terrain. Physical view and Surface map edit the same samples.' : shape === 'sphere' ? 'A round physical sphere. Globe and Six-face Net share one numerical terrain.' : shape === 'wrapped' ? 'Repeats horizontally with bounded top and bottom. This is periodic flat geography; it is not a complete physical cylinder.' : 'A bounded flat map with map-unit coordinates and meter elevations.'}</p>
        {shape==='cube'&&<><label htmlFor="new-cube-edge">Cube edge length (m)</label><input id="new-cube-edge" type="number" min="1" max="1000000000" step="any" value={cubeEdge} onChange={e=>setCubeEdge(e.target.value)}/><label htmlFor="cube-resolution">Cube resolution</label><select id="cube-resolution" value={resolution} onChange={e=>setResolution(Number(e.target.value) as 128|256)}><option value="128">N128 · 98,306 shared samples</option><option value="256">N256 · 393,218 shared samples</option></select><p className="hint">N128 is faster. N256 and wide brushes can queue work while you draw; the footer shows progress. Saves preserve canonical terrain and physical geometry.</p></>}
        {shape === 'sphere' && <><label htmlFor="new-sphere-radius">Sphere reference radius (m)</label><input id="new-sphere-radius" type="number" min="0" step="any" placeholder="Enter an explicit radius" value={radius} onChange={(e) => setRadius(e.target.value)} />
          <label htmlFor="sphere-resolution">Spherical resolution</label><select id="sphere-resolution" value={resolution} onChange={(e) => setResolution(Number(e.target.value) as 128 | 256)}><option value="128">N=128 · 98,306 unique samples</option><option value="256">N=256 · 393,218 unique samples</option></select><p className="hint">N=256 needs more memory and processing time, especially on mobile.</p></>}
        {shape === 'cylinder' && <><label htmlFor="new-cylinder-radius">Cylinder reference radius (m)</label><input id="new-cylinder-radius" type="number" min="1" max="1000000000" step="any" value={cylinderRadius} onChange={e => setCylinderRadius(e.target.value)} />
          <label htmlFor="new-cylinder-length">Cylinder axial length (m)</label><input id="new-cylinder-length" type="number" min="1" max="1000000000" step="any" value={length} onChange={e => setLength(e.target.value)} />
          <label htmlFor="new-cylinder-detail">Cylinder numerical detail</label><select id="new-cylinder-detail" value={detail} onChange={e => setDetail(Number(e.target.value) as 64 | 128 | 256)}><option value="64">Lightweight · 64 / 32 / 16 · 4,034 samples</option><option value="128">Standard · 128 / 64 / 32 · 16,258 samples</option><option value="256">Higher · 256 / 128 / 64 · 65,282 samples</option></select><p className="hint">Dimensions: 1–1,000,000,000 m; axial length 0.1–20 times the radius. Higher detail or large brushes can delay editing, particularly on mobile. Try Lightweight for weaker devices. This creates a real side and two caps, unlike a horizontally wrapped flat map.</p></>}
        <p className="hint">Starts as blank ocean at −100 m. Creating a new shape does not convert your current geography. Other geometries are planned.</p>
        <div className="map-actions"><button type="submit" disabled={!valid}>Create World / Map</button></div>
      </fieldset>
      {busy && <p role="status">Preparing world…</p>}
      {error && <p role="alert">{error}</p>}<p className="hint"><a href="/dev/cube-preview.html" target="_blank" rel="noopener" style={{color:'inherit'}}>Development preview: inspect the physical cube (read-only)</a></p><button type="button" onClick={close}>{busy ? 'Cancel preparation' : hasDocument ? 'Cancel' : 'Browse saved maps'}</button>
    </form>
  </dialog>;
}
