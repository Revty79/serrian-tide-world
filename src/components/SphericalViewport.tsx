'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { CUBE_FACES, FACE_BASES, FACE_EDGES, QUARTER_PI, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { attachSphericalNavigation } from '../interaction/spherical-navigation.ts';
import { renderSphericalGlobe, type SphericalDisplayCache } from '../rendering/spherical-raster.ts';
import { INITIAL_SPHERICAL_VIEW, inspectSphere, netEdgeIsJoined, netFaceCoordinates, netFaceRect, panSphereNet, projectSphere, recenterSphere, rotateSphere, sphericalLayout, unprojectSphere, zoomSphere, type ScreenPoint, type SphericalView } from '../rendering/spherical-view.ts';
import styles from './SphericalPreview.module.css';

export interface SphericalViewportProps { readonly terrain: SphericalTerrain; readonly cache: SphericalDisplayCache; readonly onClose: () => void; readonly preparationMs?: number }
export function SphericalViewport({ terrain, cache, onClose, preparationMs = 0 }: SphericalViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null), rootRef = useRef<HTMLElement>(null), readoutRef = useRef<HTMLOutputElement>(null);
  const viewRef = useRef<SphericalView>(INITIAL_SPHERICAL_VIEW), selectedRef = useRef<Vec3 | null>(null);
  const commands = useRef({ change(_fn: (view: SphericalView) => SphericalView) {}, inspect(_point: ScreenPoint, _select: boolean) {}, reset() {} });
  const [panel, setPanel] = useState(false), [mode, setMode] = useState<'globe' | 'net'>('globe'), [zoom, setZoom] = useState(1), [hasSelection, setHasSelection] = useState(false);
  const [fullscreen, setFullscreen] = useState(false), [fullscreenSupported, setFullscreenSupported] = useState(false), [error, setError] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null), panelRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current!, output = readoutRef.current!, root = rootRef.current!, context = canvas.getContext('2d')!;
    setFullscreenSupported(!!document.fullscreenEnabled && typeof root.requestFullscreen === 'function'); setFullscreen(!!document.fullscreenElement);
    const faceCanvases = Object.fromEntries(CUBE_FACES.map((face) => {
      const texture = cache.faces[face], image = document.createElement('canvas'); image.width = image.height = texture.side;
      image.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(texture.pixels), texture.side, texture.side), 0, 0); return [face, image];
    })) as Record<CubeFace, HTMLCanvasElement>;
    const scratch = document.createElement('canvas'), scratchContext = scratch.getContext('2d')!;
    let frame = 0, active = true, raster: Uint8ClampedArray | undefined, pendingInspection: { point: ScreenPoint; select: boolean } | undefined;
    let paints = 0, requests = 0, dirty = true, interactiveUntil = 0, refinementTimer = 0; const renderTimes: number[] = [];
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
      const start = performance.now(), viewport = size(), view = viewRef.current;
      if (viewport.width === 0 || viewport.height === 0) return;
      if (!dirty) {
        if (pendingInspection) { showInspection(unprojectSphere(terrain, pendingInspection.point, view, viewport), pendingInspection.select); pendingInspection = undefined; }
        return;
      }
      dirty = false;
      const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(3_000_000 / (viewport.width * viewport.height))), width = Math.floor(viewport.width * dpr), height = Math.floor(viewport.height * dpr);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.setTransform(width / viewport.width, 0, 0, height / viewport.height, 0, 0); context.clearRect(0, 0, viewport.width, viewport.height); context.imageSmoothingEnabled = true;
      if (view.mode === 'globe') {
        const mobile = matchMedia('(pointer: coarse)').matches, interactive = performance.now() < interactiveUntil;
        const result = renderSphericalGlobe(cache, view, viewport, mobile ? interactive ? 70_000 : 220_000 : interactive ? 180_000 : 420_000, raster);
        canvas.dataset.quality = interactive ? 'navigation' : 'settled';
        raster = result.pixels;
        if (scratch.width !== result.columns || scratch.height !== result.rows) { scratch.width = result.columns; scratch.height = result.rows; }
        scratchContext.putImageData(new ImageData(raster as Uint8ClampedArray<ArrayBuffer>, result.columns, result.rows), 0, 0);
        context.drawImage(scratch, result.left, result.top, result.width, result.height);
      } else {
        for (const face of CUBE_FACES) {
          const r = netFaceRect(face, view, viewport), image = faceCanvases[face];
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
    };
    const schedule = (redraw = true) => { dirty ||= redraw; requests++; if (!frame) frame = requestAnimationFrame(paint); };
    const change = (fn: (view: SphericalView) => SphericalView, interactive = false) => {
      viewRef.current = fn(viewRef.current); setMode(viewRef.current.mode); setZoom(viewRef.current.zoom);
      if (interactive) { interactiveUntil = performance.now() + 160; clearTimeout(refinementTimer); refinementTimer = window.setTimeout(() => schedule(), 180); }
      schedule();
    };
    const reset = () => change((view) => ({ ...INITIAL_SPHERICAL_VIEW, mode: view.mode }));
    const inspect = (point: ScreenPoint, select: boolean) => { pendingInspection = { point, select }; schedule(select); };
    commands.current = { change, inspect, reset };
    const navigation = attachSphericalNavigation(canvas, {
      drag(dx, dy) { change((view) => view.mode === 'globe' ? rotateSphere(view, dx / sphericalLayout(view, size()).radius, dy / sphericalLayout(view, size()).radius) : panSphereNet(view, dx, dy, size()), true); },
      zoom: (factor) => change((view) => zoomSphere(view, factor), true), inspect, reset,
    });
    const observer = new ResizeObserver(() => { navigation.cancel(); schedule(); }); observer.observe(root);
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); setError('Spherical preview is session-only. Saving is not available in this checkpoint.'); }
      if (event.key === 'Escape') { navigation.cancel(); setPanel(false); if (panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus(); }
    };
    window.addEventListener('keydown', key);
    const fullscreenChange = () => { setFullscreen(!!document.fullscreenElement); navigation.cancel(); schedule(); };
    document.addEventListener('fullscreenchange', fullscreenChange);
    schedule(); canvas.focus({ preventScroll: true });
    return () => { active = false; cancelAnimationFrame(frame); clearTimeout(refinementTimer); navigation.dispose(); observer.disconnect(); window.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', fullscreenChange); };
  }, [terrain, cache]);
  const change = (fn: (view: SphericalView) => SphericalView) => commands.current.change(fn);
  const full = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen(); }
    catch { setError('Fullscreen could not be changed. Continue in this window; terrain is preserved.'); }
  };
  return <section ref={rootRef} className={styles.workspace} aria-label="Spherical development preview">
    <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} role="img" aria-label="Spherical terrain preview" aria-describedby="sphere-help" data-samples={terrain.sampleCount} data-authority-bytes={terrain.elevationByteLength} data-cache-bytes={cache.byteLength} data-preparation-ms={preparationMs} data-radius={terrain.metadata.geometry.radiusMeters} data-resolution={terrain.metadata.representation.cellsPerEdge} />
    <header className={styles.header}><button onClick={onClose}>Return to map</button><span>Spherical preview <small>Session-only · viewing and inspection</small></span></header>
    <button ref={toggleRef} className={styles.toggle} aria-expanded={panel} aria-controls="sphere-controls" onClick={() => { setPanel(!panel); if (!panel) requestAnimationFrame(() => panelRef.current?.querySelector('button')?.focus()); }}>View controls</button>
    <aside ref={panelRef} id="sphere-controls" hidden={!panel} className={styles.panel} aria-label="Spherical view controls">
      <h2>Inspect this sphere</h2><p>Reference radius: {terrain.metadata.geometry.radiusMeters.toLocaleString()} m<br />{terrain.sampleCount.toLocaleString()} unique samples · N={terrain.metadata.representation.cellsPerEdge}</p>
      <p>Deterministic test geography crosses shared chart edges and corners. No Earth geography or scale is assumed.</p>
      <p id="sphere-help">Drag to rotate the globe or pan the net. Pinch or wheel to zoom. Tap/click to select. On the focused canvas: arrow keys navigate, +/− zoom, Enter inspects the center, Home resets.</p>
      <p>Solid lines join faces. Dashed amber edges are visual cuts into adjoining geography, not world boundaries. Face labels name numerical charts of a round sphere.</p>
      <div className={styles.faces}>{CUBE_FACES.map((face) => <button key={face} onClick={() => change((view) => ({ ...recenterSphere(view, FACE_BASES[face].normal), mode: 'globe' }))}>View {face}</button>)}</div>
      <p>Preview terrain cannot be sculpted, saved or reopened. Your planar map remains in place behind this preview.</p>
      <button onClick={() => { setPanel(false); toggleRef.current?.focus(); }}>Close view controls</button>
    </aside>
    <div className={styles.views} role="group" aria-label="Spherical projection">
      <button aria-pressed={mode === 'globe'} onClick={() => change((view) => ({ ...view, mode: 'globe' }))}>Globe</button>
      <button aria-pressed={mode === 'net'} onClick={() => change((view) => ({ ...view, mode: 'net' }))}>Six-face net</button>
    </div>
    <nav className={styles.navigation} aria-label="Spherical navigation">
      <button aria-label="Spherical Zoom Out" disabled={zoom <= 1} onClick={() => change((view) => zoomSphere(view, .8))}>−</button>
      <output aria-label="Spherical zoom">{Math.round(zoom * 100)}%</output>
      <button aria-label="Spherical Zoom In" disabled={zoom >= 4} onClick={() => change((view) => zoomSphere(view, 1.25))}>+</button>
      <button onClick={() => commands.current.reset()}>Reset View</button>
      <button disabled={!hasSelection} onClick={() => change((view) => ({ ...recenterSphere(view, selectedRef.current!), mode: 'globe' }))}>Center selection</button>
      {fullscreenSupported && <button aria-label={fullscreen ? 'Exit Spherical Fullscreen' : 'Spherical Fullscreen'} onClick={() => void full()}>⛶</button>}
    </nav>
    <output ref={readoutRef} className={styles.readout} aria-label="Spherical elevation" aria-live="off">Tap/click terrain to select a physical location. Elevations are meters relative to sea level 0.</output>
    <p className={styles.notice}>Development fixture · no sculpting or saving</p>
    {error && <div className={styles.error} role="alert">{error}<button onClick={() => setError('')}>Dismiss preview message</button></div>}
  </section>;
}
