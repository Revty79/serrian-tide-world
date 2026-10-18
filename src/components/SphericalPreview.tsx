'use client';

import { useEffect, useState } from 'react';
import { CUBE_FACES, type CubeFace } from '../surfaces/cube-sphere.ts';
import { createSphericalTerrain, type SphericalTerrain } from '../terrain/spherical.ts';
import { fillSphericalPreviewRange } from '../terrain/spherical-preview-fixture.ts';
import { buildSphericalFaceTexture, makeSphericalDisplayCache, type FaceTexture, type SphericalDisplayCache } from '../rendering/spherical-raster.ts';
import { SphericalViewport } from './SphericalViewport.tsx';
import styles from './SphericalPreview.module.css';
import { SphericalSession } from '../editor/spherical-session.ts';

export interface SphericalPreviewProps { readonly radiusMeters: number; readonly cellsPerEdge: number; readonly kind?: 'blank' | 'demo'; readonly onClose: () => void }
/** Replaceable development host. Provider/identity creation, fixture setup and display lifetime stay outside the viewport. */
export function SphericalPreview({ radiusMeters, cellsPerEdge, kind = 'demo', onClose }: SphericalPreviewProps) {
  const [ready, setReady] = useState<{ terrain: SphericalTerrain; cache: SphericalDisplayCache; preparationMs: number; editor?: SphericalSession }>();
  const [progress, setProgress] = useState('Preparing session-only terrain…'), [error, setError] = useState('');
  useEffect(() => {
    let active = true, frame = 0;
    const nextFrame = () => new Promise<void>((resolve) => { frame = requestAnimationFrame(() => resolve()); });
    void (async () => {
      try {
        const start = performance.now();
        const terrain = createSphericalTerrain({ terrainId: crypto.randomUUID(), identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, radiusMeters, cellsPerEdge });
        for (let first = 0; kind === 'demo' && first < terrain.sampleCount; first += 4096) {
          await nextFrame(); if (!active) return;
          fillSphericalPreviewRange(terrain, first, first + 4096);
          setProgress(`Preparing test geography: ${Math.round(Math.min(terrain.sampleCount, first + 4096) / terrain.sampleCount * 100)}%`);
        }
        const source = terrain.copyElevations(), faces = {} as Record<CubeFace, FaceTexture>;
        for (const face of CUBE_FACES) {
          await nextFrame(); if (!active) return;
          faces[face] = buildSphericalFaceTexture(terrain, source, face, kind === 'blank'); setProgress(`Preparing display chart ${face}`);
        }
        const cache = makeSphericalDisplayCache(faces, terrain.revision);
        if (active) setReady({ terrain, cache, preparationMs: performance.now() - start, editor: kind === 'blank' ? new SphericalSession(terrain, cache) : undefined });
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Spherical preview could not be prepared.'); }
    })();
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [radiusMeters, cellsPerEdge, kind]);
  if (ready) return <SphericalViewport {...ready} onClose={onClose} />;
  return <section className={styles.workspace} aria-label="Spherical development preview"><div className={styles.loading}>
    <h2>{kind === 'blank' ? 'Blank spherical editor' : 'Spherical development preview'}</h2><p>{kind === 'blank' ? 'Preparing blank ocean at −100 m. Session-only editing.' : 'Session-only test geography.'} Your planar map is preserved.</p>
    <p role={error ? 'alert' : 'status'}>{error || progress}</p><button autoFocus onClick={onClose}>Return to map</button>
  </div></section>;
}
