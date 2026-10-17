'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Terrain } from '../terrain/model.ts';
import type { BrushSettings } from '../terrain/brush.ts';
import { renderTerrain } from '../rendering/canvas-renderer.ts';
import { attachCanvasSculpting } from '../interaction/canvas-sculpting.ts';
import styles from './TerrainCanvas.module.css';

export interface TerrainCanvasProps {
  terrain: Terrain;
  brush?: BrushSettings;
}

/** Embeddable client view. The host owns terrain identity, access, loading, and persistence. */
export function TerrainCanvas({ terrain, brush }: TerrainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const brushRef = useRef(brush);
  const descriptionId = useId();
  const [renderError, setRenderError] = useState<string | null>(null);
  const [brushError, setBrushError] = useState<string | null>(null);
  const error = renderError ?? brushError;
  const editable = !!brush;

  useEffect(() => { brushRef.current = brush; setBrushError(null); }, [brush]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!canvas || !cursor) return;
    let frame: number | null = null;

    const paint = () => {
      frame = null;
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      try {
        renderTerrain(canvas, terrain, { width, height }, window.devicePixelRatio || 1);
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
    observer.observe(canvas);
    window.addEventListener('resize', requestPaint);
    const detach = attachCanvasSculpting(canvas, {
      terrain, cursor, getBrush: () => brushRef.current,
      onChange: () => { setBrushError(null); requestPaint(); },
      onError: (cause) => setBrushError(cause instanceof Error ? cause.message : 'The brush could not be applied.'),
    });
    return () => {
      detach();
      observer.disconnect();
      window.removeEventListener('resize', requestPaint);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [terrain, editable]);

  return (
    <div className={styles.mapSurface}>
      <canvas className={styles.canvas} ref={canvasRef} data-editable={editable} role="img"
        aria-label="Atlas terrain map" aria-describedby={descriptionId}>
        An elevation map showing water and land. A visual browser canvas is required.
      </canvas>
      <div ref={cursorRef} className={styles.brushCursor} aria-hidden="true" hidden />
      <p id={descriptionId} className={styles.description}>
        Elevation map: water at or below sea level, land above sea level.
        {brush && ` ${brush.tool === 'raise' ? 'Raise' : 'Lower'} selected. Click or drag with a mouse, pen, or one finger to sculpt terrain. Settings apply to the next stroke.`}
      </p>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
