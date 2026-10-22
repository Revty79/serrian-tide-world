import {createCylindricalTerrain,type CylindricalTerrain} from '../terrain/cylindrical.ts';
import {beginCylinderWorkerNumerics} from './cylinder-worker-numerics.ts';
import {prepareCylinderStencil} from '../rendering/cylindrical-raster.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import type {CylinderWorkOutput} from './cylinder-work-protocol.ts';
export function createCylinderWorkRuntime(send:(message:CylinderWorkOutput)=>void,schedule:(fn:()=>void)=>void){return createConnectedWorkRuntime(send,schedule,{create:(metadata:CylindricalTerrain['metadata'])=>createCylindricalTerrain({terrainId:metadata.terrainId,geometry:metadata.geometry,resolution:metadata.representation.resolution}),begin:beginCylinderWorkerNumerics,preview:prepareCylinderStencil});}
