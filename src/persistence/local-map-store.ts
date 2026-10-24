import{decodeSpiral,spiralHeader,validateSpiral}from'./spiral-format.ts';
import{decodeHourglass,hourglassHeader,validateHourglass}from'./hourglass-format.ts';
import{decodeDumbbell,dumbbellHeader,validateDumbbell}from'./dumbbell-format.ts';
import{decodeArc,arcHeader,validateArc}from'./arc-format.ts';
import{decodeHorseshoe,horseshoeHeader,validateHorseshoe}from'./horseshoe-format.ts';
import {decodeCrescent,crescentHeader,validateCrescent} from './crescent-format.ts';
import {decodeRingworld,ringworldHeader,validateRingworld} from './ringworld-format.ts';
import {decodeTorus,torusHeader,validateTorus} from './torus-format.ts';
import {decodeFragmentedWorld,fragmentedWorldHeader,validateFragmentedWorld} from './fragmented-world-format.ts';
import {decodeFloatingIslands,floatingIslandsHeader,validateFloatingIslands} from './floating-islands-format.ts';
import {prepareFloatingIslandsDocument} from '../editor/floating-islands-document.ts';
import {decodeFloatingIsland,floatingIslandHeader,validateFloatingIsland} from './floating-island-format.ts';
import {decodeHollowIcosahedron,hollowIcosahedronHeader,validateHollowIcosahedron} from './hollow-icosahedron-format.ts';
import {decodeIcosahedron,icosahedronHeader,validateIcosahedron} from './icosahedron-format.ts';
import {decodeHollowDodecahedron,hollowDodecahedronHeader,validateHollowDodecahedron} from './hollow-dodecahedron-format.ts';
import {decodeDodecahedron,dodecahedronHeader,validateDodecahedron} from './dodecahedron-format.ts';
import {decodeHollowTrapezohedron,hollowTrapezohedronHeader,validateHollowTrapezohedron} from './hollow-trapezohedron-format.ts';
import {decodeTrapezohedron,trapezohedronHeader,validateTrapezohedron} from './trapezohedron-format.ts';
import {decodeHollowOctahedron,hollowOctahedronHeader,validateHollowOctahedron} from './hollow-octahedron-format.ts';
import {decodeOctahedron,octahedronHeader,validateOctahedron} from './octahedron-format.ts';
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

export const LOCAL_MAP_KINDS=Object.freeze(['bounded','wrapped','sphere','hollow-sphere','cylinder','hollow-cylinder','open-cylinder','cube','hollow-cube','pyramid','hollow-pyramid','tetrahedron','hollow-tetrahedron','octahedron','hollow-octahedron','trapezohedron','hollow-trapezohedron','dodecahedron','hollow-dodecahedron','icosahedron','hollow-icosahedron','floating-islands','fragmented','torus','ringworld','crescent','horseshoe','arc','dumbbell','hourglass','spiral'] as const);
export interface LocalMapSummary extends SavedMapSummary {kind?:typeof LOCAL_MAP_KINDS[number]}

