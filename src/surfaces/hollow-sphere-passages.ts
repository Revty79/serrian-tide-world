import type {HollowSphereWorld} from '../terrain/hollow-sphere.ts';
import type {SurfacePosition} from './contracts.ts';
import {cross3,dot3,unitDirection,type Vec3} from './cube-sphere.ts';
import {normalizeSphereAnchor} from './hollow-sphere-holes.ts';
import {validatePhysicalPassage,segmentPointDistance,type PhysicalPassage} from './passages.ts';

type Node=PhysicalPassage['nodes'][number];
const eps=128*Number.EPSILON;
const distance=(a:Vec3,b:Vec3)=>Math.hypot(...a.map((v,i)=>v-b[i]!));
const scale=(d:Vec3,r:number)=>d.map(v=>v*r)as unknown as Vec3;
const exact=(v:unknown,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.toSorted().join(','))throw RangeError('Unsupported spherical passage fields.');};
const dense=(v:unknown)=>{if(!Array.isArray(v)||v.length>48||Object.keys(v).length!==v.length||Object.keys(v).some((k,i)=>k!==String(i)))throw RangeError('Spherical passages require bounded dense arrays.');};
export function spherePassageRadiusBounds(world:HollowSphereWorld){return{min:world.dimensions.outerRadiusMeters*1e-5,max:Math.min(world.dimensions.wallThicknessMeters*.2,world.dimensions.innerRadiusMeters*.1)};}
const tolerance=(w:HollowSphereWorld)=>w.dimensions.outerRadiusMeters*1e-12;
/** Whole-ball and whole-capsule certificates. A portal stub is the sole exception
 * to material containment and must follow its declared surface normal exactly. */
export function validateSpherePassage(world:HollowSphereWorld,input:PhysicalPassage):PhysicalPassage{
 exact(input,['kind','version','id','worldId','geometry','nodes','segments','portals']);
 for(const a of[input.nodes,input.segments,input.portals])dense(a);
 input.nodes.forEach(n=>{exact(n,['id','position','radiusMeters']);dense(n.position);});
 input.segments.forEach(s=>exact(s,['id','from','to','radiusMeters']));
 input.portals.forEach(p=>exact(p,['id','nodeId','position','apertureRadiusMeters']));
 const p=validatePhysicalPassage(input),{outerRadiusMeters:outer,innerRadiusMeters:inner,wallThicknessMeters:t}=world.dimensions,{min,max}=spherePassageRadiusBounds(world),tol=tolerance(world);
 if(p.worldId!==world.definition.id||t<outer*1e-4||p.nodes.length+p.segments.length>48||p.portals.length<2)throw RangeError('A spherical network requires this World, at least two openings, a supported shell, and at most 48 cutting primitives.');
 const nodes=new Map(p.nodes.map(n=>[n.id,n])),portals=new Map(p.portals.map(a=>[a.nodeId,a]));
 for(const n of p.nodes){if(n.radiusMeters<min)throw RangeError('Tunnel radius is below supported World precision.');const a=portals.get(n.id),r=Math.hypot(...n.position);
  if(a){const anchor=normalizeSphereAnchor(world,a.position),g=world.select(anchor).geometry,q=g.referencePosition(anchor);if(n.radiusMeters>max||distance(q,n.position)>tol)throw RangeError('Portal ball must match its spherical anchor and supported aperture.');if(p.segments.filter(s=>s.from===n.id||s.to===n.id).length!==1)throw RangeError('A portal must be a leaf; branch from a material junction.');}
  else if(!(r-n.radiusMeters>inner+tol&&r+n.radiusMeters<outer-tol))throw RangeError('Junction and chamber balls must fit strictly inside spherical shell material.');
 }
 for(const s of p.segments){const a=nodes.get(s.from)!,b=nodes.get(s.to)!,pa=portals.get(a.id),pb=portals.get(b.id),r=s.radiusMeters;
  if(pa||pb){if(distance(unitDirection(a.position),unitDirection(b.position))>eps)throw RangeError('An opening stub must follow its actual radial normal.');
   if(pa&&pb){if(world.select(pa.position).role===world.select(pb.position).role)throw RangeError('A direct radial segment needs opposite surfaces.');}
   else {const portal=pa??pb!,other=pa?b:a,role=world.select(portal.position).role;if(role==='exterior'?Math.hypot(...other.position)>=outer:Math.hypot(...other.position)<=inner)throw RangeError('An opening stub must enter shell material.');}
  }else if(!(segmentPointDistance([0,0,0],a.position,b.position)>inner+r+tol&&Math.max(Math.hypot(...a.position),Math.hypot(...b.position))+r<outer-tol))throw RangeError('The complete tunnel capsule must stay inside shell material; this route crosses the cavity or exterior.');
 }
 for(let i=0;i<p.portals.length;i++)for(let j=0;j<i;j++){const a=p.portals[i]!,b=p.portals[j]!;if(world.select(a.position).role===world.select(b.position).role&&distance(nodes.get(a.nodeId)!.position,nodes.get(b.nodeId)!.position)<=a.apertureRadiusMeters+b.apertureRadiusMeters+tol)throw RangeError('Separate openings on the same surface must not overlap.');}
 return p;
}
/** A bounded great-circle polyline in rock, with radial endpoint stubs. This is
 * a proposed physical route, not a geodesic shortcut for terrain or brush math. */
