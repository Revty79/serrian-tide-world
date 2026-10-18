import type { Terrain } from '../terrain/model.ts';

export async function payloadChecksum(header: unknown, payload: ArrayBuffer) {
  const prefix = new TextEncoder().encode(JSON.stringify(header));
  const bytes = new Uint8Array(prefix.length + payload.byteLength);
  bytes.set(prefix); bytes.set(new Uint8Array(payload), prefix.length);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function encodeElevationPayload(terrain: Terrain) {
  if (terrain.elevations.length !== terrain.metadata.resolution.columns * terrain.metadata.resolution.rows) throw new Error('Incorrect elevation count.');
  const payload = new ArrayBuffer(terrain.elevations.byteLength), view = new DataView(payload);
  const bits = new Uint32Array(terrain.elevations.buffer, terrain.elevations.byteOffset, terrain.elevations.length);
  terrain.elevations.forEach((value, index) => {
    if (!Number.isFinite(value)) throw new Error('Saved elevations must be finite.');
    view.setUint32(index * 4, bits[index]!, true);
  });
  return payload;
}
export function decodeElevationPayload(payload: ArrayBuffer, target: Float32Array) {
  if (payload.byteLength !== target.byteLength) throw new Error('Incorrect elevation byte length.');
  const bits = new Uint32Array(target.buffer, target.byteOffset, target.length), view = new DataView(payload);
  for (let i = 0; i < bits.length; i++) {
    if (!Number.isFinite(view.getFloat32(i * 4, true))) throw new Error('Saved elevations must be finite.');
    bits[i] = view.getUint32(i * 4, true);
  }
}
