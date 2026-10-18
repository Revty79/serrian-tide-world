'use client';
import type { LocalMapSummary } from '../persistence/local-map-store.ts';
export interface SphericalPersistenceUi {
  name: string; busy: boolean; phase: 'ready' | 'saving' | 'opening' | 'failed'; message: string; error: string;
  maps: LocalMapSummary[]; selected: string;
  rename(name: string): void; select(id: string): void; save(): void; open(id: string): void; refresh(): void;
}
export function SphericalStorageControls({ value, open }: { value: SphericalPersistenceUi; open(): void }) {
  return <fieldset disabled={value.busy} className="spherical-storage"><legend>Local spherical worlds</legend>
    <label>Spherical world name<input maxLength={120} value={value.name} onChange={(e) => value.rename(e.target.value)} /></label>
    <label htmlFor="saved-spherical-world">Saved spherical worlds</label><select id="saved-spherical-world" value={value.selected} onChange={(e) => value.select(e.target.value)}><option value="">Choose a saved sphere</option>{value.maps.filter((map) => map.kind === 'sphere').map((map) => <option key={map.id} value={map.id}>{map.name} · Sphere</option>)}</select>
    <button disabled={!value.selected} onClick={open}>Open Sphere</button> <button onClick={value.refresh}>Refresh spheres</button>
    <p>Browser/profile/device local. No autosave or synchronization. Clearing browser data or storage eviction can remove saves. Reopening starts fresh Undo/Redo and resets the camera; geography stays fixed.</p>
    <p>Open bounded and wrapped maps from the main Atlas saved-map list.</p>
  </fieldset>;
}
