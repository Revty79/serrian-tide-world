import type {DodecahedronGeometry} from '../surfaces/dodecahedron.ts';
import type {DodecahedronTerrain} from '../terrain/dodecahedron.ts';
import {createTriangularPolyhedronView} from './triangular-polyhedron-view.ts';
/** Eleven real physical joins; all 24 internal diagonals remain attached.
 * Pairwise triangle separation and inverse projection verify this fixed net. */
export const DODECAHEDRON_NET_JOINS=Object.freeze([[1,2],[1,3],[1,4],[1,5],[1,6],[2,7],[4,8],[3,9],[2,10],[4,11],[7,12]].map(p=>Object.freeze(p)));
export function dodecahedronNetRoutes(g:DodecahedronGeometry){
 const tree=new Map(g.faces.map(f=>[f,[] as string[]]));const link=(a:string,b:string)=>{tree.get(a)!.push(b);tree.get(b)!.push(a);};
 for(const p of g.physicalFaces){link(`${p.id}:0`,`${p.id}:1`);link(`${p.id}:1`,`${p.id}:2`);}
 for(const[a,b]of DODECAHEDRON_NET_JOINS)for(const f of g.faces.filter(f=>g.physicalFaceId(f)===`pentagon-${a}`))for(const q of g.faces.filter(f=>g.physicalFaceId(f)===`pentagon-${b}`))if(g.vertexIds(f).filter(v=>g.vertexIds(q).includes(v)).length===2)link(f,q);
 const routes:string[][]=[];function walk(face:string,prior:string|undefined,path:string[]){const r=[...path,face];routes.push(r);for(const f of tree.get(face)!)if(f!==prior)walk(f,face,r);}walk('pentagon-1:0',undefined,[]);return routes;
}
const view=createTriangularPolyhedronView<DodecahedronGeometry,DodecahedronTerrain>(dodecahedronNetRoutes);
export const initialDodecahedronView=view.initial,dodecahedronNetPoint=view.netPoint,dodecahedronLayout=view.layout,unprojectDodecahedron=view.unproject,projectDodecahedron=view.project,navigateDodecahedron=view.navigate,dodecahedronVisibility=view.visibility,dodecahedronIndexVisible=view.indexVisible,DODECAHEDRON_PROJECTION=view.projection;
