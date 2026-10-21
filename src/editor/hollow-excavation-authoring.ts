import type {HollowCubeWorld} from '../terrain/hollow-cube.ts';
import {SOLID_CUBE_FRAMES,cubeDot,type CubeVector} from '../surfaces/solid-cube.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {PhysicalPassage} from '../surfaces/passages.ts';
const id=()=>crypto.randomUUID();
export function tunnelAt(world:HollowCubeWorld,position:SurfacePosition,radiusMeters:number):PhysicalPassage {
 const surface=world.select(position),ref=surface.geometry.toReferenceChart(position),face=ref.patchId,frame=SOLID_CUBE_FRAMES[face],half=world.dimensions.outerSideLengthMeters/2,thickness=world.dimensions.nominalWallThicknessMeters;
 const point=(depth:number):CubeVector=>frame.normal.map((v,i)=>v*(half-depth)+frame.u[i]!*ref.u+frame.v[i]!*ref.v) as unknown as CubeVector;
 const nodes=[0,.25,.5,.75,1].map(d=>({id:id(),position:point(d*thickness),radiusMeters}));
 const portals=(['exterior','interior'] as const).map((role,i)=>{const geometry=world.surfaces[role].geometry,node=nodes[i?4:0]!;return{id:id(),nodeId:node.id,position:geometry.fromReferenceChart({...geometry.identity,patchId:face,u:ref.u,v:ref.v}),apertureRadiusMeters:radiusMeters};});
 return{kind:'physical-passage',version:1,id:id(),worldId:world.definition.id,geometry:'sphere-capsule-union',nodes,segments:nodes.slice(1).map((n,i)=>({id:id(),from:nodes[i]!.id,to:n.id,radiusMeters})),portals};
}
export function branchFrom(world:HollowCubeWorld,p:PhysicalPassage,nodeId:string,direction:'left'|'right'|'up'|'down'|'deeper'|'shallower',lengthMeters:number,radiusMeters:number):PhysicalPassage{
 if(p.worldId!==world.definition.id)throw Error('Tunnel belongs to another World.');
 const source=p.nodes.find(n=>n.id===nodeId);if(!source)throw Error('Select a tunnel junction.');if(p.portals.some(x=>x.nodeId===nodeId))throw Error('Start branches at an interior junction, away from the opening.');if(!Number.isFinite(lengthMeters)||lengthMeters<=0)throw Error('Enter a positive branch length.');
 const f=SOLID_CUBE_FRAMES[p.portals[0]!.position.patchId as keyof typeof SOLID_CUBE_FRAMES],axis=direction==='left'||direction==='right'?f.u:direction==='up'||direction==='down'?f.v:f.normal,sign=['left','down','deeper'].includes(direction)?-1:1;
 const node={id:id(),position:source.position.map((v,i)=>v+axis[i]!*lengthMeters*sign) as unknown as CubeVector,radiusMeters};return{...p,nodes:[...p.nodes,node],segments:[...p.segments,{id:id(),from:nodeId,to:node.id,radiusMeters:Math.min(source.radiusMeters,radiusMeters)}]};
}
export function nodeWallCoordinates(world:HollowCubeWorld,p:PhysicalPassage,nodeId:string){const n=p.nodes.find(n=>n.id===nodeId)!;const f=SOLID_CUBE_FRAMES[(p.portals.find(a=>a.nodeId===nodeId)??p.portals[0])!.position.patchId as keyof typeof SOLID_CUBE_FRAMES];return{u:cubeDot(n.position,f.u),v:cubeDot(n.position,f.v),depth:world.dimensions.outerSideLengthMeters/2-cubeDot(n.position,f.normal)};}
export function editPassageNode(world:HollowCubeWorld,p:PhysicalPassage,nodeId:string,coordinates:{u:number;v:number;depth:number;radius:number}):PhysicalPassage{
 if(!Object.values(coordinates).every(Number.isFinite)||coordinates.radius<=0)throw Error('Enter finite wall coordinates and a positive radius.');
 const portal=p.portals.find(x=>x.nodeId===nodeId),face=(portal??p.portals[0])!.position.patchId as keyof typeof SOLID_CUBE_FRAMES,f=SOLID_CUBE_FRAMES[face],source=p.nodes.find(n=>n.id===nodeId)!,position=f.normal.map((v,i)=>v*(world.dimensions.outerSideLengthMeters/2-coordinates.depth)+f.u[i]!*coordinates.u+f.v[i]!*coordinates.v) as unknown as CubeVector;
 const moves=new Map<string,CubeVector>([[nodeId,position]]);
 if(portal){const role=world.select(portal.position).role,expected=role==='exterior'?0:world.dimensions.nominalWallThicknessMeters;if(coordinates.depth!==expected)throw Error('An opening stays on its surface. Change its horizontal/vertical position instead.');const delta=position.map((v,i)=>v-source.position[i]!);for(const s of p.segments){const next=s.from===nodeId?s.to:s.to===nodeId?s.from:undefined;if(next){if(p.portals.some(x=>x.nodeId===next))throw Error('Move a direct through-wall opening by recreating its tunnel.');const n=p.nodes.find(n=>n.id===next)!;moves.set(next,n.position.map((v,i)=>v+delta[i]!) as unknown as CubeVector);}}}
 const nodes=p.nodes.map(n=>({...n,position:moves.get(n.id)??n.position,radiusMeters:n.id===nodeId?coordinates.radius:n.radiusMeters}));
 // Narrowing a node explicitly narrows its incident tubes; growing chambers
 // leaves the established tube radius alone. Everything is one exact journal entry.
 return{...p,nodes,segments:p.segments.map(s=>({...s,radiusMeters:Math.min(s.radiusMeters,nodes.find(n=>n.id===s.from)!.radiusMeters,nodes.find(n=>n.id===s.to)!.radiusMeters)})),portals:p.portals.map(a=>a.nodeId===nodeId?{...a,position:world.select(a.position).geometry.fromReferenceChart({...world.select(a.position).geometry.toReferenceChart(a.position),u:coordinates.u,v:coordinates.v}),apertureRadiusMeters:coordinates.radius}:a)};
}
export function addPassageOpening(world:HollowCubeWorld,p:PhysicalPassage,nodeId:string,position:SurfacePosition,radiusMeters:number):PhysicalPassage{
 const source=p.nodes.find(n=>n.id===nodeId);if(!source||p.portals.some(x=>x.nodeId===nodeId))throw Error('Select an interior junction to connect to the new opening.');const surface=world.select(position),anchor=surface.geometry.normalize(position),q=surface.geometry.referencePosition(anchor),normal=surface.geometry.normal(anchor),neck={id:id(),position:q.map((v,i)=>v-normal[i]!*world.dimensions.nominalWallThicknessMeters*.25) as unknown as CubeVector,radiusMeters},node={id:id(),position:q,radiusMeters};
 return{...p,nodes:[...p.nodes,neck,node],segments:[...p.segments,{id:id(),from:source.id,to:neck.id,radiusMeters:Math.min(radiusMeters,source.radiusMeters)},{id:id(),from:neck.id,to:node.id,radiusMeters}],portals:[...p.portals,{id:id(),nodeId:node.id,position:anchor,apertureRadiusMeters:radiusMeters}]};
}
