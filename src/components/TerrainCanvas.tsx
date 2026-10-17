'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { Terrain } from '../terrain/model.ts';
import type { BrushSettings } from '../terrain/brush.ts';
import { renderTerrain } from '../rendering/canvas-renderer.ts';
import { attachCanvasSculpting } from '../interaction/canvas-sculpting.ts';
import { fitMap } from '../rendering/fit-map.ts';
import { inspectElevation, type ElevationSample, type Point } from '../terrain/sampling.ts';
import styles from './TerrainCanvas.module.css';

export interface TerrainCanvasProps {
  terrain: Terrain;
  brush?: BrushSettings;
  /** Host increments this after explicit external mutations, such as a reset. */
  revision?: number;
}

/** Embeddable client view. The host owns terrain identity, access, loading, and persistence. */
export function TerrainCanvas({ terrain, brush, revision = 0 }: TerrainCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLOutputElement>(null);
  const samplePointRef = useRef<Point | null>(null);
  const brushRef = useRef(brush);
  const descriptionId = useId();
  const [renderError, setRenderError] = useState<string | null>(null);
  const [brushError, setBrushError] = useState<string | null>(null);
  const error = renderError ?? brushError;
  const editable = !!brush;

  useLayoutEffect(() => { brushRef.current = brush; setBrushError(null); }, [brush]);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!surface || !viewport || !canvas || !cursor) return;
    let frame: number | null = null;
    const reportSample = (sample: ElevationSample | null) => {
      samplePointRef.current = sample?.position ?? null;
      if (readoutRef.current) {
        readoutRef.current.textContent = sample
          ? `X ${sample.position.x.toFixed(3)} · Y ${sample.position.y.toFixed(3)} map units · ${sample.elevation.toLocaleString(undefined, { maximumFractionDigits: 1 })} m · ${sample.seaLevelRelation === 'above' ? 'Above' : sample.seaLevelRelation === 'below' ? 'Below' : 'At'} sea level`
          : 'Move over the map to inspect elevation';
      }
    };

    const paint = () => {
      frame = null;
      const { width, height } = surface.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      try {
        const fitted = fitMap(terrain.metadata.dimensions, { width, height });
        viewport.style.left = `${fitted.left}px`;
        viewport.style.top = `${fitted.top}px`;
        viewport.style.width = `${fitted.width}px`;
        viewport.style.height = `${fitted.height}px`;
        renderTerrain(canvas, terrain, fitted, window.devicePixelRatio || 1);
        if (samplePointRef.current) reportSample(inspectElevation(terrain, samplePointRef.current));
        setRenderError(null);
      } catch (cause) {
        setRenderError(cause instanceof Error ? cause.message : 'The map could not be displayed.');
      }
    };

    const requestPaint = () => {
      if (frame === null) frame = window.requestAnimationFrame(paint);
    };
    requestPaint();
    const observer = new ResizeObserver(requestPaint);
    observer.observe(surface);
    window.addEventListener('resize', requestPaint);
    const detach = attachCanvasSculpting(canvas, {
      terrain, cursor, getBrush: () => brushRef.current,
      onChange: () => { setBrushError(null); requestPaint(); },
      onError: (cause) => setBrushError(cause instanceof Error ? cause.message : 'The brush could not be applied.'),
      onSample: reportSample,
    });
    return () => {
      detach();
      observer.disconnect();
      window.removeEventListener('resize', requestPaint);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [terrain, editable, revision]);

  return (
    <div className={styles.terrainView}>
      <div ref={surfaceRef} className={styles.mapSurface} aria-label="Map display area">
        <div ref={viewportRef} className={styles.mapViewport}>
          <canvas className={styles.canvas} ref={canvasRef} data-editable={editable} role="img"
            aria-label="Atlas terrain map" aria-describedby={descriptionId}>
            An elevation map showing water and land. A visual browser canvas is required.
          </canvas>
          <div ref={cursorRef} className={styles.brushCursor} aria-hidden="true" hidden />
        </div>
        <p id={descriptionId} className={styles.description}>
          Elevation map: water at or below sea level, land above sea level.
          {brush && ` ${brush.tool.charAt(0).toUpperCase() + brush.tool.slice(1)} selected. Click or drag with a mouse, pen, or one finger to sculpt terrain. Settings apply to the next stroke.`}
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <output ref={readoutRef} className={styles.readout} aria-label="Terrain elevation" aria-live="off">
        Move over the map to inspect elevation
      </output>
    </div>
  );
}
