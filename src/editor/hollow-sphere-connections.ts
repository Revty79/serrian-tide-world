import type {HollowSphereWorld} from '../terrain/hollow-sphere.ts';
import type {HollowSphereRole} from '../surfaces/hollow-sphere.ts';
import {validateSphereHole,sphereHoleCut,type RadialThroughHole} from '../surfaces/hollow-sphere-holes.ts';
import type {LinkedEntrance,PhysicalPassage} from '../surfaces/passages.ts';
import {TerrainHistory,type WordHistoryJournal} from './terrain-history.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';

export interface SphereConnections {readonly holes:readonly RadialThroughHole[];readonly links:readonly LinkedEntrance[];readonly passages:readonly PhysicalPassage[]}
export const SPHERE_CONNECTION_BYTES=256*1024;
export const EMPTY_SPHERE_CONNECTIONS:SphereConnections=Object.freeze({holes:Object.freeze([]),links:Object.freeze([]),passages:Object.freeze([])});
export function sphereConnectionWords(value:SphereConnections){
 const bytes=new TextEncoder().encode(JSON.stringify(value));if(bytes.length>SPHERE_CONNECTION_BYTES-4)throw RangeError('Spherical connections exceed the 256 KiB World limit.');const words=new Uint32Array(SPHERE_CONNECTION_BYTES/4);words[0]=bytes.length;new Uint8Array(words.buffer,4).set(bytes);return words;
}
export function decodeSphereConnectionWords(words:Uint32Array):SphereConnections{
 if(words.length!==SPHERE_CONNECTION_BYTES/4||words[0]!>SPHERE_CONNECTION_BYTES-4)throw Error('Invalid spherical connection words.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(words.buffer,words.byteOffset+4,words[0])));
}
export function validateSphereConnections(world:HollowSphereWorld,input:SphereConnections):SphereConnections{
 if(!input||Object.keys(input).sort().join(',')!=='holes,links,passages')throw RangeError('Unsupported spherical connection fields.');
 for(const list of[input.holes,input.links,input.passages])if(!Array.isArray(list)||list.length>48||Object.keys(list).some((key,i)=>key!==String(i))||Object.keys(list).length!==list.length)throw RangeError('Spherical connections require bounded dense arrays.');
 if(input.links.length||input.passages.length)throw RangeError('Sphere tunnel networks and map links are not available in the radial-hole checkpoint.');
 const holes=input.holes.map(h=>validateSphereHole(world,h)),ids=holes.flatMap(h=>[h.id,...h.mouths.map(m=>m.id)]);
 if(new Set(ids).size!==ids.length)throw RangeError('Duplicate spherical hole or mouth identity.');
 const bounds=holes.map(h=>{const c=sphereHoleCut(world,h);return[0,1,2].map(i=>[Math.min(c.a[i]!,c.b[i]!)-c.r,Math.max(c.a[i]!,c.b[i]!)+c.r]);});
 for(let i=0;i<bounds.length;i++)for(let j=0;j<i;j++)if(bounds[i]!.every((b,k)=>b[0]!<=bounds[j]![k]![1]!&&b[1]!>=bounds[j]![k]![0]!))throw RangeError('Independent hole bounds overlap. Move or resize the proposed hole.');
 const result=Object.freeze({holes:Object.freeze(holes),links:Object.freeze([]),passages:Object.freeze([])});sphereConnectionWords(result);return result;
}
export function validateSphereConnectionJournal(world:HollowSphereWorld,connections:SphereConnections,journal:WordHistoryJournal){
 const words=sphereConnectionWords(validateSphereConnections(world,connections)),history=new TerrainHistory(words,4*1024*1024,64);
 history.restoreJournal(journal,state=>{const canonical=sphereConnectionWords(validateSphereConnections(world,decodeSphereConnectionWords(state)));if(canonical.some((v,i)=>v!==state[i]))throw Error('Noncanonical spherical connection history.');});return history.exportJournal();
}
/** Conservative support covers interpolation and gradient neighbors. Heights at
 * this support must be exactly level zero; the cutter does not excavate displaced
 * terrain. Masks are derived, rebuilt only on geometry transactions. */
export async function prepareSphereProtection(world:HollowSphereWorld,connections:SphereConnections,read:(role:HollowSphereRole,index:number)=>number,work:PersistenceWork={},directions?:Partial<Record<HollowSphereRole,Float64Array>>){
 const cuts=connections.holes.map(h=>sphereHoleCut(world,h)),masks={}as Record<HollowSphereRole,Uint8Array>;let slice=performance.now();
 for(const role of['exterior','interior']as const){const t=world.surfaces[role].terrain,r=t.geometry.radiusMeters,n=t.metadata.representation.cellsPerEdge,pad=4*Math.PI*r/n,mask=new Uint8Array(t.sampleCount),dirs=directions?.[role];masks[role]=mask;
  if(!cuts.length)continue;
  const expanded=cuts.map(c=>{const x=c.b[0]-c.a[0],y=c.b[1]-c.a[1],z=c.b[2]-c.a[2];return{...c,x,y,z,length2:x*x+y*y+z*z,r2:(c.r+pad)**2};});
  for(let i=0;i<t.sampleCount;i++){const d=dirs?undefined:t.directionAt(t.keyAt(i)),x=(dirs?dirs[3*i]!:d![0])*r,y=(dirs?dirs[3*i+1]!:d![1])*r,z=(dirs?dirs[3*i+2]!:d![2])*r;
   for(const c of expanded){const a=x-c.a[0],b=y-c.a[1],v=z-c.a[2],f=c.length2?Math.max(0,Math.min(1,(a*c.x+b*c.y+v*c.z)/c.length2)):0;if((a-f*c.x)**2+(b-f*c.y)**2+(v-f*c.z)**2<=c.r2){mask[i]=1;if(read(role,i)!==0)throw Error('Reference-shell holes require level ground at exactly 0 m around both mouths. Move the hole or restore level ground; no excavation was changed.');break;}}
   if(i%512===511&&performance.now()-slice>=4){await workStep(work,'Checking spherical opening support',((role==='interior'?1:0)+i/t.sampleCount)/2);slice=performance.now();}
  }
 }return masks;
}