function materialArc(world:HollowSphereWorld,a:Vec3,b:Vec3,r:number){
 const{outerRadiusMeters:outer,innerRadiusMeters:inner}=world.dimensions,mid=(outer+inner)/2;
 if(distance(a,b)<=eps)return[scale(a,mid)];
 const cosine=Math.max(-1,Math.min(1,dot3(a,b))),cross=cross3(a,b),sine=Math.hypot(...cross),angle=Math.atan2(sine,cosine),maxStep=Math.min(Math.PI/8,.8*2*Math.acos((inner+r+tolerance(world))/mid)),count=Math.ceil(angle/maxStep);
 if(!Number.isFinite(count)||count<1||count>21)throw RangeError('The chosen endpoints need too many safely contained segments. Choose closer openings or a thicker shell.');
 const tangent=sine>eps?unitDirection(b.map((v,i)=>v-a[i]!*cosine)as unknown as Vec3):unitDirection(cross3(Math.abs(a[0])<.8?[1,0,0]:[0,1,0],a));
 return Array.from({length:count+1},(_,i)=>i===0?scale(a,mid):i===count?scale(b,mid):scale(unitDirection(a.map((v,k)=>v*Math.cos(angle*i/count)+tangent[k]!*Math.sin(angle*i/count))as unknown as Vec3),mid));
}
export function spherePassageBetween(world:HollowSphereWorld,first:SurfacePosition,last:SurfacePosition,radiusMeters:number,id:string=crypto.randomUUID()):PhysicalPassage{
 const a=normalizeSphereAnchor(world,first),b=normalizeSphereAnchor(world,last),ga=world.select(a).geometry,gb=world.select(b).geometry,r=radiusMeters,{min,max}=spherePassageRadiusBounds(world);
 if(!Number.isFinite(r)||r<min||r>max)throw RangeError(`Tunnel radius must be ${min} to ${max} m.`);
 const points=[ga.referencePosition(a),...materialArc(world,ga.direction(a),gb.direction(b),r),gb.referencePosition(b)],nodes=points.map(position=>({id:crypto.randomUUID(),position,radiusMeters:r}));
 return validateSpherePassage(world,{kind:'physical-passage',version:1,geometry:'sphere-capsule-union',id,worldId:world.definition.id,nodes,segments:nodes.slice(1).map((n,i)=>({id:crypto.randomUUID(),from:nodes[i]!.id,to:n.id,radiusMeters:r})),portals:[a,b].map((position,i)=>({id:crypto.randomUUID(),nodeId:nodes[i===0?0:nodes.length-1]!.id,position,apertureRadiusMeters:r}))});
}
export function resizeSphereChamber(world:HollowSphereWorld,p:PhysicalPassage,nodeId:string,radiusMeters:number){
 if(p.portals.some(a=>a.nodeId===nodeId))throw RangeError('Choose a material junction for a chamber.');if(!p.nodes.some(n=>n.id===nodeId))throw RangeError('Unknown junction.');
 return validateSpherePassage(world,{...p,nodes:p.nodes.map(n=>n.id===nodeId?{...n,radiusMeters}:n)});
}
export function moveSphereJunction(world:HollowSphereWorld,p:PhysicalPassage,nodeId:string,anchor:SurfacePosition,depthMeters:number){
 if(p.portals.some(a=>a.nodeId===nodeId)||!p.nodes.some(n=>n.id===nodeId))throw RangeError('Choose a material junction.');
 const a=normalizeSphereAnchor(world,anchor),d=world.select(a).geometry.direction(a),position=scale(d,world.dimensions.outerRadiusMeters-depthMeters);
 if(!Number.isFinite(depthMeters)||depthMeters<=0||depthMeters>=world.dimensions.wallThicknessMeters)throw RangeError('Depth must lie strictly between the two reference spheres.');
 return validateSpherePassage(world,{...p,nodes:p.nodes.map(n=>n.id===nodeId?{...n,position}:n)});
}
export function branchSpherePassage(world:HollowSphereWorld,p:PhysicalPassage,nodeId:string,lengthMeters:number,radiusMeters:number,direction:'tangent'|'deeper'|'shallower'){
 const n=p.nodes.find(n=>n.id===nodeId);if(!n||p.portals.some(a=>a.nodeId===nodeId))throw RangeError('Branch from a material junction.');
 if(!Number.isFinite(lengthMeters)||lengthMeters<=0||!['tangent','deeper','shallower'].includes(direction))throw RangeError('A branch needs a finite positive length and supported direction.');
 const radial=unitDirection(n.position),d=direction==='tangent'?unitDirection(cross3(Math.abs(radial[0])<.8?[1,0,0]:[0,1,0],radial)):scale(radial,direction==='deeper'?-1:1),node:Node={id:crypto.randomUUID(),radiusMeters,position:n.position.map((v,i)=>v+d[i]!*lengthMeters)as unknown as Vec3};
 return validateSpherePassage(world,{...p,nodes:[...p.nodes,node],segments:[...p.segments,{id:crypto.randomUUID(),from:n.id,to:node.id,radiusMeters}]});
}
/** Connect another independent opening to an existing material junction. */
export function addSphereOpening(world:HollowSphereWorld,p:PhysicalPassage,nodeId:string,anchor:SurfacePosition,radiusMeters:number){
 const target=p.nodes.find(n=>n.id===nodeId);if(!target||p.portals.some(a=>a.nodeId===nodeId))throw RangeError('Choose a material junction for the additional opening.');
 const a=normalizeSphereAnchor(world,anchor),g=world.select(a).geometry,points=[g.referencePosition(a),...materialArc(world,g.direction(a),unitDirection(target.position),radiusMeters)];
 if(distance(points.at(-1)!,target.position)<=tolerance(world))points.pop();
 const nodes=points.map(position=>({id:crypto.randomUUID(),position,radiusMeters})),chain=[...nodes,target];
 return validateSpherePassage(world,{...p,nodes:[...p.nodes,...nodes],segments:[...p.segments,...chain.slice(1).map((n,i)=>({id:crypto.randomUUID(),from:chain[i]!.id,to:n.id,radiusMeters}))],portals:[...p.portals,{id:crypto.randomUUID(),nodeId:nodes[0]!.id,position:a,apertureRadiusMeters:radiusMeters}]});
}
/** Relocation preserves the existing portal, endpoint node and first segment
 * identities. Existing material branches remain connected and reviewable. */
