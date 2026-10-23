import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {PolyhedronGeometry} from '../surfaces/polyhedron-contract.ts';
import type {CylinderView,CylinderViewport,CylinderScreenPoint} from './cylindrical-view.ts';
export interface PolyhedronProjection<G extends PolyhedronGeometry>{
 layout(g:G,view:CylinderView,size:CylinderViewport):{x:number;y:number;scale:number};
 netPoint(g:G,p:SurfacePosition):readonly[number,number];
 project(g:G,p:SurfacePosition,view:CylinderView,size:CylinderViewport):CylinderScreenPoint|undefined;
 unproject(g:G,view:CylinderView,size:CylinderViewport,p:CylinderScreenPoint):SurfacePosition|undefined;
}
