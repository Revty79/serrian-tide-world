'use client';

import { useEffect, useRef, useState } from 'react';
import type { Terrain } from '../terrain/model.ts';
import { renderTerrain } from '../rendering/canvas-renderer.ts';
import styles from './TerrainCanvas.module.css';

export interface TerrainCanvasProps {
  terrain: Terrain;
}

/** Embeddable client view. The host owns terrain identity, access, loading, and persistence. */
export function TerrainCanvas({ terrain }: TerrainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      try {
        renderTerrain(canvas, terrain, { width, height }, window.devicePixelRatio || 1);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'The map could not be displayed.');
      }
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    window.addEventListener('resize', paint);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', paint);
    };
  }, [terrain]);

  return (
    <div className={styles.mapSurface}>
      <canvas className={styles.canvas} ref={canvasRef} role="img" aria-label="Atlas map: a blank, uninterrupted ocean">
        A blank ocean. All terrain elevations begin below sea level.
      </canvas>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
