import type {PhysicalPieceConfiguration as FloatingIslandConfiguration,PhysicalPieceGeometry as FloatingIslandGeometry} from '../surfaces/physical-piece.ts';
import {createPhysicalPieceGeometry as createFloatingIslandGeometry} from '../surfaces/physical-piece.ts';
import type {PolyhedronVector} from '../surfaces/polyhedron-contract.ts';
import {pyramidCross,pyramidDot,pyramidSub} from '../surfaces/pyramid.ts';
export interface IslandPlacement {readonly positionMeters:PolyhedronVector;readonly rotationDegrees:PolyhedronVector;readonly scale?:number}
export interface IslandDescriptor {readonly id:string;readonly name:string;readonly geometry:FloatingIslandConfiguration;readonly terrainId:string;readonly subdivisions:128|256;readonly placement:IslandPlacement}
export const MAX_ISLAND_COMPONENTS=4,MAX_ISLAND_SAMPLES=1_179_652;
export function islandPlacement(input:IslandPlacement):IslandPlacement{
 if(input?.scale!==undefined&&(!Number.isFinite(input.scale)||input.scale<.5||input.scale>2))throw RangeError('Fragment scale must be from 0.5 through 2.');
 if(!input||!Array.isArray(input.positionMeters)||!Array.isArray(input.rotationDegrees)||input.positionMeters.length!==3||input.rotationDegrees.length!==3||!input.positionMeters.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e12)||!input.rotationDegrees.every(x=>Number.isFinite(x)&&x>=-180&&x<=180))throw RangeError('Component placement requires finite supported positions and rotations from -180 through 180 degrees.');
 return Object.freeze({...input.scale!==undefined?{scale:input.scale}:{},positionMeters:Object.freeze([...input.positionMeters]) as PolyhedronVector,rotationDegrees:Object.freeze([...input.rotationDegrees]) as PolyhedronVector});
}
/** R = heading(Y) × tilt(X) × roll(Z). Local numerical addresses never move. */
export function islandRotation(p:IslandPlacement){const[a,b,c]=p.rotationDegrees.map(x=>x*Math.PI/180),ca=Math.cos(a!),sa=Math.sin(a!),cb=Math.cos(b!),sb=Math.sin(b!),cc=Math.cos(c!),sc=Math.sin(c!);return [[cb*cc+sb*sa*sc,-cb*sc+sb*sa*cc,sb*ca],[ca*sc,ca*cc,-sa],[-sb*cc+cb*sa*sc,sb*sc+cb*sa*cc,cb*ca]] as const;}
export function islandVectorToWorld(p:IslandPlacement,v:PolyhedronVector):PolyhedronVector{const r=islandRotation(p);return r.map(a=>pyramidDot(a,v)) as unknown as PolyhedronVector;}
export function islandVectorToLocal(p:IslandPlacement,v:PolyhedronVector):PolyhedronVector{const r=islandRotation(p);return [0,1,2].map(k=>v.reduce((s,x,i)=>s+x*r[i]![k]!,0)) as unknown as PolyhedronVector;}
export const islandPointToWorld=(p:IslandPlacement,v:PolyhedronVector)=>islandVectorToWorld(p,v).map((x,k)=>x*(p.scale??1)+p.positionMeters[k]!) as unknown as PolyhedronVector;
export const islandPointToLocal=(p:IslandPlacement,v:PolyhedronVector)=>islandVectorToLocal(p,pyramidSub(v,p.positionMeters)).map(x=>x/(p.scale??1)) as unknown as PolyhedronVector;
/** Separating-axis theorem on actual convex material. Projection coordinates
 * are relative to A, avoiding large-world translation cancellation. Contact
 * within the arithmetic guard is unsupported and rejected conservatively. */
