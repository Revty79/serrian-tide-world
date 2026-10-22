import type {HollowCylinderWorld} from '../terrain/hollow-cylinder.ts';
import type {HollowCylinderRole} from '../surfaces/hollow-cylinder.ts';
import {validateCylinderHole,type CylinderThroughHole} from '../surfaces/hollow-cylinder-holes.ts';
import {cylinderCutPrimitives} from '../surfaces/hollow-cylinder-excavation.ts';
import type {LinkedEntrance,PhysicalPassage} from '../surfaces/passages.ts';
import {TerrainHistory,type WordHistoryJournal} from './terrain-history.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';

export interface CylinderConnections {readonly holes:readonly CylinderThroughHole[];readonly links:readonly LinkedEntrance[];readonly passages:readonly PhysicalPassage[]}
export const CYLINDER_CONNECTION_BYTES=256*1024;
export const EMPTY_CYLINDER_CONNECTIONS:CylinderConnections=Object.freeze({holes:Object.freeze([]),links:Object.freeze([]),passages:Object.freeze([])});
export function cylinderConnectionWords(value:CylinderConnections){
 const bytes=new TextEncoder().encode(JSON.stringify(value));if(bytes.length>CYLINDER_CONNECTION_BYTES-4)throw RangeError('Cylindrical connections exceed the 256 KiB World limit.');const words=new Uint32Array(CYLINDER_CONNECTION_BYTES/4);words[0]=bytes.length;new Uint8Array(words.buffer,4).set(bytes);return words;
}
export function decodeCylinderConnectionWords(words:Uint32Array):CylinderConnections{
 if(words.length!==CYLINDER_CONNECTION_BYTES/4||words[0]!>CYLINDER_CONNECTION_BYTES-4)throw Error('Invalid cylindrical connection words.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(words.buffer,words.byteOffset+4,words[0])));
}
export function validateCylinderConnections(world:HollowCylinderWorld,input:CylinderConnections,capability:'holes'='holes'):CylinderConnections{
 if(!input||Object.keys(input).sort().join(',')!=='holes,links,passages')throw RangeError('Unsupported cylindrical connection fields.');
 for(const[list,max]of[[input.holes,48],[input.links,128],[input.passages,8]]as const)if(!Array.isArray(list)||list.length>max||Object.keys(list).some((key,i)=>key!==String(i))||Object.keys(list).length!==list.length)throw RangeError('Cylindrical connections require bounded dense arrays.');
 if(input.links.length||input.passages.length)throw RangeError('Version 12 supports cylinder holes only.');void capability;
 const holes=input.holes.map(h=>validateCylinderHole(world,h)),passages:PhysicalPassage[]=[],links:LinkedEntrance[]=[];
 const ids=[...holes.flatMap(h=>[h.id,...h.mouths.map(m=>m.id)]),...passages.flatMap(p=>[p.id,...p.nodes.map(n=>n.id),...p.segments.map(s=>s.id),...p.portals.map(a=>a.id)]),...links.flatMap(l=>[l.id,...l.anchors.map(a=>a.id)])];
 if(new Set(ids).size!==ids.length)throw RangeError('Duplicate cylindrical connection or component identity.');
 if(holes.length+passages.reduce((n,p)=>n+p.nodes.length+p.segments.length,0)>48)throw RangeError('The World supports at most 48 hole, node and segment cutting primitives.');
 const groups=[...holes.map(h=>cylinderCutPrimitives(world,[h])),...passages.map(p=>cylinderCutPrimitives(world,[],[p]))],bounds=groups.map(cuts=>[0,1,2].map(i=>[Math.min(...cuts.map(c=>Math.min(c.a[i]!,c.b[i]!)-c.r)),Math.max(...cuts.map(c=>Math.max(c.a[i]!,c.b[i]!)+c.r))]));
 for(let i=0;i<bounds.length;i++)for(let j=0;j<i;j++)if(bounds[i]!.every((b,k)=>b[0]!<=bounds[j]![k]![1]!&&b[1]!>=bounds[j]![k]![0]!))throw RangeError('Independent hole or network bounds overlap. Move the object or add a branch within one network.');
 const result=Object.freeze({holes:Object.freeze(holes),links:Object.freeze(links),passages:Object.freeze(passages)});cylinderConnectionWords(result);return result;
}
export function validateCylinderConnectionJournal(world:HollowCylinderWorld,connections:CylinderConnections,journal:WordHistoryJournal,capability:'holes'='holes'){
 const words=cylinderConnectionWords(validateCylinderConnections(world,connections,capability)),history=new TerrainHistory(words,4*1024*1024,64);
 history.restoreJournal(journal,state=>{const canonical=cylinderConnectionWords(validateCylinderConnections(world,decodeCylinderConnectionWords(state),capability));if(canonical.some((v,i)=>v!==state[i]))throw Error('Noncanonical cylindrical connection history.');});return history.exportJournal();
}
/** Conservative support covers interpolation and gradient neighbors. Heights at
 * this support must be exactly level zero; the cutter does not excavate displaced
 * terrain. Masks are derived, rebuilt only on geometry transactions. */
export async function prepareCylinderProtection(world:HollowCylinderWorld,connections:CylinderConnections,read:(role:HollowCylinderRole,index:number)=>number,work:PersistenceWork={}){
 const cuts=cylinderCutPrimitives(world,connections.holes,connections.passages),masks={}as Record<HollowCylinderRole,Uint8Array>;let slice=performance.now();
 for(const role of ['exterior','interior']as const){const t=world.surfaces[role].terrain,g=t.geometry,{angularSamples:a,axialCells:z,radialCells:p}=t.metadata.representation.resolution,pad=4*Math.max(2*Math.PI*g.metadata.radiusMeters/a,g.metadata.lengthMeters/z,g.metadata.radiusMeters/p),mask=new Uint8Array(t.sampleCount);masks[role]=mask;if(!cuts.length)continue;
  for(let i=0;i<t.sampleCount;i++){const q=g.referencePosition(t.positionAt(t.owner(t.keyAt(i)))),point=[q[0],q[1],q[2]-g.metadata.lengthMeters/2]as const;
   if(cuts.some(c=>{const axis=c.b.map((v,k)=>v-c.a[k]!),delta=point.map((v,k)=>v-c.a[k]!),length=axis.reduce((n,v)=>n+v*v,0),f=length?Math.max(0,Math.min(1,delta.reduce((n,v,k)=>n+v*axis[k]!,0)/length)):0;return delta.reduce((n,v,k)=>n+(v-f*axis[k]!)**2,0)<=(c.r+pad)**2;})){mask[i]=1;if(read(role,i)!==0)throw Error('Reference-shell cuts require level ground at exactly 0 m around openings. Move the opening or restore level ground; no excavation was changed.');}
   if(i%512===511&&performance.now()-slice>=4){await workStep(work,'Checking cylindrical opening support',((role==='interior'?1:0)+i/t.sampleCount)/2);slice=performance.now();}
  }
 }return masks;
}
