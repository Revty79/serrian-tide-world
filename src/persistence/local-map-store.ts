import {decodeHollowTetrahedron,hollowTetrahedronHeader,validateHollowTetrahedron} from './hollow-tetrahedron-format.ts';
import {decodeTetrahedron,tetrahedronHeader,validateTetrahedron} from './tetrahedron-format.ts';
import {decodeHollowPyramid,hollowPyramidHeader,validateHollowPyramid} from './hollow-pyramid-format.ts';
import {decodePyramid,pyramidHeader,validatePyramid} from './pyramid-format.ts';
import {decodeOpenCylinder,openCylinderHeader,validateOpenCylinder} from './open-cylinder-format.ts';
import {decodeHollowCylinder,hollowCylinderHeader,validateHollowCylinder} from './hollow-cylinder-format.ts';
import { decodeCylindricalHeightmap, cylindricalHeader, validateCylindricalHeightmap } from './cylindrical-format.ts';
import { decodeSummary, type SavedMapSummary } from './terrain-format.ts';
import { decodeMap, type SavedMap } from './map-format.ts';
import { decodeSphericalHeightmap, sphericalHeader, validateSphericalHeightmap } from './spherical-format.ts';
import type { PersistenceWork } from './cooperative-work.ts';
import {decodeSolidCubeHeightmap,solidCubeHeader,validateSolidCubeHeightmap} from './solid-cube-format.ts';

import {decodeHollowCube,hollowCubeHeader,validateHollowCube} from './hollow-cube-format.ts';
import {decodeHollowSphere,hollowSphereHeader,validateHollowSphere} from './hollow-sphere-format.ts';