export function islandsSeparated(a:FloatingIslandGeometry,pa:IslandPlacement,b:FloatingIslandGeometry,pb:IslandPlacement){
 const delta=pyramidSub(pb.positionMeters,pa.positionMeters),av=a.vertices.map(v=>islandVectorToWorld(pa,v).map(x=>x*(pa.scale??1)) as unknown as PolyhedronVector),bv=b.vertices.map(v=>islandVectorToWorld(pb,v).map((x,k)=>x*(pb.scale??1)+delta[k]!) as unknown as PolyhedronVector),ae=a.physicalEdges.map(([i,j])=>pyramidSub(av[j]!,av[i]!)),be=b.physicalEdges.map(([i,j])=>pyramidSub(bv[j]!,bv[i]!)),axes=[...a.physicalFaces.map(f=>islandVectorToWorld(pa,a.frame(a.faces.find(c=>a.physicalFaceId(c)===f.id)!).normal)),...b.physicalFaces.map(f=>islandVectorToWorld(pb,b.frame(b.faces.find(c=>b.physicalFaceId(c)===f.id)!).normal)),...ae.flatMap(x=>be.map(y=>pyramidCross(x,y)))],guard=32768*Number.EPSILON*Math.max(a.scaleMeters*(pa.scale??1),b.scaleMeters*(pb.scale??1),Math.hypot(...delta));
 return axes.some(axis=>{const length=Math.hypot(...axis);if(length<1e-12)return false;const unit=axis.map(x=>x/length) as unknown as PolyhedronVector,x=av.map(v=>pyramidDot(v,unit)),y=bv.map(v=>pyramidDot(v,unit));return Math.max(...x)+guard<Math.min(...y)||Math.max(...y)+guard<Math.min(...x);});
}
export function validateIslandArrangement(worldId:string,components:readonly IslandDescriptor[]){
 if(typeof worldId!=='string'||!worldId.trim()||worldId.length>128||components.length<1||components.length>MAX_ISLAND_COMPONENTS)throw RangeError('A physical component World supports one through four pieces.');
 const identities=new Set<string>();let count=0;
 const geometries=components.map(c=>{for(const id of[c.id,c.terrainId,c.geometry.identity.surfaceId]){if(typeof id!=='string'||!id.trim()||id.length>128||identities.has(id))throw RangeError('Component and terrain identities must be unique within the parent World.');identities.add(id);}if(c.geometry.identity.worldId!==worldId||!c.name.trim()||c.name.length>80||![128,256].includes(c.subdivisions))throw RangeError('Invalid component name, parent or detail.');count+=(c.geometry.provider==='physical-tetrahedral-fragment'?2:9)*c.subdivisions**2+2;islandPlacement(c.placement);return createFloatingIslandGeometry(c.geometry);});
 const fragmented=components[0]!.geometry.provider==='physical-tetrahedral-fragment';
 if(fragmented){if(identities.has(worldId))throw RangeError('Parent and fragment identities must be distinct.');const first=components[0]!.geometry;if(first.provider!=='physical-tetrahedral-fragment')throw Error('Missing reference solid.');const pieces=new Set<number>();for(const c of components){const g=c.geometry;if(g.provider!=='physical-tetrahedral-fragment'||g.parentWidthMeters!==first.parentWidthMeters||g.fractureSeed!==first.fractureSeed||pieces.has(g.piece))throw RangeError('Fragments must be distinct pieces of the same reference solid.');pieces.add(g.piece);}}else if(components.some(c=>c.geometry.provider!=='physical-floating-island'||c.placement.scale!==undefined))throw RangeError('Floating Islands keep their existing rigid placement contract.');
 const widths=geometries.map((g,i)=>g.scaleMeters*(components[i]!.placement.scale??1)),minimumWidth=Math.min(...widths);if(Math.max(...widths)>minimumWidth*8||components.some(a=>components.some(b=>Math.hypot(...pyramidSub(a.placement.positionMeters,b.placement.positionMeters))>64*minimumWidth)))throw RangeError('Supported arrangements keep island widths within 8 times one another and component centers within 64 times the smallest width.');
 if(count>MAX_ISLAND_SAMPLES)throw RangeError('This arrangement exceeds the measured terrain budget. Use at most two N256 islands or four N128 islands.');
 for(let i=0;i<components.length;i++)for(let j=0;j<i;j++)if(!islandsSeparated(geometries[i]!,components[i]!.placement,geometries[j]!,components[j]!.placement))throw RangeError('Components must have separated physical bodies; overlapping, touching or uncertain configurations are unsupported.');
 return geometries;
}
