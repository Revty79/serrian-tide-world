import {createSphericalTerrain,type SphericalSampleAddress,type SphericalSampleKey} from './spherical.ts';
import {hollowSphereElevationValidator,createHollowSphereSurfaceGeometry,hollowSphereConfiguration,hollowSphereDimensions,HOLLOW_SPHERE_ROLES,type HollowSphereConfiguration,type HollowSphereRole} from '../surfaces/hollow-sphere.ts';
import {defineWorld} from '../surfaces/world.ts';
export function createHollowSphereWorld(input:HollowSphereConfiguration,cellsPerEdge=128){
 const configuration=hollowSphereConfiguration(input),dimensions=hollowSphereDimensions(configuration);
 const make=(role:HollowSphereRole)=>{
  const geometry=createHollowSphereSurfaceGeometry(configuration,role),terrain=createSphericalTerrain({terrainId:configuration.surfaces[role].terrainId,identity:geometry.identity,radiusMeters:geometry.radiusMeters,cellsPerEdge,initialElevation:0,validateElevation:hollowSphereElevationValidator(configuration,role)});
  const address=(a:SphericalSampleAddress)=>({...a,row:role==='interior'?cellsPerEdge-a.row:a.row});
  return Object.freeze({role,geometry,terrain,
   resolve:(a:SphericalSampleAddress)=>terrain.resolve(address(a)),
   aliases:(key:SphericalSampleKey)=>terrain.aliases(key).map(address),
   owner:(key:SphericalSampleKey)=>address(terrain.aliases(key)[0]!),
   positionAt:(a:SphericalSampleAddress)=>geometry.fromReferenceChart(terrain.positionAt(address(a))),
  });
 };
 const surfaces=Object.freeze({exterior:make('exterior'),interior:make('interior')});
 const definition=defineWorld({id:configuration.worldId,shape:{kind:'hollow-sphere',outerRadiusMeters:dimensions.outerRadiusMeters,innerRadiusMeters:dimensions.innerRadiusMeters},surfaces:HOLLOW_SPHERE_ROLES.map(role=>({identity:surfaces[role].geometry.identity,role,terrainId:surfaces[role].terrain.metadata.terrainId,topology:{id:'physical-hollow-sphere-surface',version:1},representation:{id:surfaces[role].terrain.metadata.representation.provider,version:1}}))});
 return Object.freeze({configuration,dimensions,definition,surfaces,elevationByteLength:surfaces.exterior.terrain.elevationByteLength+surfaces.interior.terrain.elevationByteLength,
  select:(p:{worldId:string;surfaceId:string})=>{const s=HOLLOW_SPHERE_ROLES.map(role=>surfaces[role]).find(s=>s.geometry.identity.worldId===p?.worldId&&s.geometry.identity.surfaceId===p.surfaceId);if(!s)throw RangeError('Unknown hollow sphere surface.');return s;},
 });
}
export type HollowSphereWorld=ReturnType<typeof createHollowSphereWorld>;
