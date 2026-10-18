import { TerrainDocument } from './terrain-document.ts';
import { createBlankTerrain } from '../terrain/model.ts';
import { createWrappedTerrain, isWrapped } from '../terrain/topology.ts';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { prepareSphericalSession } from './prepare-spherical-session.ts';
import type { PersistenceWork } from '../persistence/cooperative-work.ts';

export type WorldShape = 'bounded' | 'wrapped' | 'sphere';
export interface WorldSetup { shape: WorldShape; name: string; radiusMeters: number; cellsPerEdge: 128 | 256 }
export type AtlasDocument = { kind: 'planar'; document: TerrainDocument } | ({ kind: 'sphere' } & Awaited<ReturnType<typeof prepareSphericalSession>>);
export function documentShape(active: AtlasDocument): WorldShape { return active.kind === 'sphere' ? 'sphere' : isWrapped(active.document.terrain) ? 'wrapped' : 'bounded'; }
export const shapeName = (shape: WorldShape) => ({ bounded: 'Bounded flat map', wrapped: 'Horizontally wrapped flat map', sphere: 'Spherical world' })[shape];
export const documentName = (active: AtlasDocument) => active.kind === 'sphere' ? active.editor.name : active.document.name;
export const documentModified = (active: AtlasDocument) => active.kind === 'sphere' ? active.editor.modified : active.document.dirty;
export async function createAtlasDocument(setup: WorldSetup, work?: PersistenceWork): Promise<AtlasDocument> {
  if (!setup.name.trim() || setup.name.trim().length > 120) throw new RangeError('Enter a world/map name of 1–120 characters.');
  const id = crypto.randomUUID(), name = setup.name.trim();
  if (setup.shape === 'sphere') {
    if (![128, 256].includes(setup.cellsPerEdge)) throw new RangeError('Select N=128 or N=256.');
    const terrain = createSphericalTerrain({ terrainId: id, identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, radiusMeters: setup.radiusMeters, cellsPerEdge: setup.cellsPerEdge });
    return { kind: 'sphere', ...await prepareSphericalSession(terrain, name, false, work) };
  }
  const terrain = setup.shape === 'wrapped' ? createWrappedTerrain({ id, identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID(), patchId: 'periodic-grid' } }) : createBlankTerrain({ id });
  return { kind: 'planar', document: new TerrainDocument(terrain, name) };
}
