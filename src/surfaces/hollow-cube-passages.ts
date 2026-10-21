import type {HollowCubeWorld} from '../terrain/hollow-cube.ts';
import {cubeDot,SOLID_CUBE_FRAMES,type CubeVector} from './solid-cube.ts';
import {validatePhysicalPassage,type PhysicalPassage} from './passages.ts';

/** Minimum Euclidean centerline distance to a closed axis-aligned cube. Between
 * its at-most-six plane crossings, squared distance is a convex quadratic. */
export function segmentCubeDistance(a:CubeVector,b:CubeVector,half:number){
 const d=b.map((v,i)=>v-a[i]!),cuts=[0,1];
 for(let i=0;i<3;i++)if(d[i]!==0)for(const wall of [-half,half]){const t=(wall-a[i]!)/d[i]!;if(t>0&&t<1)cuts.push(t);}cuts.sort((x,y)=>x-y);
 const at=(t:number)=>Math.hypot(...a.map((v,i)=>Math.max(0,Math.abs(v+t*d[i]!)-half)));let best=Infinity;
 for(let j=1;j<cuts.length;j++){const lo=cuts[j-1]!,hi=cuts[j]!,mid=(lo+hi)/2;let aa=0,ab=0;
  for(let i=0;i<3;i++){const v=a[i]!+mid*d[i]!,boundary=v>half?half:v< -half?-half:undefined;if(boundary!==undefined){aa+=d[i]!*d[i]!;ab+=d[i]!*(a[i]!-boundary);}}
  best=Math.min(best,at(lo),at(hi),at(aa?Math.max(lo,Math.min(hi,-ab/aa)):lo));
 }return best;
}
/** Conservative reference-volume validation. Branches/chambers are accepted in
 * shell material; portal segments must be normal to a single non-edge face.
 * No sampling-only containment claim and no excavation of terrain height fields. */
export function validateHollowCubePassage(world:HollowCubeWorld,input:PhysicalPassage){
 const passage=validatePhysicalPassage(input);if(passage.worldId!==world.definition.id)throw RangeError('Physical passage belongs to another parent World.');
 const outer=world.dimensions.outerSideLengthMeters/2,inner=world.dimensions.innerSideLengthMeters/2,toleranceMeters=128*Number.EPSILON*world.dimensions.outerSideLengthMeters;
 const nodes=new Map(passage.nodes.map(n=>[n.id,n])),portals=new Map(passage.portals.map(p=>[p.nodeId,p]));
 const roles=new Set<string>();
 if(passage.nodes.some(n=>n.radiusMeters<=toleranceMeters))throw RangeError('Passage radius is below reference-volume coordinate resolution.');
 for(const n of passage.nodes){const portal=portals.get(n.id);
  if(portal){const surface=world.select(portal.position),p=surface.geometry.normalize(portal.position),q=surface.geometry.referencePosition(p),frame=SOLID_CUBE_FRAMES[p.patchId];roles.add(surface.role);
   if(!q.every((v,i)=>v===n.position[i]))throw RangeError('Portal node must equal its exact reference-surface anchor.');
   const half=surface.geometry.metadata.sideLengthMeters/2;
   if(!(half-Math.abs(p.u)>n.radiusMeters+toleranceMeters&&half-Math.abs(p.v)>n.radiusMeters+toleranceMeters&&world.dimensions.nominalWallThicknessMeters>2*n.radiusMeters+toleranceMeters))throw RangeError('Portal aperture must fit one face away from edges/corners and the opposite boundary.');
   if(Math.abs(cubeDot(n.position,frame.normal))!==half)throw RangeError('Invalid physical portal plane.');
  }else{
   if(n.position.some(v=>Math.abs(v)+n.radiusMeters+toleranceMeters>=outer)||segmentCubeDistance(n.position,n.position,inner)<=n.radiusMeters+toleranceMeters)throw RangeError('Chamber/junction ball must lie strictly inside reference shell material.');
  }
 }
 for(const s of passage.segments){const a=nodes.get(s.from)!,b=nodes.get(s.to)!,pa=portals.get(a.id),pb=portals.get(b.id);
  if(pa||pb){const portal=pa??pb!,surface=world.select(portal.position),p=surface.geometry.normalize(portal.position),f=SOLID_CUBE_FRAMES[p.patchId];
   // An axial entrance makes the intersection a bounded declared circular disk;
   // oblique openings need a richer aperture contract in Cube-H.
   const tangents=[f.u,f.v];if(tangents.some(t=>cubeDot(a.position,t)!==cubeDot(b.position,t)))throw RangeError('Reference portal segments must be face-normal, not oblique.');
   const ca=cubeDot(a.position,f.normal),cb=cubeDot(b.position,f.normal);if(Math.min(ca,cb)<inner||Math.max(ca,cb)>outer||Math.min(ca,cb)===Math.max(ca,cb))throw RangeError('Portal segment must remain in the same reference wall.');
   if(pa&&pb){const other=world.select(pb.position);if(pa.position.patchId!==pb.position.patchId||surface.role===other.role)throw RangeError('Direct through-shell portals require the matching exterior/interior face.');}
  }else if([a,b].some(n=>n.position.some(v=>Math.abs(v)+s.radiusMeters+toleranceMeters>=outer))||segmentCubeDistance(a.position,b.position,inner)<=s.radiusMeters+toleranceMeters)throw RangeError('Physical segment capsule exits the reference shell without a declared portal.');
 }
 return Object.freeze({passage,toleranceMeters,throughShell:roles.has('exterior')&&roles.has('interior'),containment:'conservative-reference-shell' as const,terrainExcavated:false as const});
}
