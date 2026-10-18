'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { CUBE_FACES, FACE_BASES, FACE_EDGES, QUARTER_PI, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { attachSphericalNavigation } from '../interaction/spherical-navigation.ts';
import { attachSphericalEditing } from '../interaction/spherical-editing.ts';
import type { SphericalSession } from '../editor/spherical-session.ts';
import { sphericalBrushPreview } from '../rendering/spherical-brush-preview.ts';
import { continuousNetSegment } from '../rendering/spherical-gesture-path.ts';
import { edgePanVelocity } from '../rendering/edge-pan.ts';
import { isTextInput } from '../interaction/canvas-navigation.ts';
import { SphericalBrushControls, defaultSphericalControls, sphericalBrushFromControls } from './SphericalBrushControls.tsx';
import { renderSphericalGlobe, type SphericalDisplayCache } from '../rendering/spherical-raster.ts';
import { INITIAL_SPHERICAL_VIEW, inspectSphere, netEdgeIsJoined, netFaceCoordinates, netFaceRect, panSphereNet, projectSphere, recenterSphere, rotateSphere, sphericalLayout, unprojectSphere, zoomSphere, type ScreenPoint, type SphericalView } from '../rendering/spherical-view.ts';
import styles from './SphericalPreview.module.css';
import { SphericalStorageControls, type SphericalPersistenceUi } from './SphericalStorageControls.tsx';

