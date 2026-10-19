// Test-only database fault injection and independent stored-payload inspection. No active-terrain writes.
import { LocalMapStore } from '../../src/persistence/local-map-store.ts';
import { raw } from './sphere-storage.ts';
import { createCylinderPreviewTerrain } from '../../src/editor/cylinder-preview-session.ts';
import { encodeCylindricalHeightmap, decodeCylindricalHeightmap } from '../../src/persistence/cylindrical-format.ts';
import { prepareCylinderSession } from '../../src/editor/prepare-cylinder-session.ts';
import { createCylindricalTerrain } from '../../src/terrain/cylindrical.ts';
import { cylinderPreviewInspection } from '../../src/components/CylinderPreview.tsx';
const store = new LocalMapStore();
const hash = async (b: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(v => v.toString(16).padStart(2, '0')).join('');
export async function stored(id: string) {
  const r = await raw(id), view = new DataView(r.elevations);
  return { id: r.id, name: r.name, savedAt: r.savedAt, version: r.formatVersion, metadata: r.metadata, checksum: r.checksum, words: Array.from({length:view.byteLength/4},(_,i)=>view.getUint32(i*4,true)), sha256: await hash(r.elevations), catalog: (await store.list()).find(r => r.id === id) };
}
const originalPut = IDBObjectStore.prototype.put, originalOpen = IDBFactory.prototype.open;
export function fault(mode: 'none' | 'quota' | 'abort' | 'denied' | 'catalog') {
  IDBObjectStore.prototype.put = originalPut; IDBFactory.prototype.open = originalOpen;
  if (mode === 'denied') { IDBFactory.prototype.open = function () { throw new DOMException('Cylinder storage denied', 'SecurityError'); }; return; }
  IDBObjectStore.prototype.put = function (value, key?) {
    if (mode === 'catalog' && this.name === 'catalog' && value.kind === 'cylinder') throw new DOMException('Cylinder catalog write failed', 'QuotaExceededError');
    if (this.name === 'heightmaps' && value.formatVersion === 4) {
      if (mode === 'quota') throw new DOMException('Cylinder quota exhausted', 'QuotaExceededError');
      const r = key === undefined ? originalPut.call(this,value) : originalPut.call(this,value,key); if (mode === 'abort') queueMicrotask(() => this.transaction.abort()); return r;
    }
    return key === undefined ? originalPut.call(this,value) : originalPut.call(this,value,key);
  };
}
async function putRecord(r: any) {
  const request = indexedDB.open('serrian-tide-atlas', 1), db = await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try { await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['heightmaps','catalog'],'readwrite');tx.objectStore('heightmaps').put(r);tx.objectStore('catalog').put({id:r.id,name:r.name,savedAt:r.savedAt,kind:'cylinder'});tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);}); } finally {db.close();}
}
export async function damage(id: string, mode: 'checksum' | 'metadata' | 'identity' | 'ownership' | 'future' | 'length' | 'nonfinite') {
  const r = await raw(id), bad = `broken-${mode}`; r.id=bad; r.metadata.terrainId=bad; r.name=bad;
  if(mode==='checksum')new DataView(r.elevations).setFloat32(0,123,true);
  if(mode==='metadata')r.metadata.geometry.radiusMeters++;
  if(mode==='identity')r.metadata.geometry.identity.worldId='foreign';
  if(mode==='ownership')r.metadata.representation.ownership='duplicate-rims';
  if(mode==='future')r.formatVersion=999;
  if(mode==='length')r.elevations=r.elevations.slice(4);
  if(mode==='nonfinite')new DataView(r.elevations).setFloat32(0,Infinity,true);
  await putRecord(r); return bad;
}
export async function signedSeed(n: number) {
  const t=createCylinderPreviewTerrain(n), specials=[-0,0,-(2**-149),2**-149,-12345.5,3.4028234663852886e38];
  for(const k of t.samples())t.write(k,specials[k.index%specials.length]!);
  await store.save(await encodeCylindricalHeightmap(t,`Signed cylinder ${n}`));return stored(t.metadata.terrainId);
}
export async function collisionProof(id: string) {
  const r=await raw(id),before=await stored(id),messages=[];
  for(const mode of ['radius','identity','resolution']) {
    const geometry=structuredClone(r.metadata.geometry),resolution=structuredClone(r.metadata.representation.resolution);
    if(mode==='radius')geometry.radiusMeters++;
    if(mode==='identity')geometry.identity.surfaceId+='different';
    if(mode==='resolution'){resolution.angularSamples=64;resolution.axialCells=32;resolution.radialCells=16;}
    const terrain=createCylindricalTerrain({terrainId:id,geometry,resolution});
    try{await store.save(await encodeCylindricalHeightmap(terrain,'Collision'));}catch(e){messages.push(String(e));}
  }
  return{messages,unchanged:JSON.stringify(await stored(id))===JSON.stringify(before)};
}
let old: ReturnType<typeof cylinderPreviewInspection> | undefined;
export function holdOld(){old=cylinderPreviewInspection();return old.snapshot(false);}
export function oldSnapshot(){return old!.snapshot(false);}
export async function benchmark(n:number){
  const t=createCylinderPreviewTerrain(n);for(const k of t.samples())t.write(k,k.index%11?Math.sin(k.index*.7)*1500:-0);
  let running=true,ticks=0,last=performance.now(),maxFrameGapMs=0,id=0;const beat=(now:number)=>{if(!running)return;maxFrameGapMs=Math.max(maxFrameGapMs,now-last);last=now;ticks++;id=requestAnimationFrame(beat);};id=requestAnimationFrame(beat);
  const stages:Record<string,number>={};const measure=async<T,>(name:string,fn:()=>Promise<T>)=>{const start=performance.now(),result=await fn();stages[name]=performance.now()-start;return result;};
  const r=await measure('encodeMs',()=>encodeCylindricalHeightmap(t,`Benchmark ${n}`));await measure('validateAtomicWriteMs',()=>store.save(r));const record=await measure('readMs',()=>raw(r.id));const loaded=await measure('validateRestoreMs',()=>decodeCylindricalHeightmap(record));const ready=await measure('prepareDisplayMs',()=>prepareCylinderSession(loaded.terrain,loaded.name,true));
  running=false;cancelAnimationFrame(id);const result={n,stages,ticks,maxFrameGapMs,cacheBytes:ready.editor.cache.byteLength,exact:await hash(t.copyElevations().buffer as ArrayBuffer)===await hash(loaded.terrain.copyElevations().buffer as ArrayBuffer),metadataExact:JSON.stringify(t.metadata)===JSON.stringify(loaded.terrain.metadata),heap:(performance as Performance&{memory?:{usedJSHeapSize:number;totalJSHeapSize:number;jsHeapSizeLimit:number}}).memory};ready.editor.dispose();return result;
}
