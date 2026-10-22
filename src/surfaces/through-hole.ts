import type {SurfacePosition} from './contracts.ts';
import type {HollowCubeWorld} from '../terrain/hollow-cube.ts';
import {passageId} from './passages.ts';
import {type CubeVector} from './solid-cube.ts';

/** An authored direct breach, with no network nodes, segments or junctions.
 * v1 cuts the reference shell. Displaced mouths need a new geometry contract. */
export interface ThroughHole {
 readonly kind:'through-hole';readonly version:1;readonly id:string;readonly worldId:string;
 readonly geometry:'circular-face-normal';readonly radiusMeters:number;
 readonly mouths:readonly {readonly id:string;readonly position:SurfacePosition}[];
}
const exact=(value:unknown,keys:string[])=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.sort().join(','))throw RangeError('Unsupported through-hole fields.');};
export function validateHollowHole(world:HollowCubeWorld,input:ThroughHole):ThroughHole {
 exact(input,['kind','version','id','worldId','geometry','radiusMeters','mouths']);
 if(input.kind!=='through-hole'||input.version!==1||input.geometry!=='circular-face-normal'||input.worldId!==world.definition.id)throw RangeError('Unsupported through-hole geometry or parent World.');
 passageId(input.id);passageId(input.worldId);
 const r=input.radiusMeters,t=world.dimensions.nominalWallThicknessMeters,tolerance=128*Number.EPSILON*world.dimensions.outerSideLengthMeters;
 if(!Number.isFinite(r)||r<world.dimensions.outerSideLengthMeters*1e-5||t<world.dimensions.outerSideLengthMeters*1e-4)throw RangeError('Hole radius or wall thickness is below supported display precision.');
 if(!Array.isArray(input.mouths)||input.mouths.length!==2||Object.keys(input.mouths).join(',')!=='0,1')throw RangeError('A hole needs exactly two corresponding mouths.');
 const mouths=input.mouths.map(m=>{exact(m,['id','position']);passageId(m.id);exact(m.position,['worldId','surfaceId','patchId','u','v']);const surface=world.select(m.position),p=surface.geometry.normalize(m.position),half=surface.geometry.metadata.sideLengthMeters/2;
  if(!(half-Math.abs(p.u)>r+tolerance&&half-Math.abs(p.v)>r+tolerance))throw RangeError('Hole aperture must fit away from face edges and corners.');
  return Object.freeze({id:m.id,position:Object.freeze({...p})});});
 if(mouths[0]!.id===mouths[1]!.id)throw RangeError('Hole mouths need distinct identities.');
 const a=world.select(mouths[0]!.position),b=world.select(mouths[1]!.position),pa=a.geometry.toReferenceChart(mouths[0]!.position),pb=b.geometry.toReferenceChart(mouths[1]!.position);
 if(a.role===b.role||pa.patchId!==pb.patchId||pa.u!==pb.u||pa.v!==pb.v)throw RangeError('Hole mouths must be physically corresponding opposite-side locations.');
 return Object.freeze({kind:'through-hole',version:1,id:input.id,worldId:input.worldId,geometry:'circular-face-normal',radiusMeters:r,mouths:Object.freeze(mouths)});
}
export function cutHoleAt(world:HollowCubeWorld,position:SurfacePosition,radiusMeters:number,id:string=crypto.randomUUID()):ThroughHole {
 const surface=world.select(position),p=surface.geometry.toReferenceChart(position);
 return validateHollowHole(world,{kind:'through-hole',version:1,id,worldId:world.definition.id,geometry:'circular-face-normal',radiusMeters,
  mouths:(['exterior','interior'] as const).map(role=>({id:crypto.randomUUID(),position:world.surfaces[role].geometry.fromReferenceChart({...world.surfaces[role].geometry.identity,patchId:p.patchId,u:p.u,v:p.v})}))});
}
/** Shared cutter input only; a hole never becomes a saved PhysicalPassage. */
export function holeCut(world:HollowCubeWorld,hole:ThroughHole):{a:CubeVector;b:CubeVector;r:number} {
 const [a,b]=hole.mouths.map(m=>world.select(m.position).geometry.referencePosition(m.position));return{a:a!,b:b!,r:hole.radiusMeters};
}
export function resizeHole(world:HollowCubeWorld,hole:ThroughHole,radiusMeters:number){return validateHollowHole(world,{...hole,radiusMeters});}
export function moveHole(world:HollowCubeWorld,hole:ThroughHole,position:SurfacePosition){
 const next=cutHoleAt(world,position,hole.radiusMeters,hole.id);
 return validateHollowHole(world,{...next,mouths:next.mouths.map(m=>({...m,id:hole.mouths.find(old=>world.select(old.position).role===world.select(m.position).role)!.id}))});
}
