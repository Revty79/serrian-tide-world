import type {HollowSphereWorld} from '../terrain/hollow-sphere.ts';
import type {SurfacePosition} from './contracts.ts';
import {normalizeSphereAnchor} from './hollow-sphere-holes.ts';
import {validateLinkedEntrance,type LinkedEntrance,type PassageLocation} from './passages.ts';
const exact=(v:unknown,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.toSorted().join(','))throw RangeError('Unsupported map link fields.');};
export function validateSphereLink(world:HollowSphereWorld,input:LinkedEntrance){
 exact(input,['kind','version','id','worldId','anchors']);
 if(!Array.isArray(input.anchors)||Object.keys(input.anchors).join(',')!=='0,1')throw RangeError('A map link requires two dense reciprocal anchors.');
 for(const a of input.anchors){exact(a,['id','targetAnchorId','location']);const l=a.location;exact(l,l?.kind==='surface'?['kind','position']:['kind','worldId','mapId','locationId']);if(l.kind==='surface')exact(l.position,['worldId','surfaceId','patchId','u','v']);}
 const link=validateLinkedEntrance(input,p=>p.worldId===world.definition.id?normalizeSphereAnchor(world,p):p);
 if(link.worldId!==world.definition.id||!link.anchors.some(a=>a.location.kind==='surface'&&a.location.position.worldId===world.definition.id))throw RangeError('A spherical link needs a local surface anchor on its parent World.');
 const local=link.anchors.flatMap(a=>a.location.kind==='surface'&&a.location.position.worldId===world.definition.id?[a.location.position]:[]);
 if(local.length===2&&local[0]!.surfaceId===local[1]!.surfaceId){const a=world.select(local[0]!).geometry.direction(local[0]!),b=world.select(local[1]!).geometry.direction(local[1]!);if(Math.hypot(...a.map((v,i)=>v-b[i]!))<=128*Number.EPSILON)throw RangeError('Map link endpoints on the same surface must identify different locations.');}
 return link;
}
export function sphereMapLink(world:HollowSphereWorld,from:SurfacePosition,to:PassageLocation,id:string=crypto.randomUUID()){
 const a=crypto.randomUUID(),b=crypto.randomUUID();return validateSphereLink(world,{kind:'linked-entrance',version:1,id,worldId:world.definition.id,anchors:[{id:a,targetAnchorId:b,location:{kind:'surface',position:from}},{id:b,targetAnchorId:a,location:to}]});
}
export function relocateSphereLink(world:HollowSphereWorld,link:LinkedEntrance,anchorId:string,location:PassageLocation){
 if(!link.anchors.some(a=>a.id===anchorId))throw RangeError('Unknown map link anchor.');return validateSphereLink(world,{...link,anchors:link.anchors.map(a=>a.id===anchorId?{...a,location}:a)});
}
