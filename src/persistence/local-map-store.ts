import { decodeSummary, type SavedMapSummary } from './terrain-format.ts';
import { decodeMap, type SavedMap } from './map-format.ts';

const DB_NAME = 'serrian-tide-atlas';
const DB_VERSION = 1;

/** Replaceable host adapter. No database or browser globals are touched during module loading. */
export class LocalMapStore {
  private async database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      let blocked = false;
      request.onupgradeneeded = () => {
        request.result.createObjectStore('heightmaps', { keyPath: 'id' });
        request.result.createObjectStore('catalog', { keyPath: 'id' });
      };
      request.onblocked = () => { blocked = true; reject(new Error('Local storage is blocked by another Atlas tab. Close it and retry.')); };
      request.onerror = () => reject(request.error ?? new Error('Local storage is unavailable.'));
      request.onsuccess = () => {
        if (blocked) { request.result.close(); return; }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
  }
  async list(): Promise<SavedMapSummary[]> {
    const db = await this.database();
    try {
      const values = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction('catalog', 'readonly'), request = tx.objectStore('catalog').getAll();
        tx.oncomplete = () => resolve(request.result as unknown[]);
        tx.onabort = () => reject(tx.error ?? new Error('Could not read saved maps.'));
      });
      return values.map(decodeSummary).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    } finally { db.close(); }
  }
  async save(value: SavedMap): Promise<void> {
    // Validate before starting the transaction: async hashing would let IDB auto-close it.
    await decodeMap(value);
    const db = await this.database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['heightmaps', 'catalog'], 'readwrite');
        let reason: Error | undefined;
        const store = tx.objectStore('heightmaps'), existing = store.get(value.id);
        existing.onsuccess = () => {
          const previous = existing.result as SavedMap | undefined;
          if (previous && (previous.formatVersion !== value.formatVersion || (previous.formatVersion === 2 && value.formatVersion === 2
            && (previous.metadata?.identity?.worldId !== value.metadata.identity.worldId || previous.metadata?.identity?.surfaceId !== value.metadata.identity.surfaceId || previous.metadata?.identity?.patchId !== value.metadata.identity.patchId)))) {
            reason = new Error('Cannot replace another map format or surface identity. Create a new map instead.'); tx.abort(); return;
          }
          store.put(value);
          tx.objectStore('catalog').put({ id: value.id, name: value.name, savedAt: value.savedAt });
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(reason ?? tx.error ?? new Error('Map was not saved. Local storage may be full.'));
      });
    } finally { db.close(); }
  }
  async open(id: string) {
    const db = await this.database();
    let value: unknown;
    try {
      value = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction('heightmaps', 'readonly'), request = tx.objectStore('heightmaps').get(id);
        tx.oncomplete = () => resolve(request.result as unknown);
        tx.onabort = () => reject(tx.error ?? new Error('Could not open this map.'));
      });
    } finally { db.close(); }
    if (!value) throw new Error('This saved map is no longer available.');
    return decodeMap(value);
  }
}
