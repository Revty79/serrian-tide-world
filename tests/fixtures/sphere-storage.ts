// Test-only IndexedDB inspection/fault injection and performance measurements. No DOM roots or product hooks.
import { LocalMapStore } from '../../src/persistence/local-map-store.ts';
import { encodeMap } from '../../src/persistence/map-format.ts';
import { createBlankTerrain } from '../../src/terrain/model.ts';
import { createWrappedTerrain } from '../../src/terrain/topology.ts';
import { createSphericalTerrain } from '../../src/terrain/spherical.ts';
import { encodeSphericalHeightmap, decodeSphericalHeightmap } from '../../src/persistence/spherical-format.ts';
import { prepareSphericalSession } from '../../src/editor/prepare-spherical-session.ts';
import { startSphericalBrushStroke } from '../../src/terrain/spherical-brush.ts';
import { unprojectSphere, INITIAL_SPHERICAL_VIEW } from '../../src/rendering/spherical-view.ts';
import { CUBE_FACES } from '../../src/surfaces/cube-sphere.ts';
const store = new LocalMapStore();
async function db() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('serrian-tide-atlas', 1); request.onupgradeneeded = () => { request.result.createObjectStore('heightmaps', { keyPath: 'id' }); request.result.createObjectStore('catalog', { keyPath: 'id' }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function raw(id: string) { const database = await db(); try { return await new Promise<any>((resolve, reject) => { const tx = database.transaction('heightmaps', 'readonly'), request = tx.objectStore('heightmaps').get(id); tx.oncomplete = () => resolve(request.result); tx.onabort = () => reject(tx.error); }); } finally { database.close(); } }
async function put(value: any, legacy = false) { const database = await db(); try { await new Promise<void>((resolve, reject) => { const tx = database.transaction(['heightmaps', 'catalog'], 'readwrite'); tx.objectStore('heightmaps').put(value); tx.objectStore('catalog').put({ id: value.id, name: value.name, savedAt: value.savedAt, ...(legacy ? {} : { kind: 'sphere' }) }); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); } finally { database.close(); } }
async function hash(buffer: ArrayBuffer) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), (v) => v.toString(16).padStart(2, '0')).join(''); }
export async function summary(id?: string) {
  const list = await store.list(), record = await raw(id ?? list.find((m) => m.kind === 'sphere')!.id);
  const data = new DataView(record.elevations), words = Array.from({ length: Math.min(8, data.byteLength / 4) }, (_, i) => data.getUint32(i * 4, true));
  return { id: record.id, name: record.name, metadata: record.metadata, version: record.formatVersion, checksum: record.checksum, bytes: record.elevations.byteLength, payloadSha256: await hash(record.elevations), firstWords: words, catalog: list };
}
export async function seed() {
  const bounded = await encodeMap(createBlankTerrain({ id: 'legacy-bounded' }), 'Legacy bounded'), wrapped = await encodeMap(createWrappedTerrain({ id: 'legacy-wrapped', identity: { worldId: 'old', surfaceId: 'plane', patchId: 'periodic' } }), 'Legacy wrapped');
  await put(bounded, true); await put(wrapped, true);
  const t = createSphericalTerrain({ terrainId: 'rich-sphere', identity: { worldId: 'rich-world', surfaceId: 'rich-surface' }, radiusMeters: 735000, cellsPerEdge: 128 });
  for (let i = 0; i < 8; i++) t.write(t.keyAt(i), [-0, 0, -(2 ** -149), 2 ** -149, -12345.5, 9000, 50, -500][i]!);
  for (const face of CUBE_FACES) for (const column of [0, 64, 128]) for (const row of [0, 64, 128]) { const k = t.resolve({ ...t.metadata.identity, patchId: face, column, row }); t.write(k, k.index % 2 ? -0 : k.index / 10); }
  await store.save(await encodeSphericalHeightmap(t, 'Rich signed sphere'));
  return { bounded: await summary(bounded.id), wrapped: await summary(wrapped.id), sphere: await summary('rich-sphere') };
}
export async function corrupt(id: string, mode: 'checksum' | 'future' | 'shape') { const record = await raw('rich-sphere'); record.id = id; record.metadata.terrainId = id; record.name = `Broken ${mode}`; if (mode === 'checksum') new DataView(record.elevations).setFloat32(0, 655, true); if (mode === 'future') record.formatVersion = 999; if (mode === 'shape') record.metadata.geometry.kind = 'cube'; await put(record); }
const originalPut = IDBObjectStore.prototype.put, originalOpen = IDBFactory.prototype.open;
export function fault(mode: 'none' | 'quota' | 'abort' | 'denied') {
  IDBObjectStore.prototype.put = originalPut; IDBFactory.prototype.open = originalOpen;
  if (mode === 'denied') { IDBFactory.prototype.open = function () { throw new DOMException('Storage denied for test', 'SecurityError'); }; return; }
  if (mode === 'none') return;
  IDBObjectStore.prototype.put = function (value, key?) {
    if (this.name === 'heightmaps' && value.formatVersion === 3) {
      if (mode === 'quota') throw new DOMException('Quota exhausted for test', 'QuotaExceededError');
      const request = key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key); queueMicrotask(() => this.transaction.abort()); return request;
    }
    return key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key);
  };
}
export async function overwriteProof() {
  const valid = await raw('rich-sphere'), before = await summary('rich-sphere'), failures: string[] = [];
  const t = createSphericalTerrain({ terrainId: 'rich-sphere', identity: valid.metadata.identity, radiusMeters: 123, cellsPerEdge: 128 });
  const colliding = createSphericalTerrain({ terrainId: 'legacy-bounded', identity: valid.metadata.identity, radiusMeters: 735000, cellsPerEdge: 128 });
  for (const record of [await encodeSphericalHeightmap(t, 'Wrong geometry'), await encodeMap(createBlankTerrain({ id: 'rich-sphere' }), 'Wrong plane'), await encodeSphericalHeightmap(colliding, 'Wrong existing format')]) {
    try { await store.save(record); } catch (e) { failures.push(String(e)); }
  }
  return { failures, unchanged: (await summary('rich-sphere')).payloadSha256 === before.payloadSha256 };
}
export async function expectedStroke(a: { x: number; y: number }, b: { x: number; y: number }, size: { width: number; height: number }) {
  const terrain = createSphericalTerrain({ terrainId: 'expected', identity: { worldId: 'expected', surfaceId: 'sphere' }, radiusMeters: 1000000, cellsPerEdge: 128 });
  const start = unprojectSphere(terrain, a, INITIAL_SPHERICAL_VIEW, size)!, end = unprojectSphere(terrain, b, INITIAL_SPHERICAL_VIEW, size)!;
  const stroke = startSphericalBrushStroke(terrain, { ...terrain.metadata.identity, direction: start }, { tool: 'raise', radiusMeters: 80000, strengthMeters: 200 }, undefined, { hemisphere: INITIAL_SPHERICAL_VIEW.frame.forward });
  stroke.moveTo({ ...terrain.metadata.identity, direction: end }); stroke.end(); return hash(terrain.copyElevations().buffer as ArrayBuffer);
}
export async function benchmark(n: number) {
  const stages: Record<string, number> = {}, t = createSphericalTerrain({ terrainId: `performance-${n}`, identity: { worldId: 'performance', surfaceId: 'sphere' }, radiusMeters: 1000000, cellsPerEdge: n });
  for (let i = 0; i < t.sampleCount; i++) t.write(t.keyAt(i), i % 11 ? Math.sin(i * .7) * 1500 : -0);
  let last = performance.now(), maxGapMs = 0, ticks = 0, running = true;
  const beat = () => { if (!running) return; const now = performance.now(); maxGapMs = Math.max(maxGapMs, now - last); last = now; ticks++; requestAnimationFrame(beat); }; requestAnimationFrame(beat);
  const measure = async <T,>(name: string, action: () => Promise<T>) => { const start = performance.now(), result = await action(); stages[name] = performance.now() - start; return result; };
  const record = await measure('encodeMs', () => encodeSphericalHeightmap(t, `Performance N${n}`));
  await measure('validateAndAtomicWriteMs', () => store.save(record));
  const bytes = await measure('indexedDbReadMs', () => raw(record.id));
  const loaded = await measure('validateAndDecodeMs', () => decodeSphericalHeightmap(bytes));
  const ready = await measure('textureRestorationMs', () => prepareSphericalSession(loaded.terrain, loaded.name, true));
  running = false; const database = await db(), databaseVersion = database.version; database.close();
  return { n, stages, ticks, maxAnimationFrameGapMs: maxGapMs, maxTextureTaskMs: ready.maxPreparationTaskMs, authorityBytes: t.elevationByteLength, cacheBytes: ready.cache.byteLength, conservativeCodecTypedPayloadBytes: 4 * t.elevationByteLength, exact: await hash(t.copyElevations().buffer as ArrayBuffer) === await hash(loaded.terrain.copyElevations().buffer as ArrayBuffer), metadataExact: JSON.stringify(t.metadata) === JSON.stringify(loaded.terrain.metadata), databaseVersion };
}
