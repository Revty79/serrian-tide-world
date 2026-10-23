import type {TrapezohedronGeometry} from '../surfaces/trapezohedron.ts';
import type {TrapezohedronTerrain} from '../terrain/trapezohedron.ts';
import {createTriangularPolyhedronView} from './triangular-polyhedron-view.ts';
/** Nine physical joins form a non-overlapping kite strip. Each kite keeps its
 * internal diagonal attached; only genuine physical edges are map cuts. */
export const TRAPEZOHEDRON_NET_CHAIN=Object.freeze(['north-1','south-1','north-5','south-5','north-4','south-4','north-3','south-3','north-2','south-2']);
export function trapezohedronNetRoutes(g:TrapezohedronGeometry){
 const tree=new Map(g.faces.map(f=>[f,[] as string[]]));const link=(a:string,b:string)=>{tree.get(a)!.push(b);tree.get(b)!.push(a);};
 for(const p of TRAPEZOHEDRON_NET_CHAIN)link(`${p}:0`,`${p}:1`);
 for(let i=1;i<TRAPEZOHEDRON_NET_CHAIN.length;i++)for(const a of g.faces.filter(f=>g.physicalFaceId(f)===TRAPEZOHEDRON_NET_CHAIN[i-1]))for(const b of g.faces.filter(f=>g.physicalFaceId(f)===TRAPEZOHEDRON_NET_CHAIN[i]))if(g.vertexIds(a).filter(v=>g.vertexIds(b).includes(v)).length===2)link(a,b);
 const routes:string[][]=[];function walk(face:string,prior:string|undefined,path:string[]){const r=[...path,face];routes.push(r);for(const f of tree.get(face)!)if(f!==prior)walk(f,face,r);}walk('north-1:0',undefined,[]);return routes;
}
const view=createTriangularPolyhedronView<TrapezohedronGeometry,TrapezohedronTerrain>(trapezohedronNetRoutes);
export const initialTrapezohedronView=view.initial,trapezohedronNetPoint=view.netPoint,trapezohedronLayout=view.layout,unprojectTrapezohedron=view.unproject,projectTrapezohedron=view.project,navigateTrapezohedron=view.navigate,trapezohedronVisibility=view.visibility,trapezohedronIndexVisible=view.indexVisible,TRAPEZOHEDRON_PROJECTION=view.projection;
