'use client';
import { useEffect, useRef, useState } from 'react';
import { createSphericalTerrain, type SphericalTerrain } from '../terrain/spherical.ts';
import { prepareSphericalSession } from '../editor/prepare-spherical-session.ts';
import { LocalMapStore, type LocalMapSummary } from '../persistence/local-map-store.ts';
import { encodeSphericalHeightmap } from '../persistence/spherical-format.ts';
import { yieldPersistence, type PersistenceWork } from '../persistence/cooperative-work.ts';
import { SphericalViewport } from './SphericalViewport.tsx';
import type { SphericalPersistenceUi } from './SphericalStorageControls.tsx';
import styles from './SphericalPreview.module.css';
const store = new LocalMapStore();
type Ready = Awaited<ReturnType<typeof prepareSphericalSession>> & { generation: number };
export function SphericalEditor({ radiusMeters, cellsPerEdge, initial, onClose }: { radiusMeters: number; cellsPerEdge: number; initial?: { terrain: SphericalTerrain; name: string }; onClose(): void }) {
  const [ready, setReady] = useState<Ready>(), [maps, setMaps] = useState<LocalMapSummary[]>([]), [selected, setSelected] = useState('');
  const [phase, setPhase] = useState<SphericalPersistenceUi['phase']>('opening'), [message, setMessage] = useState('Preparing blank sphere'), [error, setError] = useState('');
  const [, update] = useState(0), active = useRef(true), generation = useRef(0);
  const busy = phase === 'saving' || phase === 'opening';
  const work: PersistenceWork = { progress: (stage, fraction) => { if (active.current) setMessage(`${stage} · ${Math.round(fraction * 100)}%`); }, yield: async () => { await yieldPersistence(); if (!active.current) throw new Error('Spherical loading canceled.'); } };
  const report = (cause: unknown) => { if (active.current) setError(cause instanceof Error ? cause.message : 'Local spherical operation failed.'); };
  const refresh = async () => { try { const list = await store.list(); if (active.current) setMaps(list); } catch (cause) { report(cause); } };
  useEffect(() => {
    active.current = true; let canceled = false;
    const initWork: PersistenceWork = { progress: (stage, fraction) => { if (!canceled) work.progress?.(stage, fraction); }, yield: async () => { await yieldPersistence(); if (canceled) throw new Error('Spherical loading canceled.'); } };
    void (async () => {
      try {
        const terrain = initial?.terrain ?? createSphericalTerrain({ terrainId: crypto.randomUUID(), identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, radiusMeters, cellsPerEdge });
        const prepared = await prepareSphericalSession(terrain, initial?.name ?? 'Untitled sphere', !!initial, initWork);
        if (!canceled) { setReady({ ...prepared, generation: ++generation.current }); setSelected(initial ? terrain.metadata.terrainId : ''); setPhase('ready'); await refresh(); }
      } catch (cause) { if (!canceled) { report(cause); setPhase('failed'); } }
    })();
    return () => { canceled = true; active.current = false; };
  }, [radiusMeters, cellsPerEdge, initial]);
  const save = async () => {
    if (!ready || ready.editor.locked) return;
    const editor = ready.editor; editor.locked = true; setPhase('saving'); setError(''); setMessage('Finishing accepted brush input');
    try {
      await editor.drainForSave(work.yield);
      const record = await encodeSphericalHeightmap(ready.terrain, editor.name, undefined, work);
      await store.save(record, work); editor.markSaved(record.name); setSelected(record.id);
      await refresh(); setMessage('Saved on this device'); setPhase('ready');
    } catch (cause) { report(cause); setPhase('failed'); setMessage('Save failed · edits retained'); }
    finally { editor.locked = false; editor.changed(); }
  };
  const open = async (id: string) => {
    if (!ready || ready.editor.locked || !id) return;
    const editor = ready.editor; editor.locked = true; setPhase('opening'); setError('');
    try {
      await editor.drainForSave(work.yield);
      const loaded = await store.openAny(id, work);
      if (loaded.kind !== 'sphere') throw new Error('This is not a spherical record. Open it from the main map library.');
      const prepared = await prepareSphericalSession(loaded.terrain, loaded.name, true, work);
      if (editor.modified && !window.confirm('Discard unsaved spherical changes and open the saved sphere? Save first to keep your work.')) { setPhase('ready'); return; }
      setReady({ ...prepared, generation: ++generation.current }); setPhase('ready'); setMessage('Opened locally · fresh Undo/Redo');
    } catch (cause) { report(cause); setPhase('failed'); setMessage('Open failed · current sphere retained'); }
    finally { editor.locked = false; editor.changed(); }
  };
  if (!ready) return <section className={styles.workspace} aria-label="Spherical development preview"><div className={styles.loading}><h2>{initial ? 'Opening spherical world' : 'Blank spherical editor'}</h2><p role={error ? 'alert' : 'status'}>{error || message}</p><p>Your planar map is preserved.</p><button autoFocus onClick={onClose}>Return to map</button></div></section>;
  const persistence: SphericalPersistenceUi = { name: ready.editor.name, busy, phase, message, error, maps, selected, rename: (name) => { ready.editor.name = name; ready.editor.changed(); update((v) => v + 1); }, select: setSelected, save: () => void save(), open: (id) => void open(id), refresh: () => void refresh() };
  return <SphericalViewport key={ready.generation} {...ready} persistence={persistence} onClose={onClose} />;
}
