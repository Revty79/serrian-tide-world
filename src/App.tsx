import {HollowOctahedronEditor} from './components/HollowOctahedronEditor.tsx';
import {encodeHollowOctahedron} from './persistence/hollow-octahedron-format.ts';
import {OctahedronEditor} from './components/OctahedronEditor.tsx';
import {encodeOctahedron} from './persistence/octahedron-format.ts';
import {prepareOctahedronSession} from './editor/octahedron-session.ts';
import {HollowTetrahedronEditor} from './components/HollowTetrahedronEditor.tsx';
import {encodeHollowTetrahedron} from './persistence/hollow-tetrahedron-format.ts';
import {TetrahedronEditor} from './components/TetrahedronEditor.tsx';
import {encodeTetrahedron} from './persistence/tetrahedron-format.ts';
import {prepareTetrahedronSession} from './editor/tetrahedron-session.ts';
import {HollowPyramidEditor} from './components/HollowPyramidEditor.tsx';
import {encodeHollowPyramid} from './persistence/hollow-pyramid-format.ts';
import {PyramidEditor} from './components/PyramidEditor.tsx';
import {encodePyramid} from './persistence/pyramid-format.ts';
import {preparePyramidSession} from './editor/pyramid-session.ts';
import {OpenCylinderEditor,type OpenCylinderViewportHandle} from './components/OpenCylinderEditor.tsx';
import {encodeOpenCylinder} from './persistence/open-cylinder-format.ts';
import {HollowCylinderEditor} from './components/HollowCylinderEditor.tsx';
import {encodeHollowCylinder} from './persistence/hollow-cylinder-format.ts';
'use client';
import { CylinderWorkspace, type CylinderViewportHandle } from './components/CylinderPreview.tsx';
import { prepareCylinderSession } from './editor/prepare-cylinder-session.ts';
import { encodeCylindricalHeightmap } from './persistence/cylindrical-format.ts';
import { useEffect, useRef, useState } from 'react';
import { TerrainCanvas, type TerrainCanvasHandle } from './components/TerrainCanvas.tsx';
import { BrushToolbar, brushFromControls, type BrushControls } from './components/BrushToolbar.tsx';
import { ElevationLegend } from './components/ElevationLegend.tsx';
import { SphericalViewport, type SphericalViewportHandle, type SphericalWorkspaceView } from './components/SphericalViewport.tsx';
import { WorkspaceChrome } from './components/WorkspaceChrome.tsx';
import { NewWorldDialog } from './components/NewWorldDialog.tsx';
import { createAtlasDocument, documentModified, documentName, documentShape, shapeName, type AtlasDocument, type WorldSetup } from './editor/atlas-document.ts';
import { prepareSphericalSession } from './editor/prepare-spherical-session.ts';
import { TerrainDocument } from './editor/terrain-document.ts';
import { isWrapped } from './terrain/topology.ts';
import { resetTerrainToOcean } from './terrain/modifications.ts';
import { LocalMapStore, type LocalMapSummary } from './persistence/local-map-store.ts';
import { encodeMap } from './persistence/map-format.ts';
import { encodeSphericalHeightmap } from './persistence/spherical-format.ts';
import { yieldPersistence, type PersistenceWork } from './persistence/cooperative-work.ts';
import { isTextInput } from './interaction/canvas-navigation.ts';
import type { ViewMode } from './rendering/camera.ts';
import {CubeEditor} from './components/CubeEditor.tsx';
import {prepareCubeSession} from './editor/prepare-cube-session.ts';
import {encodeSolidCubeHeightmap} from './persistence/solid-cube-format.ts';
import {DEFAULT_ADDITIVE_STRENGTH_METERS} from './editor/brush-defaults.ts';

import {HollowCubeEditor} from './components/HollowCubeEditor.tsx';
import {HollowSphereEditor} from './components/HollowSphereEditor.tsx';
import {encodeHollowSphere} from './persistence/hollow-sphere-format.ts';
import {encodeHollowCube} from './persistence/hollow-cube-format.ts';

const defaults: BrushControls = { tool: 'raise', radius: .06, strength: DEFAULT_ADDITIVE_STRENGTH_METERS, intensity: .5, targetElevation: '0' };
const store = new LocalMapStore();

