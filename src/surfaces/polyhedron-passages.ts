import type {SurfacePosition} from './contracts.ts';
import type {PolyhedronVector} from './polyhedron-contract.ts';
import {validatePhysicalPassage,validateLinkedEntrance,type PhysicalPassage,type LinkedEntrance,type PassageLocation} from './passages.ts';
import {pyramidDot as dot,pyramidSub as sub,pyramidUnit as unit} from './pyramid.ts';
import {polyhedronMaterialCapsuleFits,polyhedronOuterBallFits,polyhedronRayInterval,polyhedronCavityBallFits,polyhedronEntranceNormal,polyhedronCapsuleAvoidsCavity,type PolyhedronMaterial} from './polyhedron-material.ts';
import {normalizePolyhedronAnchor,polyhedronHoleBounds} from './polyhedron-holes.ts';
type Node=PhysicalPassage['nodes'][number];
const exact=(v:unknown,keys:readonly string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.toSorted().join(','))throw RangeError('Unsupported polyhedral passage fields.');};
const dense=(v:unknown,max=48)=>{if(!Array.isArray(v)||v.length>max||Object.keys(v).length!==v.length||Object.keys(v).some((k,i)=>k!==String(i)))throw RangeError('Polyhedral passages require bounded dense arrays.');};
const distance=(a:PolyhedronVector,b:PolyhedronVector)=>Math.hypot(...sub(a,b));
export const polyhedronPassageBounds=polyhedronHoleBounds;
export function validatePolyhedronPassage(body:PolyhedronMaterial,input:PhysicalPassage):PhysicalPassage{
 exact(input,['kind','version','id','worldId','geometry','nodes','segments','portals']);for(const list of[input.nodes,input.segments,input.portals])dense(list);
 input.nodes.forEach(n=>{exact(n,['id','position','radiusMeters']);dense(n.position,3);});input.segments.forEach(s=>exact(s,['id','from','to','radiusMeters']));input.portals.forEach(p=>exact(p,['id','nodeId','position','apertureRadiusMeters']));
 const p=validatePhysicalPassage(input),bounds=polyhedronPassageBounds(body),nodes=new Map(p.nodes.map(n=>[n.id,n])),portals=new Map(p.portals.map(a=>[a.nodeId,a]));
 if(p.worldId!==body.worldId||p.portals.length<2||p.nodes.length+p.segments.length>48||!bounds.supported)throw RangeError('A physical network needs this World, two openings, supported material and at most 48 cutting primitives.');
 for(const n of p.nodes){if(n.radiusMeters<bounds.min)throw RangeError('Tunnel radius is below supported World precision.');const portal=portals.get(n.id);
  if(portal){const anchor=normalizePolyhedronAnchor(body,portal.position),s=body.select(anchor),q=s.geometry.referencePosition(anchor);if(n.radiusMeters>bounds.max||!q.every((x,k)=>Object.is(x,n.position[k]))||p.segments.filter(s=>s.from===n.id||s.to===n.id).length!==1)throw RangeError('A portal ball must equal its actual surface anchor, have a supported radius and be a graph leaf.');
   if(s.role==='interior'){const normal=polyhedronEntranceNormal(body,anchor),approach=q.map((x,k)=>x+2*n.radiusMeters*normal[k]!) as unknown as PolyhedronVector;if(!polyhedronCavityBallFits(body,approach,body.guardMeters*8))throw RangeError('This cavity opening needs a free physical approach. Move it away from the crease or reduce its width.');}
  }
  else if(!polyhedronMaterialCapsuleFits(body,n.position,n.position,n.radiusMeters))throw RangeError('The complete junction/chamber ball must fit the actual material.');
 }
 for(const segment of p.segments){if(segment.radiusMeters<bounds.min)throw RangeError('Tunnel segment radius is below supported World precision.');const a=nodes.get(segment.from)!,b=nodes.get(segment.to)!,pa=portals.get(a.id),pb=portals.get(b.id);
  if(pa||pb){if(pa&&pb)throw RangeError('Use a real material junction between tunnel openings.');const portal=pa??pb!,start=pa?a:b,end=pa?b:a,s=body.select(portal.position),normal=polyhedronEntranceNormal(body,portal.position),delta=sub(end.position,start.position),depth=-dot(delta,normal),residual=delta.map((x,k)=>x+depth*normal[k]!) as unknown as PolyhedronVector;
   if(depth<=2*segment.radiusMeters+body.guardMeters||Math.hypot(...residual)>body.guardMeters*8)throw RangeError('An opening stub must follow its validated reference entrance axis into material with a complete internal endpoint ball.');
   if(s.role==='interior'&&!polyhedronOuterBallFits(body,start.position,start.radiusMeters))throw RangeError('A cavity entrance must clear the complete exterior boundary.');
   if(s.role==='exterior'&&!polyhedronCapsuleAvoidsCavity(body,start.position,end.position,segment.radiusMeters))throw RangeError('An exterior opening stub cannot cross or create an unselected cavity opening.');
  }else if(!polyhedronMaterialCapsuleFits(body,a.position,b.position,segment.radiusMeters))throw RangeError('A complete tunnel capsule crosses a cavity or exterior boundary. Choose a contained route.');
 }
 for(let i=0;i<p.portals.length;i++)for(let j=0;j<i;j++){const a=p.portals[i]!,b=p.portals[j]!;if(a.position.surfaceId===b.position.surfaceId&&distance(nodes.get(a.nodeId)!.position,nodes.get(b.nodeId)!.position)<=a.apertureRadiusMeters+b.apertureRadiusMeters+body.guardMeters*8)throw RangeError('Independent mouth apertures on one boundary must not overlap.');}
 return p;
}
function stage(body:PolyhedronMaterial,anchor:SurfacePosition,r:number){
 const p=normalizePolyhedronAnchor(body,anchor),s=body.select(p),q=s.geometry.referencePosition(p),normal=polyhedronEntranceNormal(body,p),into=normal.map(x=>-x) as unknown as PolyhedronVector;
 // Eroded/expanded plane clips are bounded candidate hints. Every candidate
 // still needs the complete interval material proof below. A global-clearance
 // fraction is not a valid entrance-depth limit at a genuine acute apex.
 const eroded=body.outerPlanes.map(plane=>({...plane,offset:plane.offset-r*plane.bounds.normUpper-body.guardMeters*16})),span=polyhedronRayInterval(eroded,q,into);if(!span)throw RangeError('This reference entrance axis has insufficient material depth.');
 let minimum=Math.max(3*r+body.guardMeters*16,span.enter+body.guardMeters*32),maximum=span.exit-body.guardMeters*32;
 if(body.interior){const expanded=body.innerPlanes.map(plane=>({...plane,offset:plane.offset+r*plane.bounds.normUpper+body.guardMeters*16})),cavity=polyhedronRayInterval(expanded,q,into);if(cavity){if(s.role==='exterior'&&cavity.enter>0)maximum=Math.min(maximum,cavity.enter-body.guardMeters*32);else if(s.role==='interior')minimum=Math.max(minimum,cavity.exit+body.guardMeters*32);}}
 if(maximum>=minimum)for(let i=0;i<=32;i++){const depth=minimum+(maximum-minimum)*i/32,point=q.map((x,k)=>x+depth*into[k]!) as unknown as PolyhedronVector;if(polyhedronMaterialCapsuleFits(body,point,point,r)&&(s.role==='interior'||polyhedronCapsuleAvoidsCavity(body,q,point,r)))return{anchor:p,point:q,junction:point};}
 throw RangeError('A complete material junction cannot fit this reference entrance axis. Reduce the width or move away from the crease.');
}
function containedRoute(body:PolyhedronMaterial,a:PolyhedronVector,b:PolyhedronVector,r:number):PolyhedronVector[]{
 if(distance(a,b)<=body.guardMeters*8)return[a];if(polyhedronMaterialCapsuleFits(body,a,b,r))return[a,b];
 if(!body.interior)throw RangeError('The selected straight material route cannot be certified.');
 const outer=body.exterior,inner=body.interior;if(outer.vertices.length!==inner.vertices.length||outer.faces.join(',')!==inner.faces.join(','))throw RangeError('This material needs a geometry-specific bounded routing adapter.');
 const pairs:[PolyhedronVector,PolyhedronVector][]=[];
 const center=(ids:readonly number[],vertices:readonly PolyhedronVector[])=>[0,1,2].map(k=>ids.reduce((sum,id)=>sum+vertices[id]![k]!,0)/ids.length) as unknown as PolyhedronVector;
 for(let i=0;i<outer.vertices.length;i++)pairs.push([inner.vertices[i]!,outer.vertices[i]!]);
 for(const edge of outer.edges)pairs.push([center(edge,inner.vertices),center(edge,outer.vertices)]);
 for(const face of outer.faces)pairs.push([center(inner.vertexIds(face),inner.vertices),center(outer.vertexIds(face),outer.vertices)]);
 const points:PolyhedronVector[]=[a,b],fractions=pairs.length*3+2<=96?[.25,.5,.75]:[.5];
 for(const[lo,hi]of pairs)for(const t of fractions){const p=lo.map((x,k)=>x+t*(hi[k]!-x)) as unknown as PolyhedronVector;if(points.length>=96)throw RangeError('Physical tunnel candidate budget exhausted.');if(points.some(q=>distance(p,q)<body.guardMeters*8)||!polyhedronMaterialCapsuleFits(body,p,p,r))continue;points.push(p);}
 // Bounded physical waypoint graph. Every accepted edge is a certified complete
 // material capsule. This is tunnel layout, not a surface-paint distance or an
 // abstract map link. No planning surface identity or heightmap is created.
 const lengths=points.map(()=>Infinity),previous=points.map(()=>-1),used=new Set<number>(),checked=new Map<string,boolean>();let tests=0;lengths[0]=0;
 for(let step=0;step<points.length;step++){
  let current=-1;for(let i=0;i<points.length;i++)if(!used.has(i)&&(current<0||lengths[i]!<lengths[current]!))current=i;
  if(current<0||!Number.isFinite(lengths[current]))break;if(current===1){const route:PolyhedronVector[]=[];for(let i=1;i>=0;i=previous[i]!){route.push(points[i]!);if(i===0)break;}return route.reverse();}used.add(current);
  for(let next=0;next<points.length;next++){if(used.has(next))continue;const cost=lengths[current]!+distance(points[current]!,points[next]!);if(cost>=lengths[next]!)continue;const key=[current,next].sort((a,b)=>a-b).join(':');let valid=checked.get(key);if(valid===undefined){if(++tests>4096)throw RangeError('Physical tunnel routing work budget exhausted.');valid=polyhedronMaterialCapsuleFits(body,points[current]!,points[next]!,r);checked.set(key,valid);}if(valid){lengths[next]=cost;previous[next]=current;}}
 }
 throw RangeError('No bounded contained material route was found at this width. Reduce the width or choose closer entrances.');
}
const chain=(nodes:readonly Node[],r:number)=>nodes.slice(1).map((n,i)=>({id:crypto.randomUUID(),from:nodes[i]!.id,to:n.id,radiusMeters:r}));
export function polyhedronPassageBetween(body:PolyhedronMaterial,first:SurfacePosition,last:SurfacePosition,radiusMeters:number):PhysicalPassage{
 const bounds=polyhedronPassageBounds(body);if(!bounds.supported||radiusMeters<bounds.min||radiusMeters>bounds.max||!Number.isFinite(radiusMeters))throw RangeError('Choose a supported physical tunnel radius.');
 const a=stage(body,first,radiusMeters),b=stage(body,last,radiusMeters),route=containedRoute(body,a.junction,b.junction,radiusMeters),points=[a.point,...route,b.point],nodes=points.map(position=>({id:crypto.randomUUID(),position,radiusMeters}));
 return validatePolyhedronPassage(body,{kind:'physical-passage',version:1,id:crypto.randomUUID(),worldId:body.worldId,geometry:'sphere-capsule-union',nodes,segments:chain(nodes,radiusMeters),portals:[{id:crypto.randomUUID(),nodeId:nodes[0]!.id,position:a.anchor,apertureRadiusMeters:radiusMeters},{id:crypto.randomUUID(),nodeId:nodes.at(-1)!.id,position:b.anchor,apertureRadiusMeters:radiusMeters}]});
}
export type PolyhedronBranchDirection='tangent'|'deeper'|'shallower'|'axial-positive'|'axial-negative';
export function branchPolyhedronPassage(body:PolyhedronMaterial,p:PhysicalPassage,nodeId:string,lengthMeters:number,radiusMeters:number,direction:PolyhedronBranchDirection){
 const n=p.nodes.find(n=>n.id===nodeId);if(!n||p.portals.some(a=>a.nodeId===nodeId)||!Number.isFinite(lengthMeters)||lengthMeters<=0)throw RangeError('Choose a material junction and positive branch length.');
 const reference=body.innerPlanes.length?body.innerPlanes:body.outerPlanes,nearest=reference.reduce((a,b)=>Math.abs(dot(a.normal,n.position)-a.offset)<Math.abs(dot(b.normal,n.position)-b.offset)?a:b),outward=nearest.normal,tangent=unit(Math.abs(outward[2])>.9?[1,0,0]:[-outward[1],outward[0],0]);
 const axis:PolyhedronVector=direction==='tangent'?tangent:direction==='deeper'?outward.map(x=>-x) as unknown as PolyhedronVector:direction==='shallower'?outward:direction==='axial-positive'?[0,0,1]:direction==='axial-negative'?[0,0,-1]:(()=>{throw RangeError('Unknown material branch direction.');})();
 const next={id:crypto.randomUUID(),radiusMeters,position:n.position.map((x,k)=>x+lengthMeters*axis[k]!) as unknown as PolyhedronVector};return validatePolyhedronPassage(body,{...p,nodes:[...p.nodes,next],segments:[...p.segments,{id:crypto.randomUUID(),from:n.id,to:next.id,radiusMeters}]});
}
export function resizePolyhedronChamber(body:PolyhedronMaterial,p:PhysicalPassage,id:string,radiusMeters:number){if(!p.nodes.some(n=>n.id===id)||p.portals.some(a=>a.nodeId===id))throw RangeError('Choose a material chamber/junction.');return validatePolyhedronPassage(body,{...p,nodes:p.nodes.map(n=>n.id===id?{...n,radiusMeters}:n)});}
export function movePolyhedronJunction(body:PolyhedronMaterial,p:PhysicalPassage,id:string,position:PolyhedronVector){if(!p.nodes.some(n=>n.id===id)||p.portals.some(a=>a.nodeId===id))throw RangeError('Choose a material chamber/junction.');return validatePolyhedronPassage(body,{...p,nodes:p.nodes.map(n=>n.id===id?{...n,position}:n)});}
export function addPolyhedronOpening(body:PolyhedronMaterial,p:PhysicalPassage,id:string,anchor:SurfacePosition,radiusMeters:number){
 const target=p.nodes.find(n=>n.id===id);if(!target||p.portals.some(a=>a.nodeId===id))throw RangeError('Choose a material junction for the new opening.');const s=stage(body,anchor,radiusMeters),route=containedRoute(body,s.junction,target.position,radiusMeters),points=[s.point,...route];points.pop();const nodes=points.map(position=>({id:crypto.randomUUID(),position,radiusMeters})),connected=[...nodes,target];return validatePolyhedronPassage(body,{...p,nodes:[...p.nodes,...nodes],segments:[...p.segments,...chain(connected,radiusMeters)],portals:[...p.portals,{id:crypto.randomUUID(),nodeId:nodes[0]!.id,position:s.anchor,apertureRadiusMeters:radiusMeters}]});
}
export function relocatePolyhedronOpening(body:PolyhedronMaterial,p:PhysicalPassage,id:string,anchor:SurfacePosition){
 const portal=p.portals.find(a=>a.id===id);if(!portal)throw RangeError('Unknown tunnel opening.');const old=p.nodes.find(n=>n.id===portal.nodeId)!,stub=p.segments.find(s=>s.from===old.id||s.to===old.id)!,target=stub.from===old.id?stub.to:stub.from,base={...p,nodes:p.nodes.filter(n=>n.id!==old.id),segments:p.segments.filter(s=>s.id!==stub.id),portals:p.portals.filter(a=>a.id!==portal.id)},next=addPolyhedronOpening(body,base,target,anchor,old.radiusMeters),fresh=next.portals.at(-1)!,freshSegment=next.segments.find(s=>s.from===fresh.nodeId||s.to===fresh.nodeId)!.id;
 return validatePolyhedronPassage(body,{...next,nodes:next.nodes.map(n=>n.id===fresh.nodeId?{...n,id:old.id}:n),segments:next.segments.map(s=>({...s,id:s.id===freshSegment?stub.id:s.id,from:s.from===fresh.nodeId?old.id:s.from,to:s.to===fresh.nodeId?old.id:s.to})),portals:next.portals.map(a=>a.id===fresh.id?{...a,id:portal.id,nodeId:old.id}:a)});
}
export function validatePolyhedronLink(body:PolyhedronMaterial,input:LinkedEntrance){
 exact(input,['kind','version','id','worldId','anchors']);if(input.worldId!==body.worldId)throw RangeError('A map link needs its actual parent World.');dense(input.anchors,2);input.anchors.forEach(a=>{exact(a,['id','targetAnchorId','location']);exact(a.location,a.location.kind==='surface'?['kind','position']:['kind','worldId','mapId','locationId']);if(a.location.kind==='surface')exact(a.location.position,['worldId','surfaceId','patchId','u','v']);});
 const link=validateLinkedEntrance(input,p=>p.worldId===body.worldId?normalizePolyhedronAnchor(body,p):p),local=link.anchors.flatMap(a=>a.location.kind==='surface'&&a.location.position.worldId===body.worldId?[a.location.position]:[]);
 if(!local.length)throw RangeError('A physical-World map link needs an actual local surface anchor.');if(local.length===2&&local[0]!.surfaceId===local[1]!.surfaceId&&distance(body.select(local[0]!).geometry.referencePosition(local[0]!),body.select(local[1]!).geometry.referencePosition(local[1]!))<=body.guardMeters*8)throw RangeError('Same-surface map-link endpoints must identify different physical locations.');return link;
}
export function polyhedronMapLink(body:PolyhedronMaterial,from:SurfacePosition,to:PassageLocation):LinkedEntrance{const a=crypto.randomUUID(),b=crypto.randomUUID();return validatePolyhedronLink(body,{kind:'linked-entrance',version:1,id:crypto.randomUUID(),worldId:body.worldId,anchors:[{id:a,targetAnchorId:b,location:{kind:'surface',position:normalizePolyhedronAnchor(body,from)}},{id:b,targetAnchorId:a,location:to}]});}
export function relocatePolyhedronLink(body:PolyhedronMaterial,l:LinkedEntrance,id:string,to:PassageLocation){if(!l.anchors.some(a=>a.id===id))throw RangeError('Unknown reciprocal link anchor.');return validatePolyhedronLink(body,{...l,anchors:l.anchors.map(a=>a.id===id?{...a,location:to}:a)});}
