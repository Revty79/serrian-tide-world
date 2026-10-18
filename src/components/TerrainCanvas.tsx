'use client';

import { useId, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react';
import type { Terrain } from '../terrain/model.ts';
import type { BrushSettings } from '../terrain/brush.ts';
import { renderTerrain, renderWrappedView, terrainRasterCanvas } from '../rendering/canvas-renderer.ts';
import { isWrapped } from '../terrain/topology.ts';
import { attachCanvasSculpting } from '../interaction/canvas-sculpting.ts';
import { attachCanvasNavigation } from '../interaction/canvas-navigation.ts';
import { fitMap } from '../rendering/fit-map.ts';
import { FIT_CAMERA, cameraRect, constrainCamera, panBy, zoomAt, type Camera, type ViewMode } from '../rendering/camera.ts';
import { periodicStrokeOffset } from '../rendering/edge-pan.ts';
import { periodicContextFrame } from '../rendering/periodic-view.ts';
import { inspectElevation, type ElevationSample, type Point } from '../terrain/sampling.ts';
import styles from './TerrainCanvas.module.css';

export interface TerrainCanvasHandle { finishInteraction(): void; zoom(factor: number): void; fit(): void; fill(): void; focus(): void }
export interface TerrainCanvasProps {
  terrain: Terrain;
  brush?: BrushSettings;
  revision?: number;
  pan?: boolean;
  fullscreen?: boolean;
  initialView?: ViewMode;
  edgePan?: boolean;
  ref?: Ref<TerrainCanvasHandle>;
  onStrokeBegin?: () => void;
  onStrokeEnd?: () => void;
  onZoom?: (zoom: number) => void;
  onViewChange?: (mode: ViewMode) => void;
}

/** Embeddable client view. The host owns document, history, access and persistence. */
export function TerrainCanvas(props: TerrainCanvasProps) {
  const { terrain, brush, revision = 0, fullscreen = false } = props;
  const surfaceRef = useRef<HTMLDivElement>(null), viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null), cursorRef = useRef<HTMLDivElement>(null);
  const seamsRef = useRef<HTMLSpanElement>(null);
  const contextRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLOutputElement>(null);
  const samplePointRef = useRef<Point | null>(null);
  const propsRef = useRef(props);
  const cameraRef = useRef<Camera>(FIT_CAMERA);
  const actionRef = useRef<TerrainCanvasHandle>({ finishInteraction() {}, zoom() {}, fit() {}, fill() {}, focus() {} });
  const repaintRef = useRef<() => void>(() => {});
  const descriptionId = useId();
  const [renderError, setRenderError] = useState<string | null>(null);
  const [brushError, setBrushError] = useState<string | null>(null);
  const error = renderError ?? brushError;
  useImperativeHandle(props.ref, () => ({
    finishInteraction: () => actionRef.current.finishInteraction(),
    zoom: (factor) => actionRef.current.zoom(factor), fit: () => actionRef.current.fit(), fill: () => actionRef.current.fill(), focus: () => actionRef.current.focus(),
  }), []);
  useLayoutEffect(() => { propsRef.current = props; });
  useLayoutEffect(() => { setBrushError(null); }, [brush]);
  useLayoutEffect(() => { actionRef.current.finishInteraction(); repaintRef.current(); }, [revision]);
  useLayoutEffect(() => { if (!brush || props.pan) actionRef.current.finishInteraction(); }, [!!brush, props.pan]);
  useLayoutEffect(() => { actionRef.current.finishInteraction(); }, [brush?.tool]);

  useLayoutEffect(() => {
    const surface = surfaceRef.current, viewport = viewportRef.current, canvas = canvasRef.current, cursor = cursorRef.current;
    if (!surface || !viewport || !canvas || !cursor) return;
    cameraRef.current = FIT_CAMERA;
    propsRef.current.onZoom?.(1);
    let frame: number | null = null;
    let rasterDirty = true;
    let rasterWidth = 0, rasterHeight = 0, rasterRatio = 0;
    const periodic = isWrapped(terrain);
    let mode = propsRef.current.initialView ?? 'fit';
    if (!periodic && mode === 'focus') mode = 'fill';
    propsRef.current.onViewChange?.(mode);
    const viewOptions = () => ({ mode, periodicU: periodic });
    let appliedRect: ReturnType<typeof cameraRect> | null = null;
    let sourceRaster: HTMLCanvasElement | null = null;
    const reportSample = (sample: ElevationSample | null) => {
      samplePointRef.current = sample?.position ?? null;
      if (readoutRef.current) readoutRef.current.textContent = sample
        ? `X ${sample.position.x.toFixed(3)} · Y ${sample.position.y.toFixed(3)} map units · ${sample.elevation.toLocaleString(undefined, { maximumFractionDigits: 1 })} m · ${sample.seaLevelRelation === 'above' ? 'Above' : sample.seaLevelRelation === 'below' ? 'Below' : 'At'} sea level`
        : 'Move over the map to inspect elevation';
    };
    const stageSize = () => surface.getBoundingClientRect();
    const paint = (preserveStroke = false) => {
      frame = null;
      const size = stageSize();
      if (size.width <= 0 || size.height <= 0) return;
      try {
        const fitted = fitMap(terrain.metadata.dimensions, size);
        cameraRef.current = constrainCamera(cameraRef.current, terrain.metadata.dimensions, size, viewOptions());
        const rect = cameraRect(cameraRef.current, terrain.metadata.dimensions, size, viewOptions());
        if (!preserveStroke && appliedRect && (rect.left !== appliedRect.left || rect.top !== appliedRect.top || rect.width !== appliedRect.width || rect.height !== appliedRect.height)) sculpting.finish();
        appliedRect = rect;
        canvas.dataset.viewMode = mode;
        canvas.dataset.mapLeft = String(rect.left); canvas.dataset.mapTop = String(rect.top);
        canvas.dataset.mapWidth = String(rect.width); canvas.dataset.mapHeight = String(rect.height);
        if (seamsRef.current) {
          seamsRef.current.hidden = !periodic || mode === 'focus' || rect.width < 24;
          seamsRef.current.style.backgroundSize = `${rect.width}px 100%`;
          seamsRef.current.style.backgroundPosition = `${rect.left}px 0`;
          seamsRef.current.style.clipPath = `inset(${Math.max(0, rect.top)}px 0 ${Math.max(0, size.height - rect.top - rect.height)}px 0)`;
        }
        if (contextRef.current) {
          const context = periodicContextFrame(rect.width, size.width);
          contextRef.current.hidden = !periodic || mode !== 'focus' || context.previewWidth < 1;
          contextRef.current.style.setProperty('--preview-width', `${context.previewWidth}px`);
        }
        viewport.style.left = `${periodic ? 0 : rect.left}px`; viewport.style.top = `${periodic ? 0 : rect.top}px`;
        viewport.style.width = `${periodic ? size.width : fitted.width}px`; viewport.style.height = `${periodic ? size.height : fitted.height}px`;
        viewport.style.transform = periodic ? 'none' : `scale(${rect.width / fitted.width})`;
        const ratio = window.devicePixelRatio || 1;
        if (periodic) {
          if (rasterDirty || !sourceRaster) sourceRaster = terrainRasterCanvas(canvas, terrain, true);
          renderWrappedView(canvas, sourceRaster, rect, size, ratio);
          rasterDirty = false;
        } else if (rasterDirty || fitted.width !== rasterWidth || fitted.height !== rasterHeight || ratio !== rasterRatio) {
          renderTerrain(canvas, terrain, fitted, ratio, true);
          rasterDirty = false; rasterWidth = fitted.width; rasterHeight = fitted.height; rasterRatio = ratio;
        }
        if (samplePointRef.current) reportSample(inspectElevation(terrain, samplePointRef.current));
        setRenderError(null);
      } catch (cause) { setRenderError(cause instanceof Error ? cause.message : 'The map could not be displayed.'); }
    };
    const requestPaint = () => { if (frame === null) frame = window.requestAnimationFrame(() => paint()); };
    const requestRaster = () => { rasterDirty = true; requestPaint(); };
    repaintRef.current = requestRaster;
    const changeCamera = (next: Camera) => {
      cameraRef.current = next; cursor.hidden = true; reportSample(null);
      propsRef.current.onZoom?.(next.zoom); requestPaint();
    };
    const navigation = attachCanvasNavigation(surface, canvas, {
      isPan: () => !!propsRef.current.pan,
      finishStroke: () => sculpting.finish(),
      pan: (delta) => changeCamera(panBy(cameraRef.current, delta, terrain.metadata.dimensions, stageSize(), viewOptions())),
      zoom: (factor, point) => changeCamera(zoomAt(cameraRef.current, cameraRef.current.zoom * factor, point, terrain.metadata.dimensions, stageSize(), viewOptions())),
    });
    let strokeFinished: (() => void) | undefined;
    const sculpting = attachCanvasSculpting(canvas, {
      terrain, cursor, getBrush: () => navigation.blocked() ? undefined : propsRef.current.brush,
      onStrokeBegin: () => { strokeFinished = propsRef.current.onStrokeEnd; propsRef.current.onStrokeBegin?.(); },
      onStrokeEnd: () => { canvas.dataset.edgeScrolling = 'false'; const callback = strokeFinished; strokeFinished = undefined; callback?.(); },
      onChange: () => { setBrushError(null); requestRaster(); },
      onError: (cause) => setBrushError(cause instanceof Error ? cause.message : 'The brush could not be applied.'),
      onSample: reportSample,
      getMapBounds: () => { const stage = stageSize(); const rect = appliedRect ?? cameraRect(cameraRef.current, terrain.metadata.dimensions, stage, viewOptions()); return new DOMRect(stage.left + rect.left, stage.top + rect.top, rect.width, rect.height); },
      getStageBounds: stageSize,
      edgePanEnabled: () => !!propsRef.current.edgePan,
      panView: (delta) => {
        if (!appliedRect) return null;
        const previous = appliedRect;
        cameraRef.current = panBy(cameraRef.current, delta, terrain.metadata.dimensions, stageSize(), viewOptions());
        const next = cameraRect(cameraRef.current, terrain.metadata.dimensions, stageSize(), viewOptions());
        if (next.left === previous.left && next.top === previous.top) return null;
        // Paint and pointer inversion advance together. Only this intentional
        // translation may preserve a stroke; zoom, resize and manual pan end it.
        if (frame !== null) window.cancelAnimationFrame(frame);
        if (next.width !== previous.width || next.height !== previous.height) { paint(); return null; }
        paint(true);
        canvas.dataset.edgeScrolling = 'true';
        return { offsetX: periodic ? periodicStrokeOffset(previous.left, next.left, delta.x, next.width, terrain.metadata.dimensions.width) : 0 };
      },
      onPreview: periodic ? (event, settings) => {
        const stage = stageSize(), rect = appliedRect;
        if (!settings || !rect || event.clientY < stage.top + rect.top || event.clientY > stage.top + rect.top + rect.height) { cursor.hidden = true; return; }
        const radiusX = settings.radius / terrain.metadata.dimensions.width * rect.width, radiusY = settings.radius / terrain.metadata.dimensions.height * rect.height;
        const x = event.clientX - stage.left, y = event.clientY - stage.top;
        const first = Math.ceil((-radiusX - x) / rect.width), last = Math.floor((stage.width + radiusX - x) / rect.width);
        // Avoid unbounded DOM work (or non-advancing huge integer indices) for
        // programmatic maps with subpixel horizontal periods. Normal views show every ring.
        if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || last - first > 1023) { cursor.hidden = true; return; }
        const rings: HTMLDivElement[] = [];
        for (let copy = first; copy <= last; copy++) {
          const ring = canvas.ownerDocument.createElement('div'); ring.className = styles.brushCursor ?? '';
          ring.style.left = `${x + copy * rect.width}px`; ring.style.top = `${y}px`;
          ring.style.width = `${2 * radiusX}px`; ring.style.height = `${2 * radiusY}px`; rings.push(ring);
        }
        cursor.replaceChildren(...rings);
        cursor.style.clipPath = `inset(${Math.max(0, rect.top)}px 0 ${Math.max(0, stage.height - rect.top - rect.height)}px 0)`;
        cursor.hidden = false;
      } : undefined,
    });
    const finishInteraction = () => { sculpting.finish(); navigation.finish(); };
    actionRef.current = {
      finishInteraction,
      zoom: (factor) => { finishInteraction(); const size = stageSize(); changeCamera(zoomAt(cameraRef.current, cameraRef.current.zoom * factor, { x: size.width / 2, y: size.height / 2 }, terrain.metadata.dimensions, size, viewOptions())); },
      fit: () => { finishInteraction(); mode = 'fit'; propsRef.current.onViewChange?.(mode); changeCamera(FIT_CAMERA); },
      fill: () => { finishInteraction(); mode = 'fill'; propsRef.current.onViewChange?.(mode); changeCamera({ ...cameraRef.current, zoom: 1 }); },
      focus: () => { if (!periodic) return; finishInteraction(); mode = 'focus'; propsRef.current.onViewChange?.(mode); changeCamera({ ...cameraRef.current, zoom: 1 }); },
    };
    requestPaint();
    const observer = new ResizeObserver(requestPaint); observer.observe(surface);
    window.addEventListener('resize', requestPaint);
    return () => {
      navigation.dispose(); sculpting.dispose(); observer.disconnect();
      window.removeEventListener('resize', requestPaint);
      if (frame !== null) window.cancelAnimationFrame(frame);
      repaintRef.current = () => {};
    };
  }, [terrain]);

  return (
    <div className={`${styles.terrainView} ${fullscreen ? styles.fullscreen : ''}`}>
      <div ref={surfaceRef} className={styles.mapSurface} aria-label="Map display area">
        <div ref={viewportRef} className={styles.mapViewport}>
          <canvas className={styles.canvas} ref={canvasRef} data-editable={!!brush && !props.pan} data-pan={!!props.pan} data-topology={isWrapped(terrain) ? 'horizontal-periodic' : 'bounded'} role="img" tabIndex={0}
            aria-label="Atlas terrain map" aria-describedby={descriptionId}>
            An elevation map showing water and land. A visual browser canvas is required.
          </canvas>
          <div ref={cursorRef} className={isWrapped(terrain) ? styles.cursorLayer : styles.brushCursor} aria-hidden="true" hidden />
        </div>
        <span ref={seamsRef} className={styles.seams} aria-hidden="true" hidden />
        <span ref={contextRef} className={styles.focusContext} aria-hidden="true" hidden>
          <span className={styles.contextPreview} data-context-preview="left" />
          <span className={styles.contextPreview} data-context-preview="right" />
        </span>
        <p id={descriptionId} className={styles.description}>
          Elevation map: water at or below sea level, land above sea level. Wheel to zoom; Space and drag or two fingers to navigate.
          {brush && !props.pan && ` ${brush.tool.charAt(0).toUpperCase() + brush.tool.slice(1)} selected. Click or drag with a mouse, pen, or one finger to sculpt terrain. Settings apply to the next stroke.`}
          {props.pan && ' Pan selected. Drag to move the map without sculpting.'}
          {isWrapped(terrain) && ' This surface connects horizontally. Its top and bottom are bounded. Visible repetitions share the same terrain.'}
          {isWrapped(terrain) && ' Focus Editing enlarges a centered working period with adjoining previews where space allows. Pan to move its geographic cut; Fill View restores full-height context, and Fit Entire Map shows the complete extent.'}
          {props.edgePan && ' Hold a stroke near a screen edge to scroll after a short pause. Escape ends the stroke. Edge scrolling can be switched off in tools.'}
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <output ref={readoutRef} className={styles.readout} aria-label="Terrain elevation" aria-live="off">Move over the map to inspect elevation</output>
    </div>
  );
}
