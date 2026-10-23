import type {PolyhedronGeometry,PolyhedronVector} from '../surfaces/polyhedron-contract.ts';
import type {PolyhedronProjection} from './polyhedron-projection.ts';
import type {CylinderView,CylinderViewport,CylinderScreenPoint} from './cylindrical-view.ts';
import {pyramidUnit} from '../surfaces/pyramid.ts';
/** Reuses the accepted orthographic/perspective camera convention. Editing
 * rays start on the actual camera-facing side, beyond the convex body. */
export function polyhedronViewRays<G extends PolyhedronGeometry>(g:G,projection:PolyhedronProjection<G>,view:CylinderView,size:CylinderViewport){const l=projection.layout(g,view,size),inspection=view.interiorView==='center',far=8+Math.hypot(...view.target),orthographicDirection=view.frame.forward.map(x=>-x) as unknown as PolyhedronVector;return(p:CylinderScreenPoint)=>{const x=(p.x-l.x)/l.scale,y=(l.y-p.y)/l.scale,origin=inspection?view.eyeMeters??g.inspectionEyeMeters:g.centerMeters.map((v,k)=>v+g.scaleMeters*(view.target[k]!+x*view.frame.right[k]!+y*view.frame.up[k]!+far*view.frame.forward[k]!)) as unknown as PolyhedronVector,direction=inspection?pyramidUnit(view.frame.forward.map((v,k)=>-v-x*view.frame.right[k]!+y*view.frame.up[k]!) as unknown as PolyhedronVector):orthographicDirection;return{origin,direction};};}
export function polyhedronViewRay<G extends PolyhedronGeometry>(g:G,projection:PolyhedronProjection<G>,view:CylinderView,size:CylinderViewport,p:CylinderScreenPoint){return polyhedronViewRays(g,projection,view,size)(p);}