export interface SphericalViewportProps { readonly terrain: SphericalTerrain; readonly cache: SphericalDisplayCache; readonly onClose: () => void; readonly preparationMs?: number; readonly maxPreparationTaskMs?: number; readonly editor?: SphericalSession; readonly persistence?: SphericalPersistenceUi }
export function SphericalViewport({ terrain, cache, onClose, preparationMs = 0, maxPreparationTaskMs = 0, editor, persistence }: SphericalViewportProps) {
  const persistenceRef = useRef(persistence); persistenceRef.current = persistence;
  const canvasRef = useRef<HTMLCanvasElement>(null), rootRef = useRef<HTMLElement>(null), readoutRef = useRef<HTMLOutputElement>(null);
  const viewRef = useRef<SphericalView>(INITIAL_SPHERICAL_VIEW), selectedRef = useRef<Vec3 | null>(null);
  const previewRef = useRef<SVGPathElement>(null);
  const commands = useRef({ change(_fn: (view: SphericalView) => SphericalView) {}, inspect(_point: ScreenPoint, _select: boolean) {}, reset() {}, stop() {}, undo() {}, redo() {}, repaint() {}, prepareSave() {} });
  const [controls, setControls] = useState(() => defaultSphericalControls(terrain.metadata.geometry.radiusMeters));
  const controlsRef = useRef(controls); controlsRef.current = controls;
  const [editorState, setEditorState] = useState({ modified: false, canUndo: false, canRedo: false, busy: false });
  const [panel, setPanel] = useState(false), [mode, setMode] = useState<'globe' | 'net'>('globe'), [zoom, setZoom] = useState(1), [hasSelection, setHasSelection] = useState(false);
  const [fullscreen, setFullscreen] = useState(false), [fullscreenSupported, setFullscreenSupported] = useState(false), [error, setError] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null), panelRef = useRef<HTMLElement>(null);
  // Focus during the panel commit; a delayed RAF can steal focus from subsequent typing.
  useLayoutEffect(() => { if (panel) panelRef.current?.querySelector<HTMLElement>('input, button')?.focus(); }, [panel]);
  useLayoutEffect(() => { commands.current.repaint(); }, [controls]);
  useLayoutEffect(() => {
    const canvas = canvasRef.current!, output = readoutRef.current!, root = rootRef.current!, context = canvas.getContext('2d')!;
    setFullscreenSupported(!!document.fullscreenEnabled && typeof root.requestFullscreen === 'function'); setFullscreen(!!document.fullscreenElement);
    const faceCanvases = Object.fromEntries(CUBE_FACES.map((face) => {
      const texture = cache.faces[face], image = document.createElement('canvas'); image.width = image.height = texture.side;
      image.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(texture.pixels), texture.side, texture.side), 0, 0); return [face, image];
    })) as Record<CubeFace, HTMLCanvasElement>;
    const scratch = document.createElement('canvas'), scratchContext = scratch.getContext('2d')!;
    let frame = 0, active = true, raster: Uint8ClampedArray | undefined, pendingInspection: { point: ScreenPoint; select: boolean } | undefined;
    let paints = 0, requests = 0, dirty = true, interactiveUntil = 0, refinementTimer = 0, inputAt = 0, hover: ScreenPoint | null = null;
    let edgeSince = 0, edgeTime = 0, editingNavigation: ReturnType<typeof attachSphericalEditing> | undefined;
    const renderTimes: number[] = [], inputLatencies: number[] = [], brushLatencies: number[] = [];
    const size = () => ({ width: canvas.clientWidth, height: canvas.clientHeight });
    const showInspection = (direction: Vec3 | null, select: boolean) => {
      output.setAttribute('aria-live', select ? 'polite' : 'off');
      if (!direction) {
        output.textContent = 'Outside spherical surface · gaps and the far side cannot be selected'; delete output.dataset.sample; delete output.dataset.elevation; delete output.dataset.direction;
        if (select) { selectedRef.current = null; setHasSelection(false); } return;
      }
      const sample = inspectSphere(terrain, direction);
      output.textContent = `${sample.elevation.toLocaleString(undefined, { maximumFractionDigits: 2 })} m · ${sample.position.patchId} · sample ${sample.key.index} · direction ${sample.direction.map((v) => v.toFixed(4)).join(', ')}`;
      output.dataset.sample = String(sample.key.index); output.dataset.elevation = String(sample.elevation); output.dataset.direction = JSON.stringify(sample.direction);
      if (select) { selectedRef.current = sample.direction; setHasSelection(true); }
    };
    const paint = () => {
      frame = 0; if (!active) return;
      const start = performance.now(), viewport = size(); let view = viewRef.current;
      if (viewport.width === 0 || viewport.height === 0) return;
      if (editor) {
        // Catch up accepted input without dropping points. Keep ordinary feedback light;
        // a released/backlogged stroke gets one bounded 16 ms slice (still <=8 atomic dabs).
        const pending = editor.locked ? editor.painting : editor.pump(editor.processing || editor.pendingPoints > 1 ? 16 : 6), regions = editor.updateDisplay();
        for (const region of regions) {
          const texture = cache.faces[region.face];
          faceCanvases[region.face].getContext('2d')!.putImageData(new ImageData(texture.pixels as Uint8ClampedArray<ArrayBuffer>, texture.side, texture.side), 0, 0, region.left, region.top, region.right - region.left + 1, region.bottom - region.top + 1);
        }
        if (regions.length) { dirty = true; if (hover) pendingInspection = { point: hover, select: false }; }
        setEditorState((old) => { const next = { modified: editor.modified, canUndo: editor.history.canUndo, canRedo: editor.history.canRedo, busy: editor.processing }; return Object.keys(next).every((key) => old[key as keyof typeof old] === next[key as keyof typeof next]) ? old : next; });
        canvas.dataset.modified = String(editor.modified); canvas.dataset.historyEntries = String(editor.history.length); canvas.dataset.processing = String(editor.processing); canvas.dataset.textureRevision = String(cache.sourceRevision); canvas.dataset.editStatistics = JSON.stringify(editor.statistics);
        if (pending) schedule();
        const point = editingNavigation?.drawingPoint;
        const velocity = point && controlsRef.current.edgeAssist && view.mode === 'net' ? edgePanVelocity(point, viewport) : { x: 0, y: 0 };
        if (point && editor.painting && !editor.locked && !editor.backlogged && (velocity.x || velocity.y)) {
          const now = performance.now(); if (!edgeSince) edgeSince = now;
          if (now - edgeSince >= 200) {
            const dt = Math.min(32, edgeTime ? now - edgeTime : 16) / 1000, before = viewRef.current;
            const next = panSphereNet(before, velocity.x * dt * .5, velocity.y * dt * .5, viewport), side = sphericalLayout(before, viewport).face;
            const dx = (next.pan.x - before.pan.x) * side, dy = (next.pan.y - before.pan.y) * side;
            viewRef.current = next;
            view = next;
            if (dx || dy) { editingNavigation?.assist(dx, dy); dirty = true; canvas.dataset.edgeAssisting = 'true'; }
          }
          edgeTime = now; schedule();
        } else { edgeSince = 0; edgeTime = 0; canvas.dataset.edgeAssisting = 'false'; }
        const brush = sphericalBrushFromControls(controlsRef.current, terrain.metadata.geometry.radiusMeters), center = hover && unprojectSphere(terrain, hover, viewRef.current, viewport);
        const segments = brush && center ? sphericalBrushPreview(terrain, center, brush.radiusMeters, viewRef.current, viewport) : [];
        previewRef.current?.setAttribute('d', segments.map((s) => s.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ')).join(' '));
        canvas.dataset.previewCenter = center && brush ? JSON.stringify(center) : ''; canvas.dataset.previewRadius = brush ? String(brush.radiusMeters) : '';
      }
      if (!dirty) {
        if (pendingInspection) { showInspection(unprojectSphere(terrain, pendingInspection.point, view, viewport), pendingInspection.select); pendingInspection = undefined; }
        return;
      }
      dirty = false;
      const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(3_000_000 / (viewport.width * viewport.height))), width = Math.floor(viewport.width * dpr), height = Math.floor(viewport.height * dpr);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.setTransform(width / viewport.width, 0, 0, height / viewport.height, 0, 0); context.clearRect(0, 0, viewport.width, viewport.height); context.imageSmoothingEnabled = true;
      if (view.mode === 'globe') {
        const mobile = matchMedia('(pointer: coarse)').matches, interactive = performance.now() < interactiveUntil || !!editor?.painting;
        const budget = editor?.painting ? mobile ? 35_000 : 80_000 : mobile ? interactive ? 70_000 : 220_000 : interactive ? 180_000 : 420_000;
        const result = renderSphericalGlobe(cache, viewRef.current, viewport, budget, raster);
        canvas.dataset.quality = editor?.painting ? 'editing' : interactive ? 'navigation' : 'settled';
        raster = result.pixels;
        if (scratch.width !== result.columns || scratch.height !== result.rows) { scratch.width = result.columns; scratch.height = result.rows; }
        scratchContext.putImageData(new ImageData(raster as Uint8ClampedArray<ArrayBuffer>, result.columns, result.rows), 0, 0);
        context.drawImage(scratch, result.left, result.top, result.width, result.height);
      } else {
        for (const face of CUBE_FACES) {
          const r = netFaceRect(face, viewRef.current, viewport), image = faceCanvases[face];
          const a = netFaceCoordinates(face, -QUARTER_PI, -QUARTER_PI), b = netFaceCoordinates(face, QUARTER_PI, -QUARTER_PI), c = netFaceCoordinates(face, -QUARTER_PI, QUARTER_PI);
          context.save(); context.translate(r.x, r.y); context.transform((b.x - a.x) * r.side / image.width, (b.y - a.y) * r.side / image.width, (c.x - a.x) * r.side / image.height, (c.y - a.y) * r.side / image.height, a.x * r.side, a.y * r.side);
          context.drawImage(image, .5, .5, image.width - 1, image.height - 1, 0, 0, image.width, image.height); context.restore();
          for (const edge of FACE_EDGES) {
            const endpoints = [-QUARTER_PI, QUARTER_PI].map((along) => {
              const p = { ...terrain.metadata.identity, patchId: face, u: edge.startsWith('u') ? (edge.endsWith('min') ? -1 : 1) * QUARTER_PI : along, v: edge.startsWith('v') ? (edge.endsWith('min') ? -1 : 1) * QUARTER_PI : along };
              const local = netFaceCoordinates(face, p.u, p.v); return { x: r.x + local.x * r.side, y: r.y + local.y * r.side, direction: terrain.geometry.direction(p) };
            });
            const joined = netEdgeIsJoined(terrain, face, edge);
            context.strokeStyle = joined ? '#e2f3edb0' : '#ffca7b'; context.lineWidth = joined ? 1 : 1.5; context.setLineDash(joined ? [] : [5, 4]);
            context.beginPath(); context.moveTo(endpoints[0]!.x, endpoints[0]!.y); context.lineTo(endpoints[1]!.x, endpoints[1]!.y); context.stroke();
          }
          context.setLineDash([]); context.fillStyle = '#0b1b2dc9'; context.fillRect(r.x + 5, r.y + 5, 28, 22); context.fillStyle = '#fff'; context.font = '12px ui-monospace, monospace'; context.fillText(face, r.x + 10, r.y + 20);
        }
      }
      if (pendingInspection) { showInspection(unprojectSphere(terrain, pendingInspection.point, view, viewport), pendingInspection.select); pendingInspection = undefined; }
      if (selectedRef.current) for (const point of projectSphere(terrain, selectedRef.current, view, viewport)) {
        context.strokeStyle = 'white'; context.lineWidth = 2; context.setLineDash([]); context.beginPath(); context.arc(point.x, point.y, 7, 0, 2 * Math.PI); context.stroke();
      }
      renderTimes.push(performance.now() - start); if (renderTimes.length > 120) renderTimes.shift(); paints++;
      canvas.dataset.mode = view.mode; canvas.dataset.frame = JSON.stringify(view.frame); canvas.dataset.zoom = String(view.zoom); canvas.dataset.pan = JSON.stringify(view.pan);
      canvas.dataset.renders = String(paints); canvas.dataset.requests = String(requests); canvas.dataset.renderTimes = JSON.stringify(renderTimes); canvas.dataset.rasterBytes = String(raster?.byteLength ?? 0);
      canvas.dataset.revision = String(terrain.revision);
      if (inputAt) { inputLatencies.push(performance.now() - inputAt); if (inputLatencies.length > 120) inputLatencies.shift(); canvas.dataset.inputLatencies = JSON.stringify(inputLatencies); inputAt = 0; }
      if (editor) { brushLatencies.push(...editor.presentedLatencies(performance.now())); if (brushLatencies.length > 120) brushLatencies.splice(0, brushLatencies.length - 120); canvas.dataset.brushLatencies = JSON.stringify(brushLatencies); }
    };
    const schedule = (redraw = true) => { dirty ||= redraw; requests++; if (!frame) frame = requestAnimationFrame(paint); };
    const change = (fn: (view: SphericalView) => SphericalView, interactive = false) => {
      inputAt ||= performance.now();
      viewRef.current = fn(viewRef.current); setMode(viewRef.current.mode); setZoom(viewRef.current.zoom);
      if (interactive) { interactiveUntil = performance.now() + 160; clearTimeout(refinementTimer); refinementTimer = window.setTimeout(() => schedule(), 180); }
      schedule();
    };
    const reset = () => change((view) => ({ ...INITIAL_SPHERICAL_VIEW, mode: view.mode }));
    const inspect = (point: ScreenPoint, select: boolean) => { pendingInspection = { point, select }; schedule(select); };
    const navigationActions = {
      drag(dx, dy) { change((view) => view.mode === 'globe' ? rotateSphere(view, dx / sphericalLayout(view, size()).radius, dy / sphericalLayout(view, size()).radius) : panSphereNet(view, dx, dy, size()), true); },
      zoom: (factor) => change((view) => zoomSphere(view, factor), true), inspect, reset,
    } satisfies Parameters<typeof attachSphericalNavigation>[1];
    const navigation = editor ? editingNavigation = attachSphericalEditing(canvas, {
      ...navigationActions, paintingEnabled: () => !!sphericalBrushFromControls(controlsRef.current, terrain.metadata.geometry.radiusMeters),
      begin(point) {
        const direction = unprojectSphere(terrain, point, viewRef.current, size()), brush = sphericalBrushFromControls(controlsRef.current, terrain.metadata.geometry.radiusMeters);
        if (!direction || !brush || editor.processing) return false;
        try { const result = editor.begin(direction, brush, viewRef.current.mode === 'globe' ? viewRef.current.frame.forward : undefined); if (result) inspect(point, true); return result; }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Stroke could not start.'); return false; }
      },
      move(point) {
        const direction = unprojectSphere(terrain, point, viewRef.current, size()), anchor = editingNavigation?.anchor;
        if (!direction || viewRef.current.mode === 'net' && anchor && !continuousNetSegment(terrain, anchor, point, viewRef.current, size())) return false;
        editor.move(direction); return true;
      }, release: () => editor.release(), stop: () => editor.cancel(), hover(point) { hover = point; schedule(false); },
    }) : attachSphericalNavigation(canvas, navigationActions);
    if (editor) { editor.changed = () => schedule(); editor.error = setError; }
    const stop = () => { if (editor?.locked) return; navigation.cancel(); editor?.cancel(); hover = null; schedule(); };
    commands.current = { change: (fn) => { stop(); change(fn); }, inspect, reset: () => { stop(); reset(); }, stop,
      undo: () => { stop(); try { editor?.undo(); } catch (cause) { setError(String(cause)); } }, redo: () => { stop(); try { editor?.redo(); } catch (cause) { setError(String(cause)); } }, repaint: () => schedule(false),
      prepareSave: () => { editingNavigation?.finish(); editor?.release(); schedule(); } };
    const observer = new ResizeObserver(() => { navigation.cancel(); schedule(); }); observer.observe(root);
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (persistenceRef.current) { commands.current.prepareSave(); persistenceRef.current.save(); } else setError('Spherical preview is session-only. Saving is not available in this checkpoint.'); }
      if (editor && (event.ctrlKey || event.metaKey) && !isTextInput(event.target) && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); if (event.shiftKey || event.key.toLowerCase() === 'y') commands.current.redo(); else commands.current.undo(); }
      if (event.key === 'Escape') { navigation.cancel(); setPanel(false); if (panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus(); }
    };
    window.addEventListener('keydown', key);
    const fullscreenChange = () => { setFullscreen(!!document.fullscreenElement); navigation.cancel(); schedule(); };
    document.addEventListener('fullscreenchange', fullscreenChange);
    const beforeUnload = (event: BeforeUnloadEvent) => { if (editor) { stop(); if (editor.modified || editor.locked) { event.preventDefault(); event.returnValue = ''; } } };
    window.addEventListener('beforeunload', beforeUnload);
    schedule(); canvas.focus({ preventScroll: true });
    return () => { active = false; cancelAnimationFrame(frame); clearTimeout(refinementTimer); navigation.dispose(); observer.disconnect(); window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('fullscreenchange', fullscreenChange); if (editor) { editor.changed = () => {}; editor.error = () => {}; } };
  }, [terrain, cache, editor]);
  const change = (fn: (view: SphericalView) => SphericalView) => commands.current.change(fn);
  const full = async () => {
    commands.current.stop();
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen(); }
    catch { setError('Fullscreen could not be changed. Continue in this window; terrain is preserved.'); }
  };
  const requestClose = () => { if (editor?.locked) return; commands.current.stop(); if (editor?.modified && !window.confirm(persistence ? 'Discard unsaved spherical changes? Save first to keep this sphere. Your planar map is preserved.' : 'Discard modified session-only spherical terrain? Spherical saving is not available yet. Your planar map is preserved.')) return; onClose(); };
  const saveSphere = () => { if (editor?.locked) return; commands.current.prepareSave(); persistence?.save(); };
  return <section ref={rootRef} className={styles.workspace} aria-label="Spherical development preview">
    <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} role="img" aria-label="Spherical terrain preview" aria-describedby="sphere-help" data-samples={terrain.sampleCount} data-authority-bytes={terrain.elevationByteLength} data-cache-bytes={cache.byteLength} data-preparation-ms={preparationMs} data-preparation-max-task-ms={maxPreparationTaskMs} data-radius={terrain.metadata.geometry.radiusMeters} data-resolution={terrain.metadata.representation.cellsPerEdge} />
    {editor && <svg className={styles.brushPreview} aria-hidden="true"><path ref={previewRef} fill="none" stroke="#fff0b0" strokeWidth="1.5" /></svg>}
    <header className={styles.header}><button disabled={persistence?.busy} onClick={requestClose}>Return to map</button><span>{editor ? 'Spherical editor' : 'Spherical preview'} <small>{persistence ? persistence.name : editor ? 'Blank sphere · session-only editing' : 'Session-only · viewing and inspection'}</small></span></header>
    <button ref={toggleRef} className={styles.toggle} aria-expanded={panel} aria-controls="sphere-controls" onClick={() => { commands.current.stop(); setPanel(!panel); }}>View controls</button>
    <aside ref={panelRef} id="sphere-controls" hidden={!panel} className={styles.panel} aria-label="Spherical view controls">
      <h2>Inspect this sphere</h2><p>Reference radius: {terrain.metadata.geometry.radiusMeters.toLocaleString()} m<br />{terrain.sampleCount.toLocaleString()} unique samples · N={terrain.metadata.representation.cellsPerEdge}</p>
      <p>{editor ? 'Blank ocean starts at −100 m with sea level 0. All views edit the same physical samples.' : 'Deterministic test geography crosses shared chart edges and corners. No Earth geography or scale is assumed.'}</p>
      <p id="sphere-help">{editor ? 'Select Raise, Lower, Smooth or Flatten to draw. Select Rotate / Pan, hold Space, or use two fingers to navigate. ' : ''}Drag to rotate the globe or pan the net. Pinch or wheel to zoom. Tap/click to select. On the focused canvas: arrow keys navigate, +/− zoom, Enter inspects the center, Home resets.</p>
      {editor && <SphericalBrushControls value={controls} radius={terrain.metadata.geometry.radiusMeters} onChange={(value) => { commands.current.stop(); setControls(value); }} />}
      {persistence && <SphericalStorageControls value={persistence} open={() => { commands.current.prepareSave(); persistence.open(persistence.selected); }} />}
      <p>Solid lines join faces. Dashed amber edges are visual cuts into adjoining geography, not world boundaries. Face labels name numerical charts of a round sphere.</p>
      <div className={styles.faces}>{CUBE_FACES.map((face) => <button key={face} onClick={() => change((view) => ({ ...recenterSphere(view, FACE_BASES[face].normal), mode: 'globe' }))}>View {face}</button>)}</div>
      <p>{persistence ? 'Save explicitly to this browser. Globe brushes are clipped to the visible hemisphere. Your planar map stays in place.' : editor ? 'Edits are session-only and cannot yet be saved or reopened. Globe brushes are clipped to the visible hemisphere. Your planar map stays in place.' : 'Preview terrain cannot be sculpted, saved or reopened. Your planar map remains in place behind this preview.'}</p>
      <button onClick={() => { setPanel(false); toggleRef.current?.focus(); }}>Close view controls</button>
    </aside>
    <div className={styles.views} role="group" aria-label="Spherical projection">
      <button aria-pressed={mode === 'globe'} onClick={() => change((view) => ({ ...view, mode: 'globe' }))}>Globe</button>
      <button aria-pressed={mode === 'net'} onClick={() => change((view) => ({ ...view, mode: 'net' }))}>Six-face net</button>
    </div>
    {editor && <><div className={styles.editorHud}><div className={styles.editingTools} role="group" aria-label="Spherical tools">{(['navigate', 'raise', 'lower', 'smooth', 'flatten'] as const).map((tool) => <button key={tool} disabled={persistence?.busy} aria-pressed={controls.tool === tool} onClick={() => { commands.current.stop(); setControls({ ...controls, tool }); }}>{tool === 'navigate' ? 'Rotate / Pan' : tool.charAt(0).toUpperCase() + tool.slice(1)}</button>)}</div>
      <p className={styles.editStatus} role="status" aria-label="Spherical work status" data-state={persistence?.phase}>{persistence?.busy || persistence?.phase === 'failed' ? persistence.message : editorState.busy ? 'Finishing numerical stroke…' : editorState.modified ? persistence ? 'Unsaved spherical changes' : 'Unsaved spherical changes · session-only' : persistence ? editor.hasSaved ? 'Saved on this device' : 'Unmodified blank ocean · not saved yet' : 'Unmodified blank ocean · session-only'}</p></div>
      {persistence && <button className={styles.saveButton} disabled={persistence.busy} onClick={saveSphere}>Save Sphere</button>}
      <div className={styles.history}><button aria-label="Spherical Undo" disabled={!editorState.canUndo || editorState.busy || persistence?.busy} onClick={() => commands.current.undo()}>Undo</button><button aria-label="Spherical Redo" disabled={!editorState.canRedo || editorState.busy || persistence?.busy} onClick={() => commands.current.redo()}>Redo</button></div>
      </>}
    <nav className={styles.navigation} aria-label="Spherical navigation">
      <button aria-label="Spherical Zoom Out" disabled={zoom <= 1} onClick={() => change((view) => zoomSphere(view, .8))}>−</button>
      <output aria-label="Spherical zoom">{Math.round(zoom * 100)}%</output>
      <button aria-label="Spherical Zoom In" disabled={zoom >= 4} onClick={() => change((view) => zoomSphere(view, 1.25))}>+</button>
      <button onClick={() => commands.current.reset()}>Reset View</button>
      <button disabled={!hasSelection} onClick={() => change((view) => ({ ...recenterSphere(view, selectedRef.current!), mode: 'globe' }))}>Center selection</button>
      {fullscreenSupported && <button aria-label={fullscreen ? 'Exit Spherical Fullscreen' : 'Spherical Fullscreen'} onClick={() => void full()}>⛶</button>}
    </nav>
    <output ref={readoutRef} className={styles.readout} aria-label="Spherical elevation" aria-live="off">Tap/click terrain to select a physical location. Elevations are meters relative to sea level 0.</output>
    <p className={styles.notice}>{persistence ? 'Browser-local sphere · Save explicitly · No autosave' : editor ? 'Session-only sphere · Save/Open follows in A6-E' : 'Development fixture · no sculpting or saving'}</p>
    {persistence?.error && <div className={styles.error} role="alert">{persistence.error}</div>}
    {error && <div className={styles.error} role="alert">{error}<button onClick={() => setError('')}>Dismiss preview message</button></div>}
  </section>;
}
