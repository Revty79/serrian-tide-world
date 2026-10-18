import { useEffect, useRef, useState } from 'react';
import { TerrainCanvas, type TerrainCanvasHandle } from './components/TerrainCanvas.tsx';
import { BrushToolbar, brushFromControls, type BrushControls } from './components/BrushToolbar.tsx';
import { ElevationLegend } from './components/ElevationLegend.tsx';
import { createBlankTerrain } from './terrain/model.ts';
import { createWrappedTerrain, isWrapped } from './terrain/topology.ts';
import { resetTerrainToOcean } from './terrain/modifications.ts';
import { TerrainDocument } from './editor/terrain-document.ts';
import { LocalMapStore } from './persistence/local-map-store.ts';
import type { SavedMapSummary } from './persistence/terrain-format.ts';
import { encodeMap } from './persistence/map-format.ts';
import { isTextInput } from './interaction/canvas-navigation.ts';

const defaults: BrushControls = { tool: 'raise', radius: 0.06, strength: 200, intensity: 0.5, targetElevation: '0' };
const newDocument = (wrapped = false) => new TerrainDocument(wrapped
  ? createWrappedTerrain({ id: crypto.randomUUID(), identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID(), patchId: 'periodic-grid' } })
  : createBlankTerrain({ id: crypto.randomUUID() }), wrapped ? 'Untitled wrapped world' : 'Untitled world');
const store = new LocalMapStore();