export function relocateSphereOpening(world:HollowSphereWorld,p:PhysicalPassage,portalId:string,anchor:SurfacePosition){
 const portal=p.portals.find(a=>a.id===portalId);if(!portal)throw RangeError('Unknown opening.');const old=p.nodes.find(n=>n.id===portal.nodeId)!,stub=p.segments.find(s=>s.from===old.id||s.to===old.id)!;
 const target=stub.from===old.id?stub.to:stub.from;if(p.portals.some(a=>a.nodeId===target))throw RangeError('Direct two-node passages cannot relocate one end independently; recreate a routed network.');
 const base={...p,nodes:p.nodes.filter(n=>n.id!==old.id),segments:p.segments.filter(s=>s.id!==stub.id),portals:p.portals.filter(a=>a.id!==portal.id)},next=addSphereOpening(world,base,target,anchor,old.radiusMeters),newPortal=next.portals.at(-1)!,newNode=newPortal.nodeId,newSegment=next.segments.find(s=>s.from===newNode||s.to===newNode)!.id;
 return validateSpherePassage(world,{...next,nodes:next.nodes.map(n=>n.id===newNode?{...n,id:old.id}:n),segments:next.segments.map(s=>({...s,id:s.id===newSegment?stub.id:s.id,from:s.from===newNode?old.id:s.from,to:s.to===newNode?old.id:s.to})),portals:next.portals.map(a=>a.id===newPortal.id?{...a,id:portal.id,nodeId:old.id}:a)});
}
