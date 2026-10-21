import {assertCubeIdentity,type CubeVector} from './solid-cube.ts';
import type {SurfacePosition} from './contracts.ts';

/** Links and physical volumes are deliberately different, versioned contracts.
 * They are not face seams, distance shortcuts or elevation buffers. */
export type PassageLocation={readonly kind:'surface';readonly position:SurfacePosition}|{readonly kind:'map-location';readonly worldId:string;readonly mapId:string;readonly locationId:string};
export interface LinkedEntrance {readonly kind:'linked-entrance';readonly version:1;readonly id:string;readonly worldId:string;readonly anchors:readonly {readonly id:string;readonly targetAnchorId:string;readonly location:PassageLocation}[]}
export interface PhysicalPassage {
 readonly kind:'physical-passage';readonly version:1;readonly id:string;readonly worldId:string;readonly geometry:'sphere-capsule-union';
 /** Positions are parent-World reference XYZ coordinates in meters. */
 readonly nodes:readonly {readonly id:string;readonly position:CubeVector;readonly radiusMeters:number}[];
 readonly segments:readonly {readonly id:string;readonly from:string;readonly to:string;readonly radiusMeters:number}[];
 readonly portals:readonly {readonly id:string;readonly nodeId:string;readonly position:SurfacePosition;readonly apertureRadiusMeters:number}[];
}
export const PHYSICAL_PASSAGE_LIMITS=Object.freeze({nodes:256,segments:512,portals:64});
export function passageId(id:string){if(typeof id!=='string'||!id.trim()||id.length>128)throw RangeError('Passage identities must contain 1-128 characters.');return id;}
const position=(p:SurfacePosition)=>{if(!p)throw RangeError('Surface anchor is required.');assertCubeIdentity(p);passageId(p.patchId);if(![p.u,p.v].every(Number.isFinite))throw RangeError('Finite anchor coordinates required.');return Object.freeze({...p});};
export function validateLinkedEntrance(input:LinkedEntrance,normalize:(p:SurfacePosition)=>SurfacePosition=p=>position(p)){
 if(!input||input.kind!=='linked-entrance'||input.version!==1||!Array.isArray(input.anchors)||input.anchors.length!==2)throw RangeError('A linked entrance needs exactly two reciprocal anchors.');
 const id=passageId(input.id),worldId=passageId(input.worldId);
 const anchors=input.anchors.map(a=>{
  passageId(a.id);passageId(a.targetAnchorId);const l=a.location;if(!l)throw RangeError('Linked location required.');
  const location:PassageLocation=l.kind==='surface'?Object.freeze({kind:'surface',position:position(normalize(position(l.position)))}):l.kind==='map-location'?Object.freeze({kind:'map-location',worldId:passageId(l.worldId),mapId:passageId(l.mapId),locationId:passageId(l.locationId)}):(()=>{throw RangeError('Unknown linked location type.');})();
  return Object.freeze({id:a.id,targetAnchorId:a.targetAnchorId,location});
 });
 if(anchors[0]!.id===anchors[1]!.id||anchors[0]!.targetAnchorId!==anchors[1]!.id||anchors[1]!.targetAnchorId!==anchors[0]!.id)throw RangeError('Linked anchors must have distinct identities and reciprocal targets.');
 if(!anchors.some(a=>a.location.kind==='surface'?a.location.position.worldId===worldId:a.location.worldId===worldId))throw RangeError('A linked entrance must belong to its parent World.');
 return Object.freeze({kind:'linked-entrance' as const,version:1 as const,id,worldId,anchors:Object.freeze(anchors)});
}
const radius=(r:number)=>{if(!Number.isFinite(r)||r<=0)throw RangeError('Positive finite physical passage radius required.');return r;};
export function segmentPointDistance(point:CubeVector,a:CubeVector,b:CubeVector){
 const d=b.map((v,i)=>v-a[i]!),lengthSquared=d.reduce((s,v)=>s+v*v,0),t=lengthSquared?Math.max(0,Math.min(1,d.reduce((s,v,i)=>s+v*(point[i]!-a[i]!),0)/lengthSquared)):0;
 return Math.hypot(...a.map((v,i)=>point[i]!-v-t*d[i]!));
}
export function validatePhysicalPassage(input:PhysicalPassage):PhysicalPassage{
 if(!input||input.kind!=='physical-passage'||input.version!==1||input.geometry!=='sphere-capsule-union')throw RangeError('Version 1 sphere/capsule physical passage required.');
 const id=passageId(input.id),worldId=passageId(input.worldId);
 if(!Array.isArray(input.nodes)||!input.nodes.length||input.nodes.length>PHYSICAL_PASSAGE_LIMITS.nodes||!Array.isArray(input.segments)||input.segments.length>PHYSICAL_PASSAGE_LIMITS.segments||!Array.isArray(input.portals)||input.portals.length>PHYSICAL_PASSAGE_LIMITS.portals)throw RangeError('Physical passage graph limits exceeded.');
 const ids=new Set<string>();const unique=(s:string)=>{passageId(s);if(ids.has(s))throw RangeError('Duplicate physical passage component identity.');ids.add(s);return s;};
 const nodes=input.nodes.map(n=>{unique(n.id);if(!Array.isArray(n.position)||n.position.length!==3||!n.position.every(Number.isFinite))throw RangeError('Finite three-dimensional node position required.');const r=radius(n.radiusMeters);if(!n.position.every((v:number)=>Number.isFinite(Math.abs(v)+r)))throw RangeError('Physical passage bounds overflow.');return Object.freeze({id:n.id,position:Object.freeze([...n.position]) as unknown as CubeVector,radiusMeters:r});});
 const byId=new Map(nodes.map(n=>[n.id,n])),neighbors=new Map(nodes.map(n=>[n.id,new Set<string>()]));
 const segments=input.segments.map(s=>{unique(s.id);const a=byId.get(s.from),b=byId.get(s.to);if(!a||!b||s.from===s.to)throw RangeError('Segment endpoints must be distinct existing nodes.');const length=Math.hypot(...a.position.map((v,i)=>v-b.position[i]!));if(!Number.isFinite(length)||!Number.isFinite(length*length)||length<=0)throw RangeError('Physical segment length must be positive and representable.');radius(s.radiusMeters);if(s.radiusMeters>Math.min(a.radiusMeters,b.radiusMeters))throw RangeError('Segment radii must fit their junction/chamber balls.');if(neighbors.get(s.from)!.has(s.to))throw RangeError('Duplicate physical segment.');neighbors.get(s.from)!.add(s.to);neighbors.get(s.to)!.add(s.from);return Object.freeze({...s});});
 const reached=new Set([nodes[0]!.id]),queue=[nodes[0]!.id];for(let i=0;i<queue.length;i++)for(const next of neighbors.get(queue[i]!)!)if(!reached.has(next)){reached.add(next);queue.push(next);}if(reached.size!==nodes.length)throw RangeError('A physical passage must be one connected volume.');
 const portalNodes=new Set<string>();const portals=input.portals.map(p=>{unique(p.id);const n=byId.get(p.nodeId);if(!n||portalNodes.has(p.nodeId))throw RangeError('Portals require distinct existing nodes.');portalNodes.add(p.nodeId);if(radius(p.apertureRadiusMeters)!==n.radiusMeters)throw RangeError('Portal aperture must match its endpoint ball radius.');const q=position(p.position);if(q.worldId!==worldId)throw RangeError('Physical portal belongs to another World.');return Object.freeze({...p,position:q});});
 return Object.freeze({kind:'physical-passage',version:1,id,worldId,geometry:'sphere-capsule-union',nodes:Object.freeze(nodes),segments:Object.freeze(segments),portals:Object.freeze(portals)});
}
export function physicalPassageContains(input:PhysicalPassage,point:CubeVector){
 if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))throw RangeError('Finite volume query required.');
 const p=validatePhysicalPassage(input),nodes=new Map(p.nodes.map(n=>[n.id,n]));
 return p.nodes.some(n=>Math.hypot(...point.map((v,i)=>v-n.position[i]!))<=n.radiusMeters)||p.segments.some(s=>segmentPointDistance(point,nodes.get(s.from)!.position,nodes.get(s.to)!.position)<=s.radiusMeters);
}
/** Reversible centerline witness inside the actual union, not teleport navigation. */
export function physicalPassageRoute(input:PhysicalPassage,fromPortal:string,toPortal:string){
 const p=validatePhysicalPassage(input),from=p.portals.find(x=>x.id===fromPortal),to=p.portals.find(x=>x.id===toPortal);if(!from||!to)throw RangeError('Unknown physical portal.');
 const previous=new Map<string,string|undefined>([[from.nodeId,undefined]]),queue=[from.nodeId];
 for(let i=0;i<queue.length&&!previous.has(to.nodeId);i++)for(const s of p.segments){const next=s.from===queue[i]?s.to:s.to===queue[i]?s.from:undefined;if(next&&!previous.has(next)){previous.set(next,queue[i]);queue.push(next);}}
 const ids:string[]=[];for(let n:string|undefined=to.nodeId;n!==undefined;n=previous.get(n))ids.push(n);
 return Object.freeze(ids.reverse().map(id=>p.nodes.find(n=>n.id===id)!.position));
}