/** Exactly one active document. Renderers own view state, never document identity. */
export function App() {
  const [active, setActive] = useState<AtlasDocument | null>(null), activeRef = useRef(active); activeRef.current = active;
  const [generation, setGeneration] = useState(0), [controls, setControls] = useState(defaults), [pan, setPan] = useState(false), [edgePan, setEdgePan] = useState(true);
  const [revision, setRevision] = useState(0), [, refresh] = useState(0), update = () => refresh((v) => v + 1);
  const [openPanel, setPanel] = useState(false), [newWorld, setNewWorld] = useState(true);
  const [zoom, setZoom] = useState(1), [viewMode, setViewMode] = useState<ViewMode>('fill');
  const planar = useRef<TerrainCanvasHandle>(null), spherical = useRef<SphericalViewportHandle>(null), cylindrical = useRef<CylinderViewportHandle>(null), root = useRef<HTMLElement>(null);
  const openCylinder=useRef<OpenCylinderViewportHandle>(null),cube=useRef<SphericalViewportHandle>(null),hollowCylinder=useRef<CylinderViewportHandle>(null);
  const [fullscreenSupported, setFullscreenSupported] = useState(false), [fullscreen, setFullscreen] = useState(false);
  const [maps, setMaps] = useState<LocalMapSummary[]>([]), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), busyRef = useRef(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const operation = useRef(0), mounted = useRef(true), dialogOpen = useRef(newWorld); dialogOpen.current = newWorld;
  const report = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Local storage operation failed.');
  const list = async () => { try { const result = await store.list(); if (mounted.current) setMaps(result); } catch (cause) { if (mounted.current) report(cause); } };
  useEffect(() => { mounted.current = true; void list(); return () => { mounted.current = false; operation.current++; if (activeRef.current?.kind==='hollow-tetrahedron'||activeRef.current?.kind==='hollow-octahedron'||activeRef.current?.kind==='octahedron'||activeRef.current?.kind==='tetrahedron'||activeRef.current?.kind==='hollow-pyramid'||activeRef.current?.kind==='pyramid'||activeRef.current?.kind === 'cylinder'||(activeRef.current?.kind==='cube'||activeRef.current?.kind==='hollow-cube'||activeRef.current?.kind==='hollow-sphere'||activeRef.current?.kind==='hollow-cylinder'||activeRef.current?.kind==='open-cylinder')) activeRef.current.editor.dispose(); }; }, []);
  useEffect(() => {
    setFullscreenSupported(!!document.fullscreenEnabled && typeof root.current?.requestFullscreen === 'function');
    const changed = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', changed); return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const finish = () => { if(activeRef.current?.kind==='hollow-tetrahedron'||activeRef.current?.kind==='hollow-octahedron'||activeRef.current?.kind==='octahedron'||activeRef.current?.kind==='tetrahedron'||activeRef.current?.kind==='hollow-pyramid'||activeRef.current?.kind==='pyramid')cylindrical.current?.finishInteraction();else if(activeRef.current?.kind==='open-cylinder')openCylinder.current?.finishInteraction();else if(activeRef.current?.kind==='hollow-cylinder')hollowCylinder.current?.finishInteraction();else if(activeRef.current?.kind==='cube'||activeRef.current?.kind==='hollow-cube'||activeRef.current?.kind==='hollow-sphere')cube.current?.finishInteraction();else if (activeRef.current?.kind === 'cylinder') cylindrical.current?.finishInteraction(); else if (activeRef.current?.kind === 'sphere') spherical.current?.finishInteraction(); else planar.current?.finishInteraction(); };
  const lock = () => {
    if (busyRef.current) return null;
    finish(); busyRef.current = true; setBusy(true); setError(''); setMessage('Finishing accepted brush input');
    const current = activeRef.current; if (current && current.kind !== 'planar') current.editor.locked = true;
    return { current, token: ++operation.current };
  };
  const unlock = (current: AtlasDocument | null) => { if (current && current.kind !== 'planar') { current.editor.locked = false; current.editor.changed(); } busyRef.current = false; setBusy(false); };
  const workFor = (token: number): PersistenceWork => ({ progress: (stage, fraction) => { if (token === operation.current) setMessage(`${stage} · ${Math.round(fraction * 100)}%`); }, yield: async () => { await yieldPersistence(); if (!mounted.current || token !== operation.current) throw new Error('World preparation canceled.'); } });
  const drain = async (current: AtlasDocument | null, work: PersistenceWork) => { if (current && current.kind !== 'planar') await current.editor.drainForSave(work.yield); };
  const guard = (current: AtlasDocument | null) => !current || !documentModified(current) || window.confirm('Discard unsaved changes to this world/map? Save first to keep your work.');
  const dispose = (candidate: AtlasDocument | null) => { if (candidate?.kind==='hollow-tetrahedron'||candidate?.kind==='hollow-octahedron'||candidate?.kind==='octahedron'||candidate?.kind==='tetrahedron'||candidate?.kind==='hollow-pyramid'||candidate?.kind==='pyramid'||candidate?.kind === 'cylinder'||(candidate?.kind==='cube'||candidate?.kind==='hollow-cube'||candidate?.kind==='hollow-sphere'||candidate?.kind==='hollow-cylinder'||candidate?.kind==='open-cylinder')) candidate.editor.dispose(); };
  const replace = (candidate: AtlasDocument) => { dispose(activeRef.current); activeRef.current = candidate; setActive(candidate); setGeneration((v) => v + 1); setControls(defaults); setPan(false); setPanel(false); setNewWorld(false); setMessage(''); setError(''); };
  const create = async (setup: WorldSetup) => {
    const locked = lock(); if (!locked) return;
    const { current, token } = locked, work = workFor(token);
    try {
      await drain(current, work); if (!guard(current)) { setMessage(''); return; }
      const candidate = await createAtlasDocument(setup, work);
      if (token === operation.current && mounted.current) { replace(candidate); setSelected(''); await list(); } else dispose(candidate);
    } catch (cause) { if (token === operation.current) { report(cause); setMessage('Creation failed · current map retained'); } }
    finally { if (token === operation.current) unlock(current); }
  };
  const save = async () => {
    if (!activeRef.current) return;
    const locked = lock(); if (!locked) return;
    const { current, token } = locked, work = workFor(token); if (!current) return;
    try {
      await drain(current, work);
      const record = current.kind==='hollow-octahedron'?await encodeHollowOctahedron(current.editor,undefined,work):current.kind==='octahedron'?await encodeOctahedron(current.terrain,current.editor.name,undefined,work):current.kind==='hollow-tetrahedron'?await encodeHollowTetrahedron(current.editor,undefined,work):current.kind==='tetrahedron'?await encodeTetrahedron(current.terrain,current.editor.name,undefined,work):current.kind==='hollow-pyramid'?await encodeHollowPyramid(current.editor,undefined,work):current.kind==='pyramid'?await encodePyramid(current.terrain,current.editor.name,undefined,work):current.kind==='open-cylinder'?await encodeOpenCylinder(current.editor,undefined,work):current.kind==='hollow-cylinder'?await encodeHollowCylinder(current.editor,undefined,work):current.kind==='hollow-sphere'?await encodeHollowSphere(current.editor,undefined,work):current.kind === 'hollow-cube' ? await encodeHollowCube(current.editor,undefined,work) : current.kind === 'cube' ? await encodeSolidCubeHeightmap(current.terrain,current.editor.name,undefined,work) : current.kind === 'cylinder' ? await encodeCylindricalHeightmap(current.terrain, current.editor.name, undefined, work) : current.kind === 'sphere' ? await encodeSphericalHeightmap(current.terrain, current.editor.name, undefined, work) : await encodeMap(current.document.terrain, current.document.name);
      await store.save(record, work);
      if (current.kind !== 'planar') current.editor.markSaved(record.name); else { current.document.name = record.name; current.document.markSaved(); }
      setSelected(record.id); update(); await list(); setMessage('');
    } catch (cause) { report(cause); setMessage('Save failed · edits retained'); }
    finally { unlock(current); }
  };
  const open = async () => {
    if (!selected) return; const locked = lock(); if (!locked) return;
    const { current, token } = locked, work = workFor(token);
    try {
      await drain(current, work);
      const loaded = await store.openAny(selected, work);
      const candidate: AtlasDocument = loaded.kind==='octahedron'?{kind:'octahedron',...await prepareOctahedronSession(loaded.terrain,loaded.name,true,work)}:loaded.kind==='tetrahedron'?{kind:'tetrahedron',...await prepareTetrahedronSession(loaded.terrain,loaded.name,true,work)}:loaded.kind==='pyramid'?{kind:'pyramid',...await preparePyramidSession(loaded.terrain,loaded.name,true,work)}:loaded.kind==='hollow-octahedron'||loaded.kind==='hollow-tetrahedron'||loaded.kind==='hollow-pyramid'||loaded.kind==='open-cylinder'||loaded.kind==='hollow-cylinder'||loaded.kind==='hollow-sphere'?loaded:loaded.kind === 'hollow-cube' ? loaded : loaded.kind === 'cube' ? {kind:'cube',...await prepareCubeSession(loaded.terrain,loaded.name,true,work)} : loaded.kind === 'cylinder' ? { kind: 'cylinder', ...await prepareCylinderSession(loaded.terrain, loaded.name, true, work) } : loaded.kind === 'sphere' ? { kind: 'sphere', ...await prepareSphericalSession(loaded.terrain, loaded.name, true, work) } : { kind: 'planar', document: new TerrainDocument(loaded.terrain, loaded.name, true) };
      if (token !== operation.current || !mounted.current || !guard(current)) { dispose(candidate); setMessage(''); return; }
      replace(candidate);
      if (candidate.kind === 'planar') setControls({ ...defaults, radius: Math.min(candidate.document.terrain.metadata.dimensions.width, candidate.document.terrain.metadata.dimensions.height) * .06 });
    } catch (cause) { report(cause); setMessage('Open failed · current map retained'); }
    finally { unlock(current); }
  };
  const history = (redo = false) => {
    if (busyRef.current) return; const current = activeRef.current; if (!current) return;
    if(current.kind==='hollow-tetrahedron'||current.kind==='hollow-octahedron'||current.kind==='octahedron'||current.kind==='tetrahedron'||current.kind==='hollow-pyramid'||current.kind==='pyramid'){if(redo)cylindrical.current?.redo();else cylindrical.current?.undo();}
    else if(current.kind==='open-cylinder'){if(redo)openCylinder.current?.redo();else openCylinder.current?.undo();}
    else if(current.kind==='hollow-cylinder'){if(redo)hollowCylinder.current?.redo();else hollowCylinder.current?.undo();}
    else if(current.kind==='cube'||current.kind==='hollow-cube'||current.kind==='hollow-sphere'){if(redo)cube.current?.redo();else cube.current?.undo();}
    else if (current.kind === 'cylinder') { if (redo) cylindrical.current?.redo(); else cylindrical.current?.undo(); }
    else if (current.kind === 'sphere') { if (redo) spherical.current?.redo(); else spherical.current?.undo(); }
    else { finish(); if (redo ? current.document.history.redo() : current.document.history.undo()) { setRevision((v) => v + 1); update(); } }
    setMessage('');
  };
  const reset = () => {
    if (busyRef.current || active?.kind !== 'planar') return; finish();
    if (window.confirm('Reset this terrain to the blank ocean at −100 meters? You can undo this reset.')) { active.document.history.begin(); resetTerrainToOcean(active.document.terrain); active.document.history.commit(); setRevision((v) => v + 1); update(); }
  };
  const closeSetup = () => { if (busyRef.current) { operation.current++; unlock(activeRef.current); } setNewWorld(false); setPanel(true); setMessage(''); requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('.new-wrapped')?.focus()); };
  const actions = useRef({ save, history, finish, setPanel }); actions.current = { save, history, finish, setPanel };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (dialogOpen.current) return;
      if (event.key === 'Escape') { actions.current.finish(); actions.current.setPanel(false); return; }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') { event.preventDefault(); void actions.current.save(); }
      else if (!isTextInput(event.target) && ['z', 'y'].includes(key)) { event.preventDefault(); actions.current.history(event.shiftKey || key === 'y'); }
    };
    const beforeunload = (event: BeforeUnloadEvent) => { actions.current.finish(); if (busyRef.current || activeRef.current && (documentModified(activeRef.current) || (activeRef.current.kind==='hollow-tetrahedron'||activeRef.current.kind==='hollow-octahedron'||activeRef.current.kind==='octahedron'||activeRef.current.kind==='tetrahedron'||activeRef.current.kind==='hollow-pyramid'||activeRef.current.kind==='pyramid'||activeRef.current.kind === 'cylinder'||activeRef.current.kind==='cube'||activeRef.current.kind==='hollow-cube'||activeRef.current.kind==='hollow-sphere'||activeRef.current.kind==='hollow-cylinder'||activeRef.current.kind==='open-cylinder') && activeRef.current.editor.painting)) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('keydown', keydown); window.addEventListener('beforeunload', beforeunload);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('beforeunload', beforeunload); };
  }, []);
  const full = async () => { finish(); try { if (document.fullscreenElement === root.current) await document.exitFullscreen(); else await root.current?.requestFullscreen(); } catch { setError('Browser fullscreen could not be changed. Your terrain is preserved; continue in this window.'); } };
  const chrome = (sphere?: SphericalWorkspaceView) => {
    const doc = active?.kind === 'planar' ? active.document : null;
    const status = busy ? message || 'Working with local storage…' : (active ? documentModified(active) ? 'Unsaved changes' : (active.kind !== 'planar' ? active.editor.hasSaved : active.document.hasSaved) ? 'Saved on this device' : 'Not saved yet' : 'Choose a world/map');
    return <WorkspaceChrome prepare={finish} openPanel={openPanel} setPanel={setPanel} busy={busy} name={active ? documentName(active) : ''} rename={(name) => { if (active && active.kind !== 'planar') { active.editor.name = name; active.editor.changed(); } else if (doc) doc.name = name; setMessage(''); update(); }} shape={active ? shapeName(documentShape(active)) : ''}
      hasDocument={!!active} maps={maps} selected={selected} select={setSelected} save={() => void save()} open={() => void open()} refresh={() => void list()} newWorld={() => { finish(); setNewWorld(true); }} undo={() => history()} redo={() => history(true)} canUndo={sphere ? sphere.canUndo && !sphere.processing : !!doc?.history.canUndo} canRedo={sphere ? sphere.canRedo && !sphere.processing : !!doc?.history.canRedo} status={status} error={error} dismiss={() => setError('')}
      toolPicker={sphere?.toolPicker ?? (doc && <><button aria-pressed={pan} onClick={() => { finish(); setPan(!pan); }}>Pan</button>{(['raise', 'lower', 'smooth', 'flatten'] as const).map((tool) => <button key={tool} aria-pressed={!pan && controls.tool === tool} onClick={() => { finish(); setControls({ ...controls, tool }); setPan(false); }}>{tool.charAt(0).toUpperCase() + tool.slice(1)}</button>)}</>)}
      tools={sphere?.tools ?? (doc && <><p className="hint">Space + drag to pan · wheel to zoom<br />Two fingers to pan and zoom. Brush radius uses map units; elevations use meters.</p><label className="edge-scroll"><input type="checkbox" checked={edgePan} onChange={(e) => { finish(); setEdgePan(e.target.checked); }} /> Scroll while drawing at screen edges</label><p className="hint">Hold near an edge briefly to reveal terrain in the same stroke. Top and bottom remain bounded.</p><BrushToolbar hideToolPicker settings={controls} mapSpan={Math.min(doc.terrain.metadata.dimensions.width, doc.terrain.metadata.dimensions.height)} onChange={(value) => { setControls(value); setPan(false); }} onReset={reset} />{isWrapped(doc.terrain) && <p className="hint">Focus Editing enlarges one cycle with adjoining terrain at the sides. Pan to move the cut. Fill View gives full-height context; Fit Entire Map shows all terrain. Horizontal wrapping is not a complete physical cylinder.</p>}</>)}
      detail={doc && <ElevationLegend seaLevel={doc.terrain.metadata.seaLevel} />}
      navigation={<fieldset disabled={busy} className="navigation-buttons">{sphere?.navigation ?? (doc && <><output aria-label="Map zoom">{Math.round(zoom * 100)}%</output><button aria-label="Zoom Out" disabled={zoom <= 1} onClick={() => planar.current?.zoom(1 / 1.5)}>−</button><button aria-label="Zoom In" disabled={zoom >= 8} onClick={() => planar.current?.zoom(1.5)}>+</button>{isWrapped(doc.terrain) && <button aria-pressed={viewMode === 'focus'} onClick={() => planar.current?.focus()}>Focus Editing</button>}<button aria-pressed={viewMode === 'fill'} onClick={() => planar.current?.fill()}>Fill View</button><button aria-pressed={viewMode === 'fit'} onClick={() => planar.current?.fit()}>Fit Entire Map</button></>)}{fullscreenSupported && <button aria-label={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} onClick={() => void full()}>⛶</button>}</fieldset>} />;
  };
  return <main ref={root} className="atlas-app" data-panel-open={openPanel} data-world-shape={active ? documentShape(active) : 'none'} aria-label="Atlas workspace">
    {active?.kind === 'planar' && <TerrainCanvas key={generation} ref={planar} terrain={active.document.terrain} brush={busy ? undefined : brushFromControls(controls)} pan={pan} fullscreen initialView={isWrapped(active.document.terrain) ? 'focus' : 'fill'} edgePan={edgePan} revision={revision} onZoom={setZoom} onViewChange={setViewMode} onStrokeBegin={() => active.document.history.begin()} onStrokeEnd={() => { if (active.document.history.commit()) update(); }} />}
    {active?.kind==='hollow-octahedron'?<HollowOctahedronEditor key={generation} editor={active.editor} handleRef={cylindrical} workspace={chrome}/>:active?.kind==='octahedron'?<OctahedronEditor key={generation} session={active.editor} handleRef={cylindrical} workspace={chrome}/>:active?.kind==='hollow-tetrahedron'?<HollowTetrahedronEditor key={generation} editor={active.editor} handleRef={cylindrical} workspace={chrome}/>:active?.kind==='tetrahedron'?<TetrahedronEditor key={generation} session={active.editor} handleRef={cylindrical} workspace={chrome}/>:active?.kind==='hollow-pyramid'?<HollowPyramidEditor key={generation} editor={active.editor} handleRef={cylindrical} workspace={chrome}/>:active?.kind==='pyramid'?<PyramidEditor key={generation} session={active.editor} handleRef={cylindrical} workspace={chrome}/>:active?.kind==='open-cylinder'?<OpenCylinderEditor key={generation} editor={active.editor} handleRef={openCylinder} workspace={chrome}/>:active?.kind==='hollow-cylinder'?<HollowCylinderEditor key={generation} editor={active.editor} handleRef={hollowCylinder} workspace={chrome}/>:active?.kind==='hollow-sphere'?<HollowSphereEditor key={generation} editor={active.editor} handleRef={cube} workspace={chrome}/>:active?.kind==='hollow-cube'?<HollowCubeEditor key={generation} editor={active.editor} handleRef={cube} workspace={chrome}/>:active?.kind==='cube'?<CubeEditor key={generation} session={active.editor} handleRef={cube} workspace={chrome}/>:active?.kind === 'cylinder' ? <CylinderWorkspace key={generation} session={active.editor} preparationMs={active.preparationMs} handleRef={cylindrical} workspace={chrome} /> : active?.kind === 'sphere' ? <SphericalViewport key={generation} {...active} handleRef={spherical} onClose={() => {}} workspace={chrome} /> : chrome()}
    {active?.kind === 'planar' && isWrapped(active.document.terrain) && <p className="surface-status">{viewMode === 'focus' ? 'Horizontal wrap · focused view' : 'Horizontal wrap · same terrain repeats'}</p>}
    {newWorld && <NewWorldDialog busy={busy} hasDocument={!!active} error={error} create={(setup) => void create(setup)} close={closeSetup} />}
  </main>;
}
