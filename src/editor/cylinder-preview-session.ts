import {createCylindricalTerrain,type CylindricalTerrain} from '../terrain/cylindrical.ts';
import {beginCylindricalStroke} from '../terrain/cylindrical-stroke.ts';
import {CylinderDisplayCache,cylinderVisibilityGuard,prepareCylinderStencil} from '../rendering/cylindrical-raster.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {beginWorkerCylinderStroke,cylinderWorkerFactory} from './cylinder-worker-stroke.ts';
import {cylinderPreparedPatch} from './cylinder-prepared-patch.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import type {ConnectedSessionHooks} from './connected-session-contracts.ts';
export const CYLINDER_PREVIEW_RESOLUTIONS = [64, 128, 256] as const;
export function createCylinderPreviewTerrain(angularSamples: number = 128) {
  if (!(CYLINDER_PREVIEW_RESOLUTIONS as readonly number[]).includes(angularSamples)) throw new RangeError('Supported cylinder preview detail: 64, 128 or 256.');
  return createCylindricalTerrain({ terrainId: crypto.randomUUID(), geometry: { identity: { worldId: crypto.randomUUID(), surfaceId: crypto.randomUUID() }, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 1000000, lengthMeters: 1600000 }, resolution: { angularSamples, axialCells: angularSamples / 2, radialCells: angularSamples / 4 } });
}
const hooks=Object.freeze<ConnectedSessionHooks<CylindricalTerrain,CylinderView>>({
 createCache:t=>new CylinderDisplayCache(t),begin:beginCylindricalStroke,visibility:cylinderVisibilityGuard,prepareStencil:prepareCylinderStencil,
 workers:{factory:cylinderWorkerFactory,begin:beginWorkerCylinderStroke,preparedPatch:cylinderPreparedPatch,
  startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{},preview:view,measure},[values.buffer]),
 },
});
/** The accepted closed host adapter retains its public API and worker protocol. */
export class CylinderPreviewSession extends ConnectedPreviewSession<CylindricalTerrain,CylinderView>{constructor(terrain:CylindricalTerrain,name='Untitled cylinder',saved=false,persistent=false,options:{rollingWork?:boolean}={}){super(terrain,name,saved,persistent,options.rollingWork?{...hooks,strokeOptions:()=>({rollingWork:true})}:hooks);}}
