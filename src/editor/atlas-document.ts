import {createTetrahedronTerrain} from '../terrain/tetrahedron.ts';
import {prepareTetrahedronSession} from './tetrahedron-session.ts';
import {assertInteractiveTetrahedron} from './tetrahedron-configuration.ts';
import {createHollowPyramidWorld} from '../terrain/hollow-pyramid.ts';
import {prepareHollowPyramidDocument} from './hollow-pyramid-document.ts';
import {hollowPyramidDimensions,type HollowPyramidConfiguration} from '../surfaces/hollow-pyramid.ts';
import {createPyramidTerrain} from '../terrain/pyramid.ts';
import {preparePyramidSession} from './pyramid-session.ts';
import {assertInteractivePyramid} from './pyramid-configuration.ts';
import {createHollowCylinderWorld} from '../terrain/hollow-cylinder.ts';
import {prepareHollowCylinderDocument} from './hollow-cylinder-document.ts';
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
import {hollowStartingElevation,type HollowTerrainStart} from '../terrain/initial-elevation.ts';
import {createOpenCylinderWorld} from '../terrain/open-cylinder.ts';
import {prepareOpenCylinderDocument} from './open-cylinder-document.ts';

export type WorldShape = 'tetrahedron' | 'hollow-pyramid' | 'pyramid' | 'bounded' | 'wrapped' | 'sphere' | 'cylinder' | 'cube' | 'hollow-cube' | 'hollow-sphere' | 'hollow-cylinder' | 'open-cylinder';
export interface WorldSetup { tetrahedronEdgeMeters?:number; innerBaseWidthMeters?:number;innerHeightMeters?:number;innerBaseZMeters?:number;baseWidthMeters?:number;heightMeters?:number; shape: WorldShape; name: string; radiusMeters: number; cellsPerEdge: 128 | 256; lengthMeters?: number; cylinderDetail?: 64 | 128 | 256; sideLengthMeters?:number;innerSideLengthMeters?:number;innerRadiusMeters?:number;innerLengthMeters?:number;terrainStart?:HollowTerrainStart }
export type AtlasDocument = ({kind:'tetrahedron'} & Awaited<ReturnType<typeof prepareTetrahedronSession>>) | ({kind:'hollow-pyramid'} & Awaited<ReturnType<typeof prepareHollowPyramidDocument>>) | ({kind:'pyramid'} & Awaited<ReturnType<typeof preparePyramidSession>>) | ({kind:'open-cylinder'} & Awaited<ReturnType<typeof prepareOpenCylinderDocument>>) | ({kind:'hollow-cylinder'} & Awaited<ReturnType<typeof prepareHollowCylinderDocument>>) | ({kind:'hollow-sphere'} & Awaited<ReturnType<typeof prepareHollowSphereDocument>>) | ({kind:'hollow-cube'} & Awaited<ReturnType<typeof prepareHollowCubeDocument>>) | ({ kind: 'cube' } & Awaited<ReturnType<typeof prepareCubeSession>>) | ({ kind: 'cylinder' } & Awaited<ReturnType<typeof prepareCylinderSession>>) | { kind: 'planar'; document: TerrainDocument } | ({ kind: 'sphere' } & Awaited<ReturnType<typeof prepareSphericalSession>>);
export function documentShape(active: AtlasDocument): WorldShape { return active.kind==='tetrahedron'?'tetrahedron':active.kind==='hollow-pyramid'?'hollow-pyramid':active.kind==='pyramid'?'pyramid':active.kind==='open-cylinder'?'open-cylinder':active.kind==='hollow-cylinder'?'hollow-cylinder':active.kind==='hollow-sphere'?'hollow-sphere':active.kind === 'hollow-cube' ? 'hollow-cube' : active.kind === 'cube' ? 'cube' : active.kind === 'cylinder' ? 'cylinder' : active.kind === 'sphere' ? 'sphere' : isWrapped(active.document.terrain) ? 'wrapped' : 'bounded'; }
export const shapeName = (shape: WorldShape) => ({ tetrahedron:'Solid tetrahedron world','hollow-pyramid':'Hollow pyramid world',pyramid:'Solid pyramid world', bounded: 'Bounded flat map', wrapped: 'Horizontally wrapped flat map', sphere: 'Spherical world', cylinder: 'Physical capped cylinder', cube:'Solid cube world', 'hollow-cube':'Hollow cube world','hollow-sphere':'Hollow sphere world','hollow-cylinder':'Capped hollow cylinder world','open-cylinder':'Open cylinder world' })[shape];
export const documentName = (active: AtlasDocument) => active.kind !== 'planar' ? active.editor.name : active.document.name;
export const documentModified = (active: AtlasDocument) => active.kind !== 'planar' ? active.editor.modified : active.document.dirty;
export async function createAtlasDocument(setup: WorldSetup, work?: PersistenceWork): Promise<AtlasDocument> {
  if (!['bounded', 'wrapped', 'sphere', 'cylinder', 'cube', 'hollow-cube','hollow-sphere','hollow-cylinder','open-cylinder','pyramid','hollow-pyramid','tetrahedron'].includes(setup.shape)) throw new RangeError('Unsupported world shape.');
  if (!setup.name.trim() || setup.name.trim().length > 120) throw new RangeError('Enter a world/map name of 1–120 characters.');
  const id = crypto.randomUUID(), name = setup.name.trim();
  if(setup.shape==='tetrahedron'){const edge=setup.tetrahedronEdgeMeters??1000000;assertInteractiveTetrahedron(edge,setup.cellsPerEdge);const terrain=createTetrahedronTerrain({terrainId:id,geometry:{provider:'physical-regular-tetrahedron',version:1,identity:{worldId:id,surfaceId:crypto.randomUUID()},role:'exterior',edgeLengthMeters:edge},subdivisions:setup.cellsPerEdge});return{kind:'tetrahedron',...await prepareTetrahedronSession(terrain,name,false,work)};}
  if(setup.shape==='hollow-pyramid'){
    const configuration:HollowPyramidConfiguration={provider:'physical-hollow-pyramid',version:1,worldId:id,outerBaseWidthMeters:setup.baseWidthMeters??2000000,outerHeightMeters:setup.heightMeters??1600000,innerBaseWidthMeters:setup.innerBaseWidthMeters??1600000,innerHeightMeters:setup.innerHeightMeters??1280000,innerBaseZMeters:setup.innerBaseZMeters??160000,surfaces:{exterior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()},interior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()}}},start=hollowStartingElevation(setup.terrainStart,hollowPyramidDimensions(configuration).minimumClearanceMeters),world=createHollowPyramidWorld(configuration,setup.cellsPerEdge,start);
    return{kind:'hollow-pyramid',...await prepareHollowPyramidDocument(world,name,false,'exterior',work)};
  }
  if(setup.shape==='pyramid'){const w=setup.baseWidthMeters??2000000,h=setup.heightMeters??1600000;assertInteractivePyramid(w,h,setup.cellsPerEdge);const terrain=createPyramidTerrain({terrainId:id,geometry:{identity:{worldId:id,surfaceId:crypto.randomUUID()},provider:'physical-square-pyramid',version:1,role:'exterior',baseWidthMeters:w,heightMeters:h,baseZMeters:0},subdivisions:setup.cellsPerEdge});return{kind:'pyramid',...await preparePyramidSession(terrain,name,false,work)};}
  if(setup.shape==='open-cylinder'){
    const inner=setup.innerRadiusMeters??NaN,world=createOpenCylinderWorld({identity:{worldId:id,surfaceId:crypto.randomUUID()},terrainId:crypto.randomUUID(),provider:'physical-open-cylinder',version:1,configuration:'both-open',outerRadiusMeters:setup.radiusMeters,innerRadiusMeters:inner,lengthMeters:setup.lengthMeters??NaN},cylinderResolution(setup.cylinderDetail??NaN),hollowStartingElevation(setup.terrainStart,Math.min(setup.radiusMeters-inner,setup.lengthMeters??NaN)));
    return{kind:'open-cylinder',...await prepareOpenCylinderDocument(world,name,false,'exterior',work)};
  }
  if(setup.shape==='hollow-cylinder'){
    const start=hollowStartingElevation(setup.terrainStart,Math.min(setup.radiusMeters-(setup.innerRadiusMeters??NaN),((setup.lengthMeters??NaN)-(setup.innerLengthMeters??NaN))/2));
    const world=createHollowCylinderWorld({provider:'physical-hollow-cylinder',version:1,configuration:'capped',worldId:id,outerRadiusMeters:setup.radiusMeters,innerRadiusMeters:setup.innerRadiusMeters??NaN,outerLengthMeters:setup.lengthMeters??NaN,innerLengthMeters:setup.innerLengthMeters??NaN,surfaces:{exterior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()},interior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()}}},cylinderResolution(setup.cylinderDetail??NaN),start);
    return{kind:'hollow-cylinder',...await prepareHollowCylinderDocument(world,name,false,'exterior',work)};
  }
  if(setup.shape==='hollow-sphere'){
    if(![128,256].includes(setup.cellsPerEdge))throw RangeError('Select N128 or N256.');
    const world=createHollowSphereWorld({provider:'physical-hollow-sphere',version:1,worldId:id,outerRadiusMeters:setup.radiusMeters,innerRadiusMeters:setup.innerRadiusMeters??NaN,surfaces:{exterior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()},interior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()}}},setup.cellsPerEdge,hollowStartingElevation(setup.terrainStart,setup.radiusMeters-(setup.innerRadiusMeters??NaN)));
    return{kind:'hollow-sphere',...await prepareHollowSphereDocument(world,name,false,'exterior',work)};
  }
  if(setup.shape==='hollow-cube'){
    const outer=setup.sideLengthMeters??NaN,inner=setup.innerSideLengthMeters??NaN;assertInteractiveCube(outer,setup.cellsPerEdge);assertInteractiveCube(inner,setup.cellsPerEdge);
    const world=createHollowCubeWorld({provider:'physical-hollow-cube',version:1,worldId:id,outerSideLengthMeters:outer,innerSideLengthMeters:inner,surfaces:{exterior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()},interior:{surfaceId:crypto.randomUUID(),terrainId:crypto.randomUUID()}}},setup.cellsPerEdge,hollowStartingElevation(setup.terrainStart,(outer-inner)/2));
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
