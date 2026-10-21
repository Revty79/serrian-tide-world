import {createHollowCubeSurfaceGeometry,hollowCubeConfiguration,hollowCubeDimensions,type HollowCubeConfiguration,type HollowCubeRole} from '../surfaces/hollow-cube.ts';
import {createSolidCubeTerrain,type SolidCubeSampleAddress,type SolidCubeSampleKey} from './solid-cube.ts';
import {defineWorld} from '../surfaces/world.ts';
import {assertFloat32Elevation} from './model.ts';

/** Two ordinary accepted cube buffers. Orientation lives in the adapter, never
 * in negated elevation values, reinterpreted v1 metadata or shared ownership. */
export function createHollowCubeWorld(input:HollowCubeConfiguration,cellsPerEdge=128){
 const configuration=hollowCubeConfiguration(input),dimensions=hollowCubeDimensions(configuration);
 const make=(role:HollowCubeRole)=>{
  const geometry=createHollowCubeSurfaceGeometry(configuration,role),referenceTerrain=createSolidCubeTerrain({terrainId:configuration.surfaces[role].terrainId,geometry:geometry.kernelConfiguration,cellsPerEdge,initialElevation:0});
  const address=(a:SolidCubeSampleAddress)=>({...a,row:role==='interior'?cellsPerEdge-a.row:a.row});
  return Object.freeze({role,geometry,referenceTerrain,
   resolve:(a:SolidCubeSampleAddress)=>referenceTerrain.resolve(address(a)),
   aliases:(key:SolidCubeSampleKey)=>referenceTerrain.aliases(key).map(address),
   owner:(key:SolidCubeSampleKey)=>address(referenceTerrain.owner(key)),
   positionAt:(a:SolidCubeSampleAddress)=>geometry.fromReferenceChart(referenceTerrain.positionAt(address(a))),
  });
 };
 const exterior=make('exterior'),interior=make('interior'),surfaces=Object.freeze({exterior,interior});
 const definition=defineWorld({id:configuration.worldId,shape:{kind:'hollow-cube',outerSideLengthMeters:dimensions.outerSideLengthMeters,innerSideLengthMeters:dimensions.innerSideLengthMeters},surfaces:[exterior,interior].map(s=>({identity:s.geometry.identity,role:s.role,terrainId:s.referenceTerrain.metadata.terrainId,topology:{id:s.geometry.metadata.provider,version:1},representation:{id:s.referenceTerrain.metadata.representation.provider,version:1}}))});
 return Object.freeze({configuration,dimensions,definition,surfaces,
  select:(identity:{worldId:string;surfaceId:string})=>{const s=[exterior,interior].find(s=>s.geometry.identity.worldId===identity?.worldId&&s.geometry.identity.surfaceId===identity?.surfaceId);if(!s)throw RangeError('Unknown hollow cube surface identity.');return s;},
  elevationByteLength:exterior.referenceTerrain.elevationByteLength+interior.referenceTerrain.elevationByteLength,
 });
}
export type HollowCubeWorld=ReturnType<typeof createHollowCubeWorld>;
export type HollowCubeSurface=HollowCubeWorld['surfaces'][HollowCubeRole];
export interface HollowCubeProposal {readonly role:HollowCubeRole;readonly changes:readonly {readonly key:SolidCubeSampleKey;readonly elevation:number}[]}
/** Read-only conservative extrema screen, optionally including a proposed patch.
 * It is NOT a displaced mesh/volume collision certificate. No clamping or writes.
 * Positive heights on either surface increase face-center clearance. Negative
 * minima on BOTH sides consume shell clearance; positive compensation is ignored. */
export async function assessHollowCubeClearance(world:HollowCubeWorld,proposal?:HollowCubeProposal,yieldWork:()=>Promise<void>=()=>new Promise(resolve=>setTimeout(resolve,0))){
 const replacements=new Map<number,number>();
 if(proposal){if(proposal.role!=='exterior'&&proposal.role!=='interior'||!Array.isArray(proposal.changes)||proposal.changes.length>world.surfaces[proposal.role].referenceTerrain.sampleCount)throw RangeError('Invalid bounded hollow cube proposal.');
  const terrain=world.surfaces[proposal.role].referenceTerrain;for(const change of proposal.changes){terrain.read(change.key);assertFloat32Elevation(change.elevation);if(replacements.has(change.key.index))throw RangeError('Duplicate proposal sample.');replacements.set(change.key.index,Math.fround(change.elevation));}
 }
 const revisions={exterior:world.surfaces.exterior.referenceTerrain.revision,interior:world.surfaces.interior.referenceTerrain.revision};
 const extrema={} as Record<HollowCubeRole,{min:number;max:number}>;let inspectedSamples=0;
 for(const role of ['exterior','interior'] as const){const terrain=world.surfaces[role].referenceTerrain;let min=Infinity,max=-Infinity;
  for(let i=0;i<terrain.sampleCount;i++){const h=proposal?.role===role&&replacements.has(i)?replacements.get(i)!:terrain.read(terrain.keyAt(i));min=Math.min(min,h);max=Math.max(max,h);inspectedSamples++;if(i%4096===4095)await yieldWork();}extrema[role]={min,max};
 }
 if((['exterior','interior'] as const).some(role=>world.surfaces[role].referenceTerrain.revision!==revisions[role]))throw Error('Shell clearance source changed; reassess the current surfaces.');
 const conservativeFaceGapMeters=world.dimensions.nominalWallThicknessMeters+Math.min(0,extrema.exterior.min)+Math.min(0,extrema.interior.min),issues:string[]=[];
 if(conservativeFaceGapMeters<=0)issues.push('Conservative face clearance is exhausted by lowering one or both surfaces.');
 if(extrema.interior.max>=world.dimensions.innerSideLengthMeters/2)issues.push('Inward height reaches or crosses the cavity center plane.');
 if(extrema.exterior.min<=-world.dimensions.outerSideLengthMeters/2)issues.push('Exterior height reaches or crosses the World center plane.');
 return Object.freeze({status:issues.length?'unsafe-reference-envelope' as const:'reference-envelope-clear' as const,conservativeFaceGapMeters,extrema:Object.freeze(extrema),revisions:Object.freeze(revisions),inspectedSamples,issues:Object.freeze(issues),volumetricCollisionCertified:false as const,proposalOnly:Boolean(proposal)});
}
