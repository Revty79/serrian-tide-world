import type {PolyhedronMaterial,PolyhedronRole} from '../surfaces/polyhedron-material.ts';
import {validatePolyhedronHole,polyhedronHoleCut,type PolyhedronHole} from '../surfaces/polyhedron-holes.ts';
import {validatePolyhedronPassage,validatePolyhedronLink} from '../surfaces/polyhedron-passages.ts';
import {segmentPointDistance,type PhysicalPassage,type LinkedEntrance} from '../surfaces/passages.ts';
import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import {TerrainHistory,type WordHistoryJournal} from './terrain-history.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export interface PolyhedronConnections{readonly holes:readonly PolyhedronHole[];readonly passages:readonly PhysicalPassage[];readonly links:readonly LinkedEntrance[]}
export const POLYHEDRON_CONNECTION_BYTES=256*1024;
export const EMPTY_POLYHEDRON_CONNECTIONS:PolyhedronConnections=Object.freeze({holes:Object.freeze([]),passages:Object.freeze([]),links:Object.freeze([])});
export function polyhedronConnectionWords(value:PolyhedronConnections){const bytes=new TextEncoder().encode(JSON.stringify(value));if(bytes.length>POLYHEDRON_CONNECTION_BYTES-4)throw RangeError('Physical connections exceed the 256 KiB World limit.');const words=new Uint32Array(POLYHEDRON_CONNECTION_BYTES/4);words[0]=bytes.length;new Uint8Array(words.buffer,4).set(bytes);return words;}
export function decodePolyhedronConnectionWords(words:Uint32Array):PolyhedronConnections{if(words.length!==POLYHEDRON_CONNECTION_BYTES/4||words[0]!>POLYHEDRON_CONNECTION_BYTES-4)throw RangeError('Invalid physical connection words.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(words.buffer,words.byteOffset+4,words[0])));}
export function polyhedronCutPrimitives(body:PolyhedronMaterial,connections:Pick<PolyhedronConnections,'holes'|'passages'>){return[...connections.holes.map(h=>polyhedronHoleCut(body,h)),...connections.passages.flatMap(p=>{const nodes=new Map(p.nodes.map(n=>[n.id,n]));return[...p.nodes.map(n=>({a:n.position,b:n.position,r:n.radiusMeters})),...p.segments.map(s=>({a:nodes.get(s.from)!.position,b:nodes.get(s.to)!.position,r:s.radiusMeters}))];})];}
export function validatePolyhedronConnections(body:PolyhedronMaterial,input:PolyhedronConnections):PolyhedronConnections{
 if(!input||typeof input!=='object'||Object.keys(input).sort().join(',')!=='holes,links,passages')throw RangeError('Unsupported physical connection fields.');
 for(const[list,max]of[[input.holes,48],[input.passages,8],[input.links,128]]as const)if(!Array.isArray(list)||list.length>max||Object.keys(list).length!==list.length||Object.keys(list).some((k,i)=>k!==String(i)))throw RangeError('Physical connections require bounded dense arrays.');
 const holes=input.holes.map(h=>validatePolyhedronHole(body,h)),passages=input.passages.map(p=>validatePolyhedronPassage(body,p)),links=input.links.map(l=>validatePolyhedronLink(body,l)),ids=[...holes.flatMap(h=>[h.id,...h.mouths.map(m=>m.id)]),...passages.flatMap(p=>[p.id,...p.nodes.map(n=>n.id),...p.segments.map(s=>s.id),...p.portals.map(a=>a.id)]),...links.flatMap(l=>[l.id,...l.anchors.map(a=>a.id)])];
 if(new Set(ids).size!==ids.length)throw RangeError('Physical connection and component identities must be independent.');
 if(holes.length+passages.reduce((n,p)=>n+p.nodes.length+p.segments.length,0)>48)throw RangeError('A World supports at most 48 total cutting primitives.');
 const groups=[...holes.map(h=>polyhedronCutPrimitives(body,{holes:[h],passages:[]})),...passages.map(p=>polyhedronCutPrimitives(body,{holes:[],passages:[p]}))],bounds=groups.map(cuts=>[0,1,2].map(k=>[Math.min(...cuts.map(c=>Math.min(c.a[k]!,c.b[k]!)-c.r)),Math.max(...cuts.map(c=>Math.max(c.a[k]!,c.b[k]!)+c.r))]));
 for(let i=0;i<bounds.length;i++)for(let j=0;j<i;j++)if(bounds[i]!.every((v,k)=>v[0]!<=bounds[j]![k]![1]!&&v[1]!>=bounds[j]![k]![0]!))throw RangeError('Independent physical object bounds overlap. Move the object or add a branch within one network.');
 const result=Object.freeze({holes:Object.freeze(holes),passages:Object.freeze(passages),links:Object.freeze(links)});polyhedronConnectionWords(result);return result;
}
export function validatePolyhedronConnectionJournal(body:PolyhedronMaterial,current:PolyhedronConnections,journal:WordHistoryJournal){const words=polyhedronConnectionWords(validatePolyhedronConnections(body,current)),history=new TerrainHistory(words,4*1024*1024,64);history.restoreJournal(journal,state=>{const canonical=polyhedronConnectionWords(validatePolyhedronConnections(body,decodePolyhedronConnectionWords(state)));if(canonical.some((v,i)=>v!==state[i]))throw RangeError('Noncanonical physical connection history.');});return history.exportJournal();}
/** Same reference-ground policy as the accepted cylindrical and spherical
 * editors, with real mesh spacing and physical XYZ positions. A solid owns
 * only its exterior mask. Protection includes reconstruction/gradient support. */
export async function preparePolyhedronProtection(body:PolyhedronMaterial,connections:PolyhedronConnections,banks:Partial<Record<PolyhedronRole,PolyhedronTerrain>>,work:PersistenceWork={}){
 const cuts=polyhedronCutPrimitives(body,connections),masks:Partial<Record<PolyhedronRole,Uint8Array>>={};let slice=performance.now();
 for(const[role,t]of Object.entries(banks) as [PolyhedronRole,PolyhedronTerrain][]){const mask=new Uint8Array(t.sampleCount);masks[role]=mask;if(!cuts.length)continue;const pad=4*Math.max(...t.geometry.faces.flatMap(face=>{const f=t.geometry.frame(face);return[Math.hypot(...f.u),Math.hypot(...f.v)];}))/t.subdivisions+body.guardMeters*64;
  for(let i=0;i<t.sampleCount;i++){const key=t.keyAt(i),q=t.referencePositionAt(key);if(cuts.some(c=>segmentPointDistance(q,c.a,c.b)<=c.r+pad)){mask[i]=1;if(t.read(key)!==0)throw RangeError('Reference-ground cuts require exactly 0 m around their openings. Move/remove the connection or restore level ground; terrain and connections are unchanged.');}
   if(i%512===511&&performance.now()-slice>=4){await workStep(work,'Checking physical opening support',i/t.sampleCount);slice=performance.now();}
  }
 }return masks;
}
