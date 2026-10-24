import {pyramidUnit,pyramidCross} from '../surfaces/pyramid.ts';
import type {FloatingIslandGeometry} from '../surfaces/floating-island.ts';
import type {FloatingIslandTerrain} from '../terrain/floating-island.ts';
import {createTriangularPolyhedronView} from './triangular-polyhedron-view.ts';
/** Open the five lateral joins and keep each cliff/underside petal attached
 * to its real upper edge. Internal fan diagonals stay attached. */
export function floatingIslandNetRoutes(g:FloatingIslandGeometry){
 const root=g.faces[0]!,routes=new Map<string,readonly string[]>([[root,[root]]]),queue=[root];
 while(queue.length){const a=queue.shift()!,pa=g.physicalFaceId(a);for(const b of g.faces){if(routes.has(b))continue;const pb=g.physicalFaceId(b),allowed=pa===pb||pa==='upper'&&pb.startsWith('cliff-')||pb==='upper'&&pa.startsWith('cliff-')||pa.replace('cliff-','underside-')===pb||pb.replace('cliff-','underside-')===pa;if(allowed&&g.vertexIds(a).filter(i=>g.vertexIds(b).includes(i)).length===2){routes.set(b,Object.freeze([...routes.get(a)!,b]));queue.push(b);}}}
 if(routes.size!==g.faces.length)throw Error('Incomplete island unfolding.');
 return Object.freeze([...routes.values()]);
}
const view=createTriangularPolyhedronView<FloatingIslandGeometry,FloatingIslandTerrain>(floatingIslandNetRoutes);
export const initialFloatingIslandView=(g:FloatingIslandGeometry,mode:Parameters<typeof view.initial>[1]='physical')=>{const forward=pyramidUnit([.8,1,.9]),right=pyramidUnit(pyramidCross([0,1,0],forward));return{...view.initial(g,mode),frame:{forward,right,up:pyramidCross(forward,right)}};},floatingIslandNetPoint=view.netPoint,floatingIslandLayout=view.layout,unprojectFloatingIsland=view.unproject,projectFloatingIsland=view.project,navigateFloatingIsland=view.navigate,floatingIslandVisibility=view.visibility,floatingIslandIndexVisible=view.indexVisible,FLOATING_ISLAND_PROJECTION=view.projection;
