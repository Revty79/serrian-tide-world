'use client';

import { useId, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react';
import type { Terrain } from '../terrain/model.ts';
import type { BrushSettings } from '../terrain/brush.ts';
import { renderTerrain } from '../rendering/canvas-renderer.ts';
import { attachCanvasSculpting } from '../interaction/canvas-sculpting.ts';
import { attachCanvasNavigation } from '../interaction/canvas-navigation.ts';
import { fitMap } from '../rendering/fit-map.ts';
import { FIT_CAMERA, cameraRect, constrainCamera, panBy, zoomAt, type Camera } from '../rendering/camera.ts';
import { inspectElevation, type ElevationSample, type Point } from '../terrain/sampling.ts';
import styles from './TerrainCanvas.module.css';

export interface TerrainCanvasHandle { finishInteraction(): void; zoom(factor: number): void; fit(): void }
export interface TerrainCanvasProps {
  terrain: Terrain;
  brush?: BrushSettings;
  revision?: number;
  pan?: boolean;
  fullscreen?: boolean;
  ref?: Ref<TerrainCanvasHandle>;
  onStrokeBegin?: () => void;
  onStrokeEnd?: () => void;
  onZoom?: (zoom: number) => void;
}

/** Embeddable client view. The host owns document, history, access and persistence. */
export function TerrainCanvas(props: TerrainCanvasProps) {
  const { terrain, brush, revision = 0, fullscreen = false } = props;
  const surfaceRef = useRef<HTMLDivElement>(null), viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null), cursorRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLOutputElement>(null);
  const samplePointRef = useRef<Point | null>(null);
  const propsRef = useRef(props);
  const cameraRef = useRef<Camera>(FIT_CAMERA);
  const actionRef = useRef<TerrainCanvasHandle>({ finishInteraction() {}, zoom() {}, fit() {} });
  const repaintRef = useRef<() => void>(() => {});
  const descriptionId = useId();
  const [renderError, setRenderError] = useState<string | null>(null);
  const [brushError, setBrushError] = useState<string | null>(null);
  const error = renderError ?? brushError;
  useImperativeHandle(props.ref, () => ({
    finishInteraction: () => actionRef.current.finishInteraction(),
    zoom: (factor) => actionRef.current.zoom(factor), fit: () => actionRef.current.fit(),
  }), []);
  useLayoutEffect(() => { propsRef.current = props; });
  useLayoutEffect(() => { setBrushError(null); }, [brush]);
  useLayoutEffect(() => { actionRef.current.finishInteraction(); repaintRef.current(); }, [revision]);
  useLayoutEffect(() => { if (!brush || props.pan) actionRef.current.finishInteraction(); }, [!!brush, props.pan]);

  useLayoutEffect(() => {
    const surface = surfaceRef.current, viewport = viewportRef.current, canvas = canvasRef.current, cursor = cursorRef.current;
    if (!surface || !viewport || !canvas || !cursor) return;
    cameraRef.current = FIT_CAMERA;
    propsRef.current.onZoom?.(1);
    let frame: number | null = null;
    let rasterDirty = true;
    let rasterWidth = 0, rasterHeight = 0, rasterRatio = 0;
    const reportSample = (sample: ElevationSample | null) => {
      samplePointRef.current = sample?.position ?? null;
      if (readoutRef.current) readoutRef.current.textContent = sample
        ? `X ${sample.position.x.toFixed(3)} · Y ${sample.position.y.toFixed(3)} map units · ${sample.elevation.toLocaleString(undefined, { maximumFractionDigits: 1 })} m · ${sample.seaLevelRelation === 'above' ? 'Above' : sample.seaLevelRelation === 'below' ? 'Below' : 'At'} sea level`
        : 'Move over the map to inspect elevation';
    };
    const stageSize = () => surface.getBoundingClientRect();
    const paint = () => {
      frame = null;
      const size = stageSize();
      if (size.width <= 0 || size.height <= 0) return;
      try {
        const fitted = fitMap(terrain.metadata.dimensions, size);
        cameraRef.current = constrainCamera(cameraRef.current, terrain.metadata.dimensions, size);
        const rect = cameraRect(cameraRef.current, terrain.metadata.dimensions, size);
        viewport.style.left = `${rect.left}px`; viewport.style.top = `${rect.top}px`;
        viewport.style.width = `${fitted.width}px`; viewport.style.height = `${fitted.height}px`;
        viewport.style.transform = `scale(${cameraRef.current.zoom})`;
        const ratio = window.devicePixelRatio || 1;
        if (rasterDirty || fitted.width !== rasterWidth || fitted.height !== rasterHeight || ratio !== rasterRatio) {
          renderTerrain(canvas, terrain, fitted, ratio);
          rasterDirty = false; rasterWidth = fitted.width; rasterHeight = fitted.height; rasterRatio = ratio;
        }
        if (samplePointRef.current) reportSample(inspectElevation(terrain, samplePointRef.current));
        setRenderError(null);
      } catch (cause) { setRenderError(cause instanceof Error ? cause.message : 'The map could not be displayed.'); }
    };
    const requestPaint = () => { if (frame === null) frame = window.requestAnimationFrame(paint); };
    const requestRaster = () => { rasterDirty = true; requestPaint(); };
    repaintRef.current = requestRaster;
    const changeCamera = (next: Camera) => {
      cameraRef.current = next; cursor.hidden = true; reportSample(null);
      propsRef.current.onZoom?.(next.zoom); requestPaint();
    };
    const navigation = attachCanvasNavigation(surface, canvas, {
      isPan: () => !!propsRef.current.pan,
      finishStroke: () => sculpting.finish(),
      pan: (delta) => changeCamera(panBy(cameraRef.current, delta, terrain.metadata.dimensions, stageSize())),
      zoom: (factor, point) => changeCamera(zoomAt(cameraRef.current, cameraRef.current.zoom * factor, point, terrain.metadata.dimensions, stageSize())),
    });
    let strokeFinished: (() => void) | undefined;
    const sculpting = attachCanvasSculpting(canvas, {
      terrain, cursor, getBrush: () => navigation.blocked() ? undefined : propsRef.current.brush,
      onStrokeBegin: () => { strokeFinished = propsRef.current.onStrokeEnd; propsRef.current.onStrokeBegin?.(); },
      onStrokeEnd: () => { const callback = strokeFinished; strokeFinished = undefined; callback?.(); },
      onChange: () => { setBrushError(null); requestRaster(); },
      onError: (cause) => setBrushError(cause instanceof Error ? cause.message : 'The brush could not be applied.'),
      onSample: reportSample,
    });
    const finishInteraction = () => { sculpting.finish(); navigation.finish(); };
    actionRef.current = {
      finishInteraction,
      zoom: (factor) => { finishInteraction(); const size = stageSize(); changeCamera(zoomAt(cameraRef.current, cameraRef.current.zoom * factor, { x: size.width / 2, y: size.height / 2 }, terrain.metadata.dimensions, size)); },
      fit: () => { finishInteraction(); changeCamera(FIT_CAMERA); },
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
          <canvas className={styles.canvas} ref={canvasRef} data-editable={!!brush && !props.pan} data-pan={!!props.pan} role="img" tabIndex={0}
            aria-label="Atlas terrain map" aria-describedby={descriptionId}>
            An elevation map showing water and land. A visual browser canvas is required.
          </canvas>
          <div ref={cursorRef} className={styles.brushCursor} aria-hidden="true" hidden />
        </div>
        <p id={descriptionId} className={styles.description}>
          Elevation map: water at or below sea level, land above sea level. Wheel to zoom; Space and drag or two fingers to navigate.
          {brush && !props.pan && ` ${brush.tool.charAt(0).toUpperCase() + brush.tool.slice(1)} selected. Click or drag with a mouse, pen, or one finger to sculpt terrain. Settings apply to the next stroke.`}
          {props.pan && ' Pan selected. Drag to move the map without sculpting.'}
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <output ref={readoutRef} className={styles.readout} aria-label="Terrain elevation" aria-live="off">Move over the map to inspect elevation</output>
    </div>
  );
}
