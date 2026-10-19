'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { localMapType, type LocalMapSummary } from '../persistence/local-map-store.ts';

export interface WorkspaceChromeProps {
  prepare?(): void; openPanel: boolean; setPanel(open: boolean): void; busy: boolean; name: string; rename(name: string): void; shape: string;
  maps: LocalMapSummary[]; selected: string; select(id: string): void; save(): void; open(): void; refresh(): void; newWorld(): void;
  undo(): void; redo(): void; canUndo: boolean; canRedo: boolean; hasDocument: boolean; status: string; error: string; dismiss(): void;
  tools: ReactNode; navigation: ReactNode; detail?: ReactNode; toolPicker?: ReactNode;
}
/** One chrome for every implemented surface. Providers contribute only valid tools/views. */
export function WorkspaceChrome(p: WorkspaceChromeProps) {
  const panel = useRef<HTMLElement>(null), toggle = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null), previous = useRef(false);
  useLayoutEffect(() => {
    if (p.openPanel) heading.current?.focus({ preventScroll: true });
    else if (previous.current) toggle.current?.focus({ preventScroll: true });
    previous.current = p.openPanel;
  }, [p.openPanel]);
  return <>
    <button ref={toggle} className="panel-toggle" type="button" aria-expanded={p.openPanel} aria-controls="atlas-tools" aria-label={p.openPanel ? 'Close tools' : 'Open tools'} onClick={() => p.setPanel(!p.openPanel)}><span aria-hidden="true">{p.openPanel ? '×' : '☰'}</span> Atlas</button>
    <aside ref={panel} id="atlas-tools" className="tool-panel" aria-label="Atlas tools" hidden={!p.openPanel}>
      <div className="panel-heading"><span>Serrian Tide</span><h1 ref={heading} tabIndex={-1}>Atlas</h1><p>{p.shape || 'Choose a world to begin'}</p></div>
      <fieldset disabled={p.busy}><legend className="sr-only">Terrain editing and local maps</legend>
        <button type="button" className="new-wrapped" onPointerDown={p.prepare} onClick={p.newWorld}>New World / Map</button>
        {p.hasDocument && <div className="local-maps"><label htmlFor="map-name">Map name</label><input id="map-name" value={p.name} maxLength={120} onChange={(e) => p.rename(e.target.value)} /></div>}
        <div className="local-maps"><h2>Local maps</h2><p className="hint">Saved in this browser on this device. Not synchronized to Serrian Tide. Clearing browser data removes these saves. Save explicitly; there is no autosave.</p>
          <label htmlFor="saved-map">Saved maps</label><select id="saved-map" value={p.selected} onChange={(e) => p.select(e.target.value)}><option value="">Choose a saved map</option>{p.maps.map((map) => <option key={map.id} value={map.id}>{map.name} · {localMapType(map)}</option>)}</select>
          <div className="map-actions"><button type="button" disabled={!p.selected} onPointerDown={p.prepare} onClick={p.open}>Open Map</button><button type="button" onClick={p.refresh}>Refresh maps</button></div>
        </div>
        {p.openPanel && p.toolPicker && <div className="panel-tool-picker" role="group" aria-label="Terrain tool">{p.toolPicker}</div>}{p.tools}
      </fieldset>
      {p.detail}<p className="hint">Undo: Ctrl/⌘ Z · Redo: Ctrl/⌘ Shift Z<br />Save: Ctrl/⌘ S · Escape stops drawing and closes tools</p>
    </aside>
    <div className="quick-actions" role="group" aria-label="Editing history and saving"><button onClick={p.undo} disabled={p.busy || !p.canUndo} aria-keyshortcuts="Control+z Meta+z">Undo</button><button onClick={p.redo} disabled={p.busy || !p.canRedo} aria-keyshortcuts="Control+Shift+z Meta+Shift+z Control+y">Redo</button><button onPointerDown={p.prepare} onClick={p.save} disabled={p.busy || !p.hasDocument || !p.name.trim()} aria-keyshortcuts="Control+s Meta+s">{p.busy ? 'Working…' : 'Save'}</button></div>
    {!p.openPanel && p.toolPicker && <fieldset disabled={p.busy} className="workspace-tools" role="group" aria-label="Terrain tool">{p.toolPicker}</fieldset>}
    <nav className="navigation" aria-label="Map navigation">{p.navigation}</nav>
    <p className="save-status" role="status" aria-label="Map work status">{p.status}</p>
    {p.error && <div className="storage-error" role="alert"><p>{p.error}</p><button onClick={p.dismiss}>Dismiss</button></div>}
  </>;
}