export const localMapType = (map: LocalMapSummary) => map.kind==='spiral'?'Spiral World':map.kind==='hourglass'?'Hourglass World':map.kind==='dumbbell'?'Dumbbell World':map.kind==='arc'?'Arc World':map.kind==='horseshoe'?'Horseshoe World':map.kind==='crescent'?'Crescent World':map.kind==='ringworld'?'Ringworld':map.kind==='torus'?'Torus World':map.kind==='fragmented'?'Fragmented World':map.kind==='floating-islands'?'Floating Islands':map.kind==='hollow-icosahedron'?'Hollow icosahedron':map.kind==='icosahedron'?'Solid icosahedron':map.kind==='hollow-dodecahedron'?'Hollow dodecahedron':map.kind==='dodecahedron'?'Solid dodecahedron':map.kind==='hollow-trapezohedron'?'Hollow decahedron':map.kind==='trapezohedron'?'Solid decahedron':map.kind==='hollow-octahedron'?'Hollow octahedron':map.kind==='octahedron'?'Solid octahedron':map.kind==='hollow-tetrahedron'?'Hollow tetrahedron':map.kind==='tetrahedron'?'Solid tetrahedron':map.kind==='hollow-pyramid'?'Hollow pyramid':map.kind==='pyramid'?'Solid pyramid':map.kind==='open-cylinder'?'Open cylinder':map.kind==='hollow-cylinder'?'Capped hollow cylinder':map.kind==='hollow-sphere'?'Hollow sphere':map.kind === 'hollow-cube' ? 'Hollow cube' : map.kind === 'cube' ? 'Solid cube' : map.kind === 'cylinder' ? 'Physical cylinder' : map.kind === 'sphere' ? 'Sphere' : map.kind === 'wrapped' ? 'Wrapped plane' : map.kind === 'bounded' ? 'Bounded plane' : 'Planar (legacy)';

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
        if (kind !== undefined && !(LOCAL_MAP_KINDS as readonly string[]).includes(kind)) throw new Error('Unknown saved map type.');
        return { ...summary, ...(kind ? { kind } : {}) };
      }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    } finally { db.close(); }
  }
  async save(input: SavedMap, work: PersistenceWork = {}): Promise<void> {
    // Validate before starting the transaction: async hashing would let IDB auto-close it.
    const value = input.formatVersion===41?await validateSpiral(input,work):input.formatVersion===40?await validateHourglass(input,work):input.formatVersion===39?await validateDumbbell(input,work):input.formatVersion===38?await validateArc(input,work):input.formatVersion===37?await validateHorseshoe(input,work):input.formatVersion===36?await validateCrescent(input,work):input.formatVersion===35?await validateRingworld(input,work):input.formatVersion===34?await validateTorus(input,work):input.formatVersion===33?await validateFragmentedWorld(input,work):input.formatVersion===32?await validateFloatingIslands(input,work):input.formatVersion===31?await validateFloatingIsland(input,work):input.formatVersion===30?await validateHollowIcosahedron(input,work):input.formatVersion===29?await validateIcosahedron(input,work):input.formatVersion===28?await validateHollowDodecahedron(input,work):input.formatVersion===27?await validateDodecahedron(input,work):input.formatVersion===26?await validateHollowTrapezohedron(input,work):input.formatVersion===25?await validateTrapezohedron(input,work):input.formatVersion===20?await validateHollowOctahedron(input,work):input.formatVersion===19?await validateOctahedron(input,work):input.formatVersion===18?await validateHollowTetrahedron(input,work):input.formatVersion===17?await validateTetrahedron(input,work):input.formatVersion===16?await validateHollowPyramid(input,work):input.formatVersion===15?await validatePyramid(input,work):input.formatVersion===14?await validateOpenCylinder(input,work):(input.formatVersion===11||input.formatVersion===12||input.formatVersion===13)?await validateHollowCylinder(input,work):(input.formatVersion===8||input.formatVersion===9||input.formatVersion===10)?await validateHollowSphere(input,work):(input.formatVersion === 6 || input.formatVersion === 7) ? await validateHollowCube(input,work) : input.formatVersion === 5 ? await validateSolidCubeHeightmap(input, work) : input.formatVersion === 4 ? await validateCylindricalHeightmap(input, work) : input.formatVersion === 3 ? await validateSphericalHeightmap(input, work) : input;
    if (value.formatVersion !== 41 && value.formatVersion !== 40 && value.formatVersion !== 39 && value.formatVersion !== 38 && value.formatVersion !== 37 && value.formatVersion !== 36 && value.formatVersion !== 35 && value.formatVersion !== 34 && value.formatVersion !== 33 && value.formatVersion !== 32 && value.formatVersion !== 31 && value.formatVersion !== 30 && value.formatVersion !== 29 && value.formatVersion !== 28 && value.formatVersion !== 27 && value.formatVersion !== 26 && value.formatVersion !== 25 && value.formatVersion !== 20 && value.formatVersion !== 19 && value.formatVersion !== 18 && value.formatVersion !== 17 && value.formatVersion !== 16 && value.formatVersion !== 15 && value.formatVersion !== 14 && value.formatVersion !== 13 && value.formatVersion !== 12 && value.formatVersion !== 11 && value.formatVersion !== 10 && value.formatVersion !== 9 && value.formatVersion !== 8 && value.formatVersion !== 6 && value.formatVersion !== 7 && value.formatVersion !== 3 && value.formatVersion !== 4 && value.formatVersion !== 5) await decodeMap(value);
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
          if (previous && ((previous.formatVersion !== value.formatVersion && !(previous.formatVersion===31&&value.formatVersion===32) && !(previous.formatVersion === 6 && value.formatVersion === 7) && !([11,12,13].includes(previous.formatVersion)&&[11,12,13].includes(value.formatVersion)&&previous.formatVersion<value.formatVersion) && !([8,9,10].includes(previous.formatVersion)&&[8,9,10].includes(value.formatVersion)&&previous.formatVersion<value.formatVersion)) || (previous.formatVersion === 2 && value.formatVersion === 2
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
          if(previous?.formatVersion===26&&value.formatVersion===26&&JSON.stringify(hollowTrapezohedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow decahedron geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===28&&value.formatVersion===28&&JSON.stringify(hollowDodecahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow dodecahedron geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===30&&value.formatVersion===30&&JSON.stringify(hollowIcosahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow icosahedron geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===20&&value.formatVersion===20&&JSON.stringify(hollowOctahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow octahedron geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===18&&value.formatVersion===18&&JSON.stringify(hollowTetrahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow tetrahedron geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===29&&value.formatVersion===29&&JSON.stringify(icosahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another icosahedron geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===27&&value.formatVersion===27&&JSON.stringify(dodecahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another dodecahedron geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===19&&value.formatVersion===19&&JSON.stringify(octahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another octahedron geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===17&&value.formatVersion===17&&JSON.stringify(tetrahedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another tetrahedron geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===16&&value.formatVersion===16&&JSON.stringify(hollowPyramidHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another hollow pyramid geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===25&&value.formatVersion===25&&JSON.stringify(trapezohedronHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Trapezohedron geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===31&&value.formatVersion===31&&JSON.stringify(floatingIslandHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another island geometry, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===32&&value.formatVersion===32){const prior=floatingIslandsHeader(previous);if(prior.metadata.worldId!==value.metadata.worldId){reason=new Error('Cannot replace another Floating Islands World.');tx.abort();return;}const owners=new Map(prior.metadata.components.flatMap(c=>[c.id,c.metadata.terrainId,c.metadata.identity.surfaceId].map(id=>[id,c.id] as const)));for(const c of value.metadata.components){const old=prior.metadata.components.find(p=>p.id===c.id);if(old&&JSON.stringify(old.metadata)!==JSON.stringify(c.metadata)||[c.id,c.metadata.terrainId,c.metadata.identity.surfaceId].some(id=>owners.has(id)&&owners.get(id)!==c.id)){reason=new Error('Cannot replace an existing island geometry, detail or terrain identity. Add a new island instead.');tx.abort();return;}}}
          if(previous?.formatVersion===31&&value.formatVersion===32&&floatingIslandHeader(previous).metadata.identity.worldId!==value.metadata.worldId){reason=new Error('Cannot upgrade a different island World.');tx.abort();return;}
          if(previous?.formatVersion===33&&value.formatVersion===33){const prior=fragmentedWorldHeader(previous);if(JSON.stringify(prior.metadata.reference)!==JSON.stringify(value.metadata.reference)){reason=new Error('Cannot replace the saved parent reference or fracture generation parameters.');tx.abort();return;}const owners=new Map(prior.metadata.components.flatMap(c=>[c.id,c.metadata.terrainId,c.metadata.identity.surfaceId].map(id=>[id,c.id] as const)));for(const c of value.metadata.components){const old=prior.metadata.components.find(p=>p.id===c.id);if(old&&JSON.stringify(old.metadata)!==JSON.stringify(c.metadata)||[c.id,c.metadata.terrainId,c.metadata.identity.surfaceId].some(id=>owners.has(id)&&owners.get(id)!==c.id)){reason=new Error('Cannot replace an existing fragment geometry, detail or terrain identity.');tx.abort();return;}}}
          if(previous?.formatVersion===34&&value.formatVersion===34&&JSON.stringify(torusHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Torus geometry, resolution or identity.');tx.abort();return;}
          if(previous?.formatVersion===41&&value.formatVersion===41&&JSON.stringify(spiralHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Spiral geometry, topology, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===40&&value.formatVersion===40&&JSON.stringify(hourglassHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Hourglass geometry, topology, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===39&&value.formatVersion===39&&JSON.stringify(dumbbellHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Dumbbell geometry, topology, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===38&&value.formatVersion===38&&JSON.stringify(arcHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Arc geometry, topology, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===37&&value.formatVersion===37&&JSON.stringify(horseshoeHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Horseshoe geometry, topology, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===36&&value.formatVersion===36&&JSON.stringify(crescentHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Crescent geometry, topology, detail or identity.');tx.abort();return;}
          if(previous?.formatVersion===35&&value.formatVersion===35&&JSON.stringify(ringworldHeader(previous).metadata)!==JSON.stringify(value.metadata)){reason=new Error('Cannot replace another Ringworld geometry, topology, detail or identity.');tx.abort();return;}
          store.put(value);
          tx.objectStore('catalog').put({ id: value.id, name: value.name, savedAt: value.savedAt, kind: value.formatVersion===41?'spiral':value.formatVersion===40?'hourglass':value.formatVersion===39?'dumbbell':value.formatVersion===38?'arc':value.formatVersion===37?'horseshoe':value.formatVersion===36?'crescent':value.formatVersion===35?'ringworld':value.formatVersion===34?'torus':value.formatVersion===33?'fragmented':value.formatVersion===32?'floating-islands':value.formatVersion===31?'floating-islands':value.formatVersion===30?'hollow-icosahedron':value.formatVersion===29?'icosahedron':value.formatVersion===28?'hollow-dodecahedron':value.formatVersion===27?'dodecahedron':value.formatVersion===26?'hollow-trapezohedron':value.formatVersion===25?'trapezohedron':value.formatVersion===20?'hollow-octahedron':value.formatVersion===19?'octahedron':value.formatVersion===18?'hollow-tetrahedron':value.formatVersion===17?'tetrahedron':value.formatVersion===16?'hollow-pyramid':value.formatVersion===15?'pyramid':value.formatVersion===14?'open-cylinder':(value.formatVersion===11||value.formatVersion===12||value.formatVersion===13)?'hollow-cylinder':(value.formatVersion===8||value.formatVersion===9||value.formatVersion===10)?'hollow-sphere':(value.formatVersion === 6 || value.formatVersion === 7) ? 'hollow-cube' : value.formatVersion === 5 ? 'cube' : value.formatVersion === 4 ? 'cylinder' : value.formatVersion === 3 ? 'sphere' : value.formatVersion === 2 ? 'wrapped' : 'bounded' });
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
    if((value as SavedMap).formatVersion===41)return{kind:'spiral' as const,...await decodeSpiral(value,work)};
    if((value as SavedMap).formatVersion===40)return{kind:'hourglass' as const,...await decodeHourglass(value,work)};
    if((value as SavedMap).formatVersion===39)return{kind:'dumbbell' as const,...await decodeDumbbell(value,work)};
    if((value as SavedMap).formatVersion===38)return{kind:'arc' as const,...await decodeArc(value,work)};
    if((value as SavedMap).formatVersion===37)return{kind:'horseshoe' as const,...await decodeHorseshoe(value,work)};
    if((value as SavedMap).formatVersion===36)return{kind:'crescent' as const,...await decodeCrescent(value,work)};
    if((value as SavedMap).formatVersion===35)return{kind:'ringworld' as const,...await decodeRingworld(value,work)};
    if((value as SavedMap).formatVersion===34)return{kind:'torus' as const,...await decodeTorus(value,work)};
    if((value as SavedMap).formatVersion===33)return{kind:'fragmented' as const,...await decodeFragmentedWorld(value,work)};
    if((value as SavedMap).formatVersion===32)return{kind:'floating-islands' as const,...await decodeFloatingIslands(value,work)};
    if((value as SavedMap).formatVersion===31){const loaded=await decodeFloatingIsland(value,work),worldId=loaded.terrain.metadata.identity.worldId;let islandId='legacy-island';while([loaded.terrain.metadata.terrainId,loaded.terrain.metadata.identity.surfaceId].includes(islandId))islandId+='-';return{kind:'floating-islands' as const,...await prepareFloatingIslandsDocument(worldId,[{id:islandId,name:'Island 1',terrain:loaded.terrain,placement:{positionMeters:[0,0,0],rotationDegrees:[0,0,0]}}],loaded.name,true,undefined,work)};}
    if((value as SavedMap).formatVersion===26)return{kind:'hollow-trapezohedron' as const,...await decodeHollowTrapezohedron(value,work)};
    if((value as SavedMap).formatVersion===25)return{kind:'trapezohedron' as const,...await decodeTrapezohedron(value,work)};
    if((value as SavedMap).formatVersion===28)return{kind:'hollow-dodecahedron' as const,...await decodeHollowDodecahedron(value,work)};
    if((value as SavedMap).formatVersion===30)return{kind:'hollow-icosahedron' as const,...await decodeHollowIcosahedron(value,work)};
    if((value as SavedMap).formatVersion===20)return{kind:'hollow-octahedron' as const,...await decodeHollowOctahedron(value,work)};
    if((value as SavedMap).formatVersion===18)return{kind:'hollow-tetrahedron' as const,...await decodeHollowTetrahedron(value,work)};
    if((value as SavedMap).formatVersion===29)return{kind:'icosahedron' as const,...await decodeIcosahedron(value,work)};
    if((value as SavedMap).formatVersion===27)return{kind:'dodecahedron' as const,...await decodeDodecahedron(value,work)};
    if((value as SavedMap).formatVersion===19)return{kind:'octahedron' as const,...await decodeOctahedron(value,work)};
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
