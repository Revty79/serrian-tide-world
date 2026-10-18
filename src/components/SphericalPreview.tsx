'use client';

import { useEffect, useState } from 'react';
import { CUBE_FACES, type CubeFace } from '../surfaces/cube-sphere.ts';
import { createSphericalTerrain, type SphericalTerrain } from '../terrain/spherical.ts';
import { fillSphericalPreviewRange } from '../terrain/spherical-preview-fixture.ts';
import { buildSphericalFaceTexture, makeSphericalDisplayCache, type FaceTexture, type SphericalDisplayCache } from '../rendering/spherical-raster.ts';
import { SphericalViewport } from './SphericalViewport.tsx';
import styles from './SphericalPreview.module.css';

export interface SphericalPreviewProps { readonly radiusMeters: number; readonly cellsPerEdge: number; readonly onClose: () => void }
/** Replaceable development host. Provider/identity creation, fixture setup and display lifetime stay outside the viewport. */
export function SphericalPreview({ radiusMeters, cellsPerEdge, onClose }: SphericalPreviewProps) {
  const [ready, setReady] = useState<{ terrain: SphericalTerrain; cache: SphericalDisplayCache; preparationMs: number }>();
  const [progress, setProgress] = useState('Preparing session-only terrain…'), [error, setError] = useState('');
  useEffect(() => {
    let active = true, frame = 0;
    const nextFrame = () => new Promise<void>((resolve) => { frame = requestAnimationFrame(() => resolve()); });
    void (async () => {
      try {
        const start = performance.now();
        const terrain = createSphericalTerrain({ terrainId: crypto.randomUUID(), identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, radiusMeters, cellsPerEdge });
        for (let first = 0; first < terrain.sampleCount; first += 4096) {
          await nextFrame(); if (!active) return;
          fillSphericalPreviewRange(terrain, first, first + 4096);
          setProgress(`Preparing test geography: ${Math.round(Math.min(terrain.sampleCount, first + 4096) / terrain.sampleCount * 100)}%`);
        }
        const source = terrain.copyElevations(), faces = {} as Record<CubeFace, FaceTexture>;
        for (const face of CUBE_FACES) {
          await nextFrame(); if (!active) return;
          faces[face] = buildSphericalFaceTexture(terrain, source, face); setProgress(`Preparing display chart ${face}`);
        }
        if (active) setReady({ terrain, cache: makeSphericalDisplayCache(faces, terrain.revision), preparationMs: performance.now() - start });
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Spherical preview could not be prepared.'); }
    })();
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [radiusMeters, cellsPerEdge]);
  if (ready) return <SphericalViewport {...ready} onClose={onClose} />;
  return <section className={styles.workspace} aria-label="Spherical development preview"><div className={styles.loading}>
    <h2>Spherical development preview</h2><p>Session-only test geography. Your planar map is preserved.</p>
    <p role={error ? 'alert' : 'status'}>{error || progress}</p><button autoFocus onClick={onClose}>Return to map</button>
  </div></section>;
}