export function App() {
  const [document, setDocument] = useState(newDocument);
  const documentRef = useRef(document); documentRef.current = document;
  const [controls, setControls] = useState(defaults);
  const [pan, setPan] = useState(false);
  const [revision, setRevision] = useState(0);
  const [, refresh] = useState(0);
  const update = () => refresh((value) => value + 1);
  const [openPanel, setOpenPanel] = useState(false);
  const panelRef = useRef<HTMLElement>(null), toggleRef = useRef<HTMLButtonElement>(null), headingRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<TerrainCanvasHandle>(null);
  const [zoom, setZoom] = useState(1);
  const workspaceRef = useRef<HTMLElement>(null);
  const [fullscreenSupported, setFullscreenSupported] = useState(false), [browserFullscreen, setBrowserFullscreen] = useState(false);
  useEffect(() => {
    setFullscreenSupported(!!window.document.fullscreenEnabled && typeof workspaceRef.current?.requestFullscreen === 'function');
    const changed = () => setBrowserFullscreen(window.document.fullscreenElement === workspaceRef.current);
    window.document.addEventListener('fullscreenchange', changed);
    return () => window.document.removeEventListener('fullscreenchange', changed);
  }, []);
  const [savedMaps, setSavedMaps] = useState<SavedMapSummary[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const reportError = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Local storage operation failed.');
  const finish = () => canvasRef.current?.finishInteraction();
  const guardDiscard = () => !documentRef.current.dirty || window.confirm('Discard unsaved changes to this map? Save first to keep your work.');
  const lock = () => { if (busyRef.current) return false; finish(); busyRef.current = true; setBusy(true); setError(''); return true; };
  const unlock = () => { busyRef.current = false; setBusy(false); };

  useEffect(() => {
    let active = true;
    store.list().then((maps) => { if (active) setSavedMaps(maps); }).catch((cause: unknown) => { if (active) reportError(cause); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (openPanel) headingRef.current?.focus({ preventScroll: true });
  }, [openPanel]);
  const closePanel = () => {
    const focusWithin = panelRef.current?.contains(window.document.activeElement);
    setOpenPanel(false);
    if (focusWithin) toggleRef.current?.focus({ preventScroll: true });
  };
  const undo = () => { if (busyRef.current) return; finish(); if (documentRef.current.history.undo()) setRevision((value) => value + 1); update(); };
  const redo = () => { if (busyRef.current) return; finish(); if (documentRef.current.history.redo()) setRevision((value) => value + 1); update(); };
  const reset = () => {
    if (busyRef.current) return;
    finish();
    if (window.confirm('Reset all terrain to the blank ocean at −100 meters? You can undo this reset.')) {
      document.history.begin(); resetTerrainToOcean(document.terrain); document.history.commit();
      setRevision((value) => value + 1); update();
    }
  };
  const newMap = (wrapped = false) => {
    if (busyRef.current) return;
    finish();
    if (!guardDiscard()) return;
    setDocument(newDocument(wrapped)); setControls(defaults); setPan(false); setError('');
  };
  const save = async () => {
    if (!lock()) return;
    const current = documentRef.current;
    try {
      const record = await encodeMap(current.terrain, current.name);
      await store.save(record);
      current.name = record.name; current.markSaved(); update();
      setSelected(record.id);
      setSavedMaps(await store.list());
    } catch (cause) { reportError(cause); }
    finally { unlock(); }
  };
  const openMap = async () => {
    if (!selected || !lock()) return;
    try {
      const loaded = await store.open(selected);
      if (!guardDiscard()) return;
      setDocument(new TerrainDocument(loaded.terrain, loaded.name, true));
      setControls({ ...defaults, radius: Math.min(loaded.terrain.metadata.dimensions.width, loaded.terrain.metadata.dimensions.height) * 0.06 });
      setPan(false);
    } catch (cause) { reportError(cause); }
    finally { unlock(); }
  };
  const actionsRef = useRef({ undo, redo, save, closePanel });
  actionsRef.current = { undo, redo, save, closePanel };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { actionsRef.current.closePanel(); return; }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') { event.preventDefault(); void actionsRef.current.save(); }
      else if (!isTextInput(event.target) && key === 'z') { event.preventDefault(); if (event.shiftKey) actionsRef.current.redo(); else actionsRef.current.undo(); }
      else if (!isTextInput(event.target) && key === 'y') { event.preventDefault(); actionsRef.current.redo(); }
    };
    const beforeunload = (event: BeforeUnloadEvent) => {
      finish();
      if (documentRef.current.dirty || busyRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('keydown', keydown); window.addEventListener('beforeunload', beforeunload);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('beforeunload', beforeunload); };
  }, []);
  const status = document.dirty ? 'Unsaved changes' : document.hasSaved ? 'Saved on this device' : 'Not saved yet';
  const toggleFullscreen = async () => {
    finish();
    try {
      if (window.document.fullscreenElement === workspaceRef.current) await window.document.exitFullscreen();
      else await workspaceRef.current?.requestFullscreen();
    } catch { setError('Browser fullscreen could not be changed. Your terrain is preserved; continue in this window.'); }
  };

  return (
    <main ref={workspaceRef} className="atlas-app" data-panel-open={openPanel} aria-label="Atlas workspace">
      <TerrainCanvas ref={canvasRef} terrain={document.terrain} brush={busy ? undefined : brushFromControls(controls)} pan={pan}
        fullscreen initialView="fill" revision={revision} onZoom={setZoom}
        onStrokeBegin={() => document.history.begin()} onStrokeEnd={() => { if (document.history.commit()) update(); }} />
      <button ref={toggleRef} className="panel-toggle" type="button" aria-expanded={openPanel} aria-controls="atlas-tools"
        aria-label={openPanel ? 'Close tools' : 'Open tools'} onClick={() => openPanel ? closePanel() : setOpenPanel(true)}>
        <span aria-hidden="true">{openPanel ? '×' : '☰'}</span> <span>Atlas</span>
      </button>
      <aside ref={panelRef} id="atlas-tools" className="tool-panel" aria-label="Atlas tools" hidden={!openPanel}>
        <div className="panel-heading"><span>Serrian Tide</span><h1 ref={headingRef} tabIndex={-1}>Atlas</h1><p>Shape your world</p></div>
        <fieldset disabled={busy}>
          <legend className="sr-only">Terrain editing and local maps</legend>
          <button type="button" className="pan-tool" aria-pressed={pan} onClick={() => { finish(); setPan(!pan); }}>Pan</button>
          <p className="hint">Space + drag to pan · wheel to zoom<br />Two fingers to pan and zoom</p>
          <BrushToolbar settings={controls} mapSpan={Math.min(document.terrain.metadata.dimensions.width, document.terrain.metadata.dimensions.height)}
            onChange={(value) => { setControls(value); setPan(false); }} onReset={reset} />
          <div className="local-maps">
            <h2>Local maps</h2>
            <label htmlFor="map-name">Map name</label>
            <input id="map-name" value={document.name} maxLength={120} onChange={(event) => { document.name = event.target.value; update(); }} />
            <p className="hint">Saved in this browser on this device. Not synchronized to Serrian Tide. Clearing browser data removes these saves.</p>
            <label htmlFor="saved-map">Saved maps</label>
            <select id="saved-map" value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Choose a saved map</option>
              {savedMaps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
            </select>
            <div className="map-actions"><button type="button" disabled={!selected} onClick={() => void openMap()}>Open Map</button><button type="button" onClick={() => newMap()}>New Blank Map</button></div>
            <button className="new-wrapped" type="button" onClick={() => newMap(true)}>New Wrapped Map</button>
            <p className="hint">Wrapped maps connect horizontally. Top and bottom stay bounded. Bounded maps keep their original edges.</p>
          </div>
        </fieldset>
        <ElevationLegend seaLevel={document.terrain.metadata.seaLevel} />
        <p className="hint">Undo: Ctrl/⌘ Z · Redo: Ctrl/⌘ Shift Z<br />Save: Ctrl/⌘ S · Escape closes tools</p>
      </aside>
      <div className="quick-actions" role="group" aria-label="Editing history and saving">
        <button type="button" onClick={undo} disabled={busy || !document.history.canUndo} aria-keyshortcuts="Control+z Meta+z">Undo</button>
        <button type="button" onClick={redo} disabled={busy || !document.history.canRedo} aria-keyshortcuts="Control+Shift+z Meta+Shift+z Control+y">Redo</button>
        <button type="button" onClick={() => void save()} disabled={busy || !document.name.trim()} aria-keyshortcuts="Control+s Meta+s">{busy ? 'Working…' : 'Save'}</button>
      </div>
      <div className="navigation" role="group" aria-label="Map navigation">
        <output aria-label="Map zoom">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom Out" disabled={zoom <= 1} onClick={() => canvasRef.current?.zoom(1 / 1.5)}>−</button>
        <button type="button" aria-label="Zoom In" disabled={zoom >= 8} onClick={() => canvasRef.current?.zoom(1.5)}>+</button>
        <button type="button" onClick={() => canvasRef.current?.fill()}>Fill View</button>
        <button type="button" onClick={() => canvasRef.current?.fit()}>Fit Entire Map</button>
        {fullscreenSupported && <button type="button" aria-label={browserFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} onClick={() => void toggleFullscreen()}>⛶</button>}
      </div>
      {isWrapped(document.terrain) && <p className="surface-status">Horizontal wrap</p>}
      <p className="save-status" role="status">{busy ? 'Working with local storage…' : status}</p>
      {error && <div className="storage-error" role="alert"><p>{error}</p><button type="button" onClick={() => setError('')}>Dismiss</button></div>}
    </main>
  );
}