export interface LocalMapSummary extends SavedMapSummary { kind?: 'hollow-tetrahedron' | 'tetrahedron' | 'hollow-pyramid' | 'pyramid' | 'bounded' | 'wrapped' | 'sphere' | 'cylinder' | 'cube' | 'hollow-cube' | 'hollow-sphere' | 'hollow-cylinder' | 'open-cylinder' }
export const localMapType = (map: LocalMapSummary) => map.kind==='hollow-tetrahedron'?'Hollow tetrahedron':map.kind==='tetrahedron'?'Solid tetrahedron':map.kind==='hollow-pyramid'?'Hollow pyramid':map.kind==='pyramid'?'Solid pyramid':map.kind==='open-cylinder'?'Open cylinder':map.kind==='hollow-cylinder'?'Capped hollow cylinder':map.kind==='hollow-sphere'?'Hollow sphere':map.kind === 'hollow-cube' ? 'Hollow cube' : map.kind === 'cube' ? 'Solid cube' : map.kind === 'cylinder' ? 'Physical cylinder' : map.kind === 'sphere' ? 'Sphere' : map.kind === 'wrapped' ? 'Wrapped plane' : map.kind === 'bounded' ? 'Bounded plane' : 'Planar (legacy)';

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
  async list(): Promise<LocalMapSummary[]> {
    const db = await this.database();
    try {
      const values = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction('catalog', 'readonly'), request = tx.objectStore('catalog').getAll();
        tx.oncomplete = () => resolve(request.result as unknown[]);
        tx.onabort = () => reject(tx.error ?? new Error('Could not read saved maps.'));
      });
      return values.map((value) => {
        const summary = decodeSummary(value), kind = (value as LocalMapSummary).kind;
        if (kind !== undefined && !['bounded', 'wrapped', 'sphere', 'cylinder', 'cube', 'hollow-cube','hollow-sphere','hollow-cylinder','open-cylinder','pyramid','hollow-pyramid','tetrahedron','hollow-tetrahedron'].includes(kind)) throw new Error('Unknown saved map type.');
        return { ...summary, ...(kind ? { kind } : {}) };
      }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    } finally { db.close(); }
  }
  async save(input: SavedMap, work: PersistenceWork = {}): Promise<void> {
    // Validate before starting the transaction: async hashing would let IDB auto-close it.
    const value = input.formatVersion===18?await validateHollowTetrahedron(input,work):input.formatVersion===17?await validateTetrahedron(input,work):input.formatVersion===16?await validateHollowPyramid(input,work):input.formatVersion===15?await validatePyramid(input,work):input.formatVersion===14?await validateOpenCylinder(input,work):(input.formatVersion===11||input.formatVersion===12||input.formatVersion===13)?await validateHollowCylinder(input,work):(input.formatVersion===8||input.formatVersion===9||input.formatVersion===10)?await validateHollowSphere(input,work):(input.formatVersion === 6 || input.formatVersion === 7) ? await validateHollowCube(input,work) : input.formatVersion === 5 ? await validateSolidCubeHeightmap(input, work) : input.formatVersion === 4 ? await validateCylindricalHeightmap(input, work) : input.formatVersion === 3 ? await validateSphericalHeightmap(input, work) : input;
    if (value.formatVersion !== 18 && value.formatVersion !== 17 && value.formatVersion !== 16 && value.formatVersion !== 15 && value.formatVersion !== 14 && value.formatVersion !== 13 && value.formatVersion !== 12 && value.formatVersion !== 11 && value.formatVersion !== 10 && value.formatVersion !== 9 && value.formatVersion !== 8 && value.formatVersion !== 6 && value.formatVersion !== 7 && value.formatVersion !== 3 && value.formatVersion !== 4 && value.formatVersion !== 5) await decodeMap(value);
    work.progress?.('Writing local map transaction', 0);
    const db = await this.database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['heightmaps', 'catalog'], 'readwrite');
        let reason: Error | undefined;
        const store = tx.objectStore('heightmaps'), existing = store.get(value.id);
        existing.onsuccess = () => {
          try {
          const previous = existing.result as SavedMap | undefined;
          if (previous && ((previous.formatVersion !== value.formatVersion && !(previous.formatVersion === 6 && value.formatVersion === 7) && !([11,12,13].includes(previous.formatVersion)&&[11,12,13].includes(value.formatVersion)&&previous.formatVersion<value.formatVersion) && !([8,9,10].includes(previous.formatVersion)&&[8,9,10].includes(value.formatVersion)&&previous.formatVersion<value.formatVersion)) || (previous.formatVersion === 2 && value.formatVersion === 2
            && (previous.metadata?.identity?.worldId !== value.metadata.identity.worldId || previous.metadata?.identity?.surfaceId !== value.metadata.identity.surfaceId || previous.metadata?.identity?.patchId !== value.metadata.identity.patchId)))) {
            reason = new Error('Cannot replace another map format or surface identity. Create a new map instead.'); tx.abort(); return;
          }
          if (previous?.formatVersion === 3 && value.formatVersion === 3 && JSON.stringify(sphericalHeader(previous).metadata) !== JSON.stringify(value.metadata)) {
            reason = new Error('Cannot replace another spherical geometry, resolution or identity.'); tx.abort(); return;
          }
          if (previous?.formatVersion === 4 && value.formatVersion === 4 && JSON.stringify(cylindricalHeader(previous).metadata) !== JSON.stringify(value.metadata)) {
            reason = new Error('Cannot replace another cylinder geometry, resolution or identity.'); tx.abort(); return;
          }
          if(previous?.formatVersion===5&&value.formatVersion===5&&JSON.stringify(solidCubeHeader(previous).metadata)!==JSON.stringify(value.metadata)){
            reason=new Error('Cannot replace another cube geometry, resolution or identity.');tx.abort();return;
          }
          if((previous?.formatVersion===6||previous?.formatVersion===7)&&(value.formatVersion===6||value.formatVersion===7)&&JSON.stringify(hollowCubeHeader(previous).metadata)!==JSON.stringify(value.metadata)){
            reason=new Error('Cannot replace another hollow World geometry, resolution or identity.');tx.abort();return;
          }
          if((previous?.formatVersion===8||previous?.formatVersion===9||previous?.formatVersion===10)&&(value.formatVersion===8||value.formatVersion===9||value.formatVersion===10)&&JSON.stringify(hollowSphereHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow sphere geometry, resolution or identity.');tx.abort();return;}
          if((previous?.formatVersion===11||previous?.formatVersion===12||previous?.formatVersion===13)&&(value.formatVersion===11||value.formatVersion===12||value.formatVersion===13)&&JSON.stringify(hollowCylinderHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow cylinder geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===14&&value.formatVersion===14&&JSON.stringify(openCylinderHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another open-cylinder geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===15&&value.formatVersion===15&&JSON.stringify(pyramidHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another pyramid geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===18&&value.formatVersion===18&&JSON.stringify(hollowTetrahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow tetrahedron geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===17&&value.formatVersion===17&&JSON.stringify(tetrahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another tetrahedron geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===16&&value.formatVersion===16&&JSON.stringify(hollowPyramidHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow pyramid geometry, resolution or identity.');tx.abort();return;}
          store.put(value);
          tx.objectStore('catalog').put({ id: value.id, name: value.name, savedAt: value.savedAt, kind: value.formatVersion===18?'hollow-tetrahedron':value.formatVersion===17?'tetrahedron':value.formatVersion===16?'hollow-pyramid':value.formatVersion===15?'pyramid':value.formatVersion===14?'open-cylinder':(value.formatVersion===11||value.formatVersion===12||value.formatVersion===13)?'hollow-cylinder':(value.formatVersion===8||value.formatVersion===9||value.formatVersion===10)?'hollow-sphere':(value.formatVersion === 6 || value.formatVersion === 7) ? 'hollow-cube' : value.formatVersion === 5 ? 'cube' : value.formatVersion === 4 ? 'cylinder' : value.formatVersion === 3 ? 'sphere' : value.formatVersion === 2 ? 'wrapped' : 'bounded' });
          } catch (cause) { reason = cause instanceof Error ? cause : new Error('Map transaction failed.'); try { tx.abort(); } catch { /* An interrupted write may already have aborted it. */ } }
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(reason ?? tx.error ?? new Error('Map was not saved. Local storage may be full.'));
      });
    } finally { db.close(); }
  }
  private async readRecord(id: string) {
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
    return value;
  }
  /** Original planar-only API remains fail-closed for spherical/future versions. */
  async open(id: string) { return decodeMap(await this.readRecord(id)); }
  async openAny(id: string, work: PersistenceWork = {}) {
    work.progress?.('Reading local map', 0); const value = await this.readRecord(id);
    if((value as SavedMap).formatVersion===18)return{kind:'hollow-tetrahedron' as const,...await decodeHollowTetrahedron(value,work)};
    if((value as SavedMap).formatVersion===17)return{kind:'tetrahedron' as const,...await decodeTetrahedron(value,work)};
    if((value as SavedMap).formatVersion===16)return{kind:'hollow-pyramid' as const,...await decodeHollowPyramid(value,work)};
    if((value as SavedMap).formatVersion===15)return{kind:'pyramid' as const,...await decodePyramid(value,work)};
    if((value as SavedMap).formatVersion===14)return{kind:'open-cylinder' as const,...await decodeOpenCylinder(value,work)};
    if(((value as SavedMap).formatVersion===11||(value as SavedMap).formatVersion===12||(value as SavedMap).formatVersion===13))return{kind:'hollow-cylinder' as const,...await decodeHollowCylinder(value,work)};
    if(((value as SavedMap).formatVersion===8||(value as SavedMap).formatVersion===9||(value as SavedMap).formatVersion===10))return{kind:'hollow-sphere' as const,...await decodeHollowSphere(value,work)};
    if((value as SavedMap).formatVersion===6||(value as SavedMap).formatVersion===7)return{kind:'hollow-cube' as const,...await decodeHollowCube(value,work)};
    if((value as SavedMap).formatVersion===5)return{kind:'cube' as const,...await decodeSolidCubeHeightmap(value,work)};
    if ((value as SavedMap).formatVersion === 4) return { kind: 'cylinder' as const, ...await decodeCylindricalHeightmap(value, work) };
    if ((value as SavedMap).formatVersion === 3) return { kind: 'sphere' as const, ...await decodeSphericalHeightmap(value, work) };
    return { kind: 'planar' as const, ...await decodeMap(value) };
  }
}
