import type {PatchEdge,SurfaceIdentity,SurfacePosition,SurfaceTangent,TangentTransform} from './contracts.ts';
import {assertCubeIdentity,assertSolidCubeFace,createSolidCubeGeometry,SOLID_CUBE_CONNECTIONS,SOLID_CUBE_FRAMES,type CubeVector,type SolidCubeConfiguration,type SolidCubeFace} from './solid-cube.ts';

export type HollowCubeRole='exterior'|'interior';
export interface HollowCubeDimensions {readonly outerSideLengthMeters:number;readonly innerSideLengthMeters:number}
export interface HollowCubeConfiguration extends HollowCubeDimensions {
 readonly provider:'physical-hollow-cube';readonly version:1;readonly worldId:string;
 readonly surfaces:Readonly<Record<HollowCubeRole,{readonly surfaceId:string;readonly terrainId:string}>>;
}
export function hollowCubeDimensions(input:HollowCubeDimensions){
 if(!input)throw RangeError('Hollow cube dimensions are required.');
 const outer=input.outerSideLengthMeters,inner=input.innerSideLengthMeters,thickness=(outer-inner)/2,cavityVolume=inner*inner*inner,shellVolume=(outer-inner)*(outer*outer+outer*inner+inner*inner);
 if(!(inner>0&&inner<outer)||![outer,inner,thickness,cavityVolume,shellVolume,6*outer*outer].every(v=>Number.isFinite(v)&&v>0)||inner/2===0||outer/2<=inner/2)throw RangeError('Finite representable hollow cube dimensions require 0 < inner side < outer side and positive cavity/shell volume.');
 return Object.freeze({outerSideLengthMeters:outer,innerSideLengthMeters:inner,nominalWallThicknessMeters:thickness,cavityVolumeMeters3:cavityVolume,referenceShellVolumeMeters3:shellVolume});
}
export function hollowCubeConfiguration(input:HollowCubeConfiguration):HollowCubeConfiguration{
 const dimensions=hollowCubeDimensions(input);
 if(input.provider!=='physical-hollow-cube'||input.version!==1||!input.surfaces)throw RangeError('Version 1 physical hollow cube configuration required.');
 const surfaces={} as Record<HollowCubeRole,{surfaceId:string;terrainId:string}>;
 for(const role of ['exterior','interior'] as const){const s=input.surfaces[role];if(!s)throw RangeError('Both hollow cube surfaces are required.');assertCubeIdentity({worldId:input.worldId,surfaceId:s.surfaceId});if(typeof s.terrainId!=='string'||!s.terrainId.trim()||s.terrainId.length>128)throw RangeError('Valid independent terrain identities are required.');surfaces[role]=Object.freeze({surfaceId:s.surfaceId,terrainId:s.terrainId});}
 if(surfaces.exterior.surfaceId===surfaces.interior.surfaceId||surfaces.exterior.terrainId===surfaces.interior.terrainId)throw RangeError('Hollow cube surfaces and terrain identities must be independent.');
 return Object.freeze({provider:'physical-hollow-cube',version:1,worldId:input.worldId,outerSideLengthMeters:dimensions.outerSideLengthMeters,innerSideLengthMeters:dimensions.innerSideLengthMeters,surfaces:Object.freeze(surfaces)});
}
const negate=(v:number)=>v===0?0:-v;
/** The inward chart reverses V, so U cross V is its true inward normal. The
 * unchanged solid provider is used only as an intrinsic reference kernel. It is
 * never reclassified as an interior solid World or accepted by a v5 save codec. */
export function createHollowCubeSurfaceGeometry(input:HollowCubeConfiguration,role:HollowCubeRole){
 const parent=hollowCubeConfiguration(input);if(role!=='exterior'&&role!=='interior')throw RangeError('Unknown hollow cube surface role.');
 const sideLengthMeters=role==='exterior'?parent.outerSideLengthMeters:parent.innerSideLengthMeters,orientation=role==='exterior'?1:-1;
 const identity:SurfaceIdentity=Object.freeze({worldId:parent.worldId,surfaceId:parent.surfaces[role].surfaceId});
 const kernelConfiguration:SolidCubeConfiguration=Object.freeze({identity,provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters});
 const kernel=createSolidCubeGeometry(kernelConfiguration);
 const metadata=Object.freeze({identity,provider:'physical-hollow-cube-surface' as const,version:1 as const,configuration:'hollow' as const,role,sideLengthMeters});
 const toReferenceChart=(p:SurfacePosition)=>kernel.normalize({...p,v:orientation===1?p.v:negate(p.v)});
 const fromReferenceChart=(p:SurfacePosition)=>{const q=kernel.normalize(p);return Object.freeze({...q,v:orientation===1?q.v:negate(q.v)});};
 const normalize=(p:SurfacePosition)=>fromReferenceChart(toReferenceChart(p));
 const edgeToReference=(edge:PatchEdge):PatchEdge=>orientation===-1&&edge.startsWith('v')?(edge==='v-min'?'v-max':'v-min'):edge;
 const transport=(t:TangentTransform):TangentTransform=>Object.freeze({uu:t.uu,uv:t.uv*orientation,vu:t.vu*orientation,vv:t.vv});
 const connections=Object.freeze(SOLID_CUBE_CONNECTIONS.map(c=>Object.freeze({...c,edge:edgeToReference(c.edge),toEdge:edgeToReference(c.toEdge),reversed:(c.reversed?-1:1)*(c.edge.startsWith('u')?orientation:1)*(c.toEdge.startsWith('u')?orientation:1)<0})));
 const frame=(face:SolidCubeFace)=>{assertSolidCubeFace(face);const f=SOLID_CUBE_FRAMES[face];return Object.freeze({u:f.u,v:Object.freeze(f.v.map(x=>orientation*x)) as unknown as CubeVector,normal:Object.freeze(f.normal.map(x=>orientation*x)) as unknown as CubeVector});};
 const referencePosition=(p:SurfacePosition)=>kernel.referencePosition(toReferenceChart(p));
 const normal=(p:SurfacePosition)=>frame(normalize(p).patchId).normal;
 return Object.freeze({metadata,identity,orientation,kernelConfiguration,kernelWinding:orientation===1?'ccw' as const:'cw' as const,connections,frame,normalize,toReferenceChart,fromReferenceChart,referencePosition,normal,
  aliases:(p:SurfacePosition)=>kernel.aliases(toReferenceChart(p)).map(fromReferenceChart),
  positionsForReference:(q:CubeVector)=>kernel.positionsForReference(q).map(fromReferenceChart),
  crossEdge:(p:SurfacePosition,edge:PatchEdge)=>{const t=kernel.crossEdge(toReferenceChart(p),edgeToReference(edge));return{position:fromReferenceChart(t.position),transport:transport(t.transport)};},
  tangentTransform:(a:SurfacePosition,b:SurfacePosition)=>transport(kernel.tangentTransform(toReferenceChart(a),toReferenceChart(b))),
  tangentVector:(p:SurfacePosition,t:SurfaceTangent)=>kernel.tangentVector(toReferenceChart(p),{du:t.du,dv:orientation*t.dv}),
  elevatedPosition:(p:SurfacePosition,height:number):CubeVector=>{if(!Number.isFinite(height))throw RangeError('Finite elevation required.');const q=referencePosition(p),n=normal(p),result=q.map((v,i)=>v+height*n[i]!) as unknown as CubeVector;if(!result.every(Number.isFinite))throw RangeError('Displaced coordinate exceeds finite range.');return result;},
 });
}
export type HollowCubeSurfaceGeometry=ReturnType<typeof createHollowCubeSurfaceGeometry>;
