import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import type {PolyhedronProjection} from '../rendering/polyhedron-projection.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {PolyhedronVector} from '../surfaces/polyhedron-contract.ts';
import {PolyhedronPresentation} from '../rendering/polyhedron-presentation.ts';
import {polyhedronCutView,type PolyhedronExcavationScene} from '../rendering/polyhedron-excavation-scene.ts';
import {polyhedronViewRay} from '../rendering/polyhedron-excavation-view.ts';
import {polyhedronExcavationPosition,polyhedronInspectionEyeFits} from '../surfaces/polyhedron-excavation.ts';
import type {WorkspaceTerrain,ConnectedWorkspaceAdapter} from './connected-workspace-contracts.ts';
/** Add the shared material/CSG contract to an accepted polyhedral geometry
 * adapter. Ordinary geometry, terrain tools, camera handling and display stay
 * in that original adapter and the accepted common presentation. */
export function withPolyhedronExcavation<T extends PolyhedronTerrain&WorkspaceTerrain>(terrain:T,base:ConnectedWorkspaceAdapter<T,CylinderView,undefined>,projection:PolyhedronProjection<T['geometry']>):ConnectedWorkspaceAdapter<T,CylinderView,PolyhedronExcavationScene>{
 const g=terrain.geometry;let presentation:PolyhedronPresentation<T>|undefined;
 return{...base,
  pointAt:(cache,view,size,point,scene)=>{if(polyhedronCutView(view,scene)){const ray=polyhedronViewRay(g,projection,view,size,point);return polyhedronExcavationPosition(scene!,ray.origin,ray.direction,g.identity.surfaceId);}return base.pointAt(cache,view,size,point);},
  inspectionForward:direction=>direction.map(x=>-x) as unknown as PolyhedronVector,
  validateEye:(eye,scene)=>scene?polyhedronInspectionEyeFits(scene,eye):base.validateEye(eye),
  cutView:polyhedronCutView,
  sceneStamp:scene=>scene?[scene.revision,scene.role,...Object.values(scene.banks).map(cache=>cache.sourceRevision)].join(':'):'',
  raster:function*(_cache,view,size,budget,reusable,appearance,scene){if(!presentation)throw Error('The accepted polyhedral presentation is required.');presentation.setScene(scene);return yield* presentation.raster(view,size,budget,reusable,appearance);},
  gpu:(canvas,cache,invalidate,fallback)=>{const current=base.gpu(canvas,cache,invalidate,fallback);if(!(current instanceof PolyhedronPresentation))throw Error('Physical polyhedral cuts require the accepted common presentation.');presentation=current as PolyhedronPresentation<T>;return presentation;},
 };
}
