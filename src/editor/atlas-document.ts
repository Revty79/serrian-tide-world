import { createCylindricalTerrain } from '../terrain/cylindrical.ts';
import { prepareCylinderSession } from './prepare-cylinder-session.ts';
import { assertInteractiveCylinderDimensions, cylinderResolution } from './cylinder-configuration.ts';
import { TerrainDocument } from './terrain-document.ts';
import { createBlankTerrain } from '../terrain/model.ts';
import { createWrappedTerrain, isWrapped } from '../terrain/topology.ts';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { prepareSphericalSession } from './prepare-spherical-session.ts';
import type { PersistenceWork } from '../persistence/cooperative-work.ts';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {prepareCubeSession} from './prepare-cube-session.ts';
import {assertInteractiveCube} from './cube-configuration.ts';

import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {prepareHollowCubeDocument} from './hollow-cube-document.ts';
import {createHollowSphereWorld} from '../terrain/hollow-sphere.ts';
import {prepareHollowSphereDocument} from './hollow-sphere-document.ts';

export type WorldShape = 'bounded' | 'wrapped' | 'sphere' | 'cylinder' | 'cube' | 'hollow-cube' | 'hollow-sphere';
export interface WorldSetup { shape: WorldShape; name: string; radiusMeters: number; cellsPerEdge: 128 | 256; lengthMeters?: number; cylinderDetail?: 64 | 128 | 256; sideLengthMeters?:number;innerSideLengthMeters?:number;innerRadiusMeters?:number }
export type AtlasDocument = ({kind:'hollow-sphere'} & Awaited<ReturnType<typeof prepareHollowSphereDocument>>) | ({kind:'hollow-cube'} & Awaited<ReturnType<typeof prepareHollowCubeDocument>>) | ({ kind: 'cube' } & Awaited<ReturnType<typeof prepareCubeSession>>) | ({ kind: 'cylinder' } & Awaited<ReturnType<typeof prepareCylinderSession>>) | { kind: 'planar'; document: TerrainDocument } | ({ kind: 'sphere' } & Awaited<ReturnType<typeof prepareSphericalSession>>);
export function documentShape(active: AtlasDocument): WorldShape { return active.kind==='hollow-sphere'?'hollow-sphere':active.kind === 'hollow-cube' ? 'hollow-cube' : active.kind === 'cube' ? 'cube' : active.kind === 'cylinder' ? 'cylinder' : active.kind === 'sphere' ? 'sphere' : isWrapped(active.document.terrain) ? 'wrapped' : 'bounded'; }
export const shapeName = (shape: WorldShape) => ({ bounded: 'Bounded flat map', wrapped: 'Horizontally wrapped flat map', sphere: 'Spherical world', cylinder: 'Physical capped cylinder', cube:'Solid cube world', 'hollow-cube':'Hollow cube world','hollow-sphere':'Hollow sphere world' })[shape];
export const documentName = (active: AtlasDocument) => active.kind !== 'planar' ? active.editor.name : active.document.name;
export const documentModified = (active: AtlasDocument) => active.kind !== 'planar' ? active.editor.modified : active.document.dirty;
export async function createAtlasDocument(setup: WorldSetup, work?: PersistenceWork): Promise<AtlasDocument> {
  if (!['bounded', 'wrapped', 'sphere', 'cylinder', 'cube', 'hollow-cube','hollow-sphere'].includes(setup.shape)) throw new RangeError('Unsupported world shape.');
  if (!setup.name.trim() || setup.name.trim().length > 120) throw new RangeError('Enter a world/map name of 1–120 characters.');
  const id = crypto.randomUUID(), name = setup.name.trim();
  if(setup.shape==='hollow-sphere'){
    if(![128,256].includes(setup.cellsPerEdge))throw RangeError('Select N128 or N256.');
    const world=createHollowSphereWorld({provider:'physical-hollow-sphere',version:1,worldId:id,outerRadiusMeters:setup.radiusMeters,innerRadiusMeters:setup.innerRadiusMeters??NaN,surfaces:{exterior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()},interior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()}}},setup.cellsPerEdge);
    return{kind:'hollow-sphere',...await prepareHollowSphereDocument(world,name,false,'exterior',work)};
  }
  if(setup.shape==='hollow-cube'){
    const outer=setup.sideLengthMeters??NaN,inner=setup.innerSideLengthMeters??NaN;assertInteractiveCube(outer,setup.cellsPerEdge);assertInteractiveCube(inner,setup.cellsPerEdge);
    const world=createHollowCubeWorld({provider:'physical-hollow-cube',version:1,worldId:id,outerSideLengthMeters:outer,innerSideLengthMeters:inner,surfaces:{exterior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()},interior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()}}},setup.cellsPerEdge);
    return{kind:'hollow-cube',...await prepareHollowCubeDocument(world,name,false,undefined,work)};
  }
  if(setup.shape==='cube'){
    const sideLengthMeters=setup.sideLengthMeters??NaN;assertInteractiveCube(sideLengthMeters,setup.cellsPerEdge);
    const terrain=createSolidCubeTerrain({terrainId:id,cellsPerEdge:setup.cellsPerEdge,geometry:{identity:{worldId:crypto.randomUUID(),surfaceId:crypto.randomUUID()},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters}});
    return{kind:'cube',...await prepareCubeSession(terrain,name,false,work)};
  }
  if (setup.shape === 'cylinder') {
    const lengthMeters = setup.lengthMeters ?? NaN; assertInteractiveCylinderDimensions(setup.radiusMeters, lengthMeters);
    const resolution = cylinderResolution(setup.cylinderDetail ?? NaN);
    const terrain = createCylindricalTerrain({ terrainId: id, geometry: { identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: setup.radiusMeters, lengthMeters }, resolution });
    return { kind: 'cylinder', ...await prepareCylinderSession(terrain, name, false, work) };
  }
  if (setup.shape === 'sphere') {
    if (![128, 256].includes(setup.cellsPerEdge)) throw new RangeError('Select N=128 or N=256.');
    const terrain = createSphericalTerrain({ terrainId: id, identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, radiusMeters: setup.radiusMeters, cellsPerEdge: setup.cellsPerEdge });
    return { kind: 'sphere', ...await prepareSphericalSession(terrain, name, false, work) };
  }
  const terrain = setup.shape === 'wrapped' ? createWrappedTerrain({ id, identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID(), patchId: 'periodic-grid' } }) : createBlankTerrain({ id });
  return { kind: 'planar', document: new TerrainDocument(terrain, name) };
}
