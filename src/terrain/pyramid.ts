import {createPyramidGeometry,PYRAMID_FACES,PYRAMID_VERTICES,PYRAMID_EDGES,type PyramidConfiguration,type PyramidFace} from '../surfaces/pyramid.ts';
import type {SurfaceIdentity} from '../surfaces/contracts.ts';
import {createIndexedFloat32Authority,type IndexedPatchBlock} from './indexed-float32.ts';
export const PYRAMID_REPRESENTATION='canonical-square-triangle-lattice' as const;
export interface PyramidSampleAddress extends SurfaceIdentity{readonly patchId:PyramidFace;readonly row:number;readonly column:number}
export interface PyramidSampleKey extends SurfaceIdentity{readonly terrainId:string;readonly representation:typeof PYRAMID_REPRESENTATION;readonly representationVersion:1;readonly subdivisions:number;readonly baseWidthMeters:number;readonly heightMeters:number;readonly baseZMeters:number;readonly role:'exterior'|'interior';readonly index:number}
export function pyramidSampleCount(n:number){if(!Number.isInteger(n)||n<4||n>256)throw RangeError('Pyramid subdivisions must be an integer from 4 through 256.');return 3*n*n+2;}
/** Five vertices, eight edge interiors, four triangular interiors, one base.
 * All aliases resolve to ONE Float32 word, including the single apex. */
export function createPyramidTerrain(options:{terrainId:string;geometry:PyramidConfiguration;subdivisions:number;initialElevation?:number;elevationLimitMeters?:number;validateSample?:(index:number,height:number,before:number)=>void}){
 const n=options.subdivisions,count=pyramidSampleCount(n),geometry=createPyramidGeometry(options.geometry),identity=geometry.identity,{baseWidthMeters:w,heightMeters:h,baseZMeters:z,role}=geometry.metadata;
 if(typeof options.terrainId!=='string'||!options.terrainId.trim()||options.terrainId.length>128)throw RangeError('Pyramid terrain identity required.');
 const elevationLimit=options.elevationLimitMeters??Math.min(w,h)/8;if(!(elevationLimit>0)||!Number.isFinite(elevationLimit))throw RangeError('Positive pyramid elevation clearance required.');
 const authority=createIndexedFloat32Authority({count,initialElevation:options.initialElevation??-100,validateElevation:v=>{if(Math.abs(v)>elevationLimit)throw RangeError('Elevation exceeds pyramid clearance.');},validateSample:options.validateSample});
 const metadata=Object.freeze({terrainId:options.terrainId,identity,geometry:geometry.metadata,representation:Object.freeze({provider:PYRAMID_REPRESENTATION,version:1 as const,subdivisions:n,ownership:'vertices-edges-triangle-interiors-base-interior' as const}),elevationUnits:'meters' as const,seaLevel:0,elevationLimitMeters:elevationLimit});
 const triangleCount=(n-1)*(n-2)/2,interiorStart=5+8*(n-1);
 const keyAt=(index:number):PyramidSampleKey=>{if(!Number.isSafeInteger(index)||index<0||index>=count)throw RangeError('Invalid pyramid canonical index.');return{...identity,terrainId:metadata.terrainId,representation:PYRAMID_REPRESENTATION,representationVersion:1,subdivisions:n,baseWidthMeters:w,heightMeters:h,baseZMeters:z,role,index};};
 const checkedKey=(key:PyramidSampleKey)=>{const expected=keyAt(key.index);for(const k of Object.keys(expected) as (keyof PyramidSampleKey)[])if(key[k]!==expected[k])throw RangeError('Foreign pyramid canonical key.');return key.index;};
 const checkedAddress=(p:PyramidSampleAddress)=>{if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId||!PYRAMID_FACES.includes(p.patchId)||!Number.isInteger(p.row)||!Number.isInteger(p.column)||p.row<0||p.column<0||p.row>n||p.column>n||(p.patchId!=='base'&&p.row+p.column>n))throw RangeError('Invalid pyramid lattice address.');return p;};
 const resolve=(input:PyramidSampleAddress)=>{const p=checkedAddress(input),face=PYRAMID_FACES.indexOf(p.patchId),ids=PYRAMID_VERTICES[p.patchId],a=p.patchId==='base'?[(n-p.column)*(n-p.row)/n,p.column*(n-p.row)/n,p.column*p.row/n,(n-p.column)*p.row/n]:[n-p.column-p.row,p.column,p.row];
  const nonzero=a.flatMap((x,i)=>x?[{vertex:ids[i]!,weight:x}]:[]);if(nonzero.length===1)return keyAt(nonzero[0]!.vertex);
  if(nonzero.length===2){const pair=nonzero.map(x=>x.vertex).sort((a,b)=>a-b),edge=PYRAMID_EDGES.findIndex(e=>e[0]===pair[0]&&e[1]===pair[1]);if(edge<0)throw RangeError('Invalid pyramid boundary edge.');const t=nonzero.find(x=>x.vertex===pair[1])!.weight;return keyAt(5+edge*(n-1)+t-1);}
  const rank=p.patchId==='base'?(p.row-1)*(n-1)+p.column-1:(p.row-1)*(n-1)-(p.row-1)*p.row/2+p.column-1;return keyAt(interiorStart+(face===4?4*triangleCount:face*triangleCount)+rank);
 };
 const addressFromWeights=(face:PyramidFace,global:ReadonlyMap<number,number>)=>{const p=geometry.fromWeights(face,new Map([...global].map(([id,t])=>[id,t/n])));return p?{...identity,patchId:face,row:Math.round(p.v*n),column:Math.round(p.u*n)}:undefined;};
 const owner=(key:PyramidSampleKey):PyramidSampleAddress=>{const index=checkedKey(key);if(index<interiorStart){const weights=index<5?new Map([[index,n]]):(()=>{const edge=PYRAMID_EDGES[Math.floor((index-5)/(n-1))]!,t=(index-5)%(n-1)+1;return new Map([[edge[0],n-t],[edge[1],t]]);})();for(const face of PYRAMID_FACES){const p=addressFromWeights(face,weights);if(p)return p;}throw Error('Missing pyramid boundary owner.');}
  let offset=index-interiorStart;const face=Math.min(4,Math.floor(offset/triangleCount));if(face===4){offset-=4*triangleCount;return{...identity,patchId:'base',row:Math.floor(offset/(n-1))+1,column:offset%(n-1)+1};}offset-=face*triangleCount;let row=1;while(offset>=n-row-1){offset-=n-row-1;row++;}return{...identity,patchId:PYRAMID_FACES[face]!,row,column:offset+1};
 };
 const positionAt=(p:PyramidSampleAddress)=>{checkedAddress(p);return geometry.normalize({...identity,patchId:p.patchId,u:p.column/n,v:p.row/n});};
 const aliases=(key:PyramidSampleKey)=>geometry.aliases(positionAt(owner(key))).map(p=>({...identity,patchId:p.patchId,row:Math.round(p.v*n),column:Math.round(p.u*n)}));
 const neighbors=(key:PyramidSampleKey)=>{const values=new Map<number,PyramidSampleKey>();for(const p of aliases(key))for(const[dc,dr]of(p.patchId==='base'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]])){const column=p.column+dc!,row=p.row+dr!;if(column>=0&&row>=0&&column<=n&&row<=n&&(p.patchId==='base'||column+row<=n)){const other=resolve({...p,column,row});if(other.index!==key.index)values.set(other.index,other);}}return[...values.values()].sort((a,b)=>a.index-b.index);};
 return Object.freeze({geometry,metadata,subdivisions:n,sampleCount:count,elevationByteLength:authority.byteLength,minElevation:-elevationLimit,maxElevation:elevationLimit,keyAt,resolve,owner,positionAt,aliases,neighbors,
  referencePositionAt:(key:PyramidSampleKey)=>geometry.referencePosition(positionAt(owner(key))),get revision(){return authority.revision;},read:(key:PyramidSampleKey)=>authority.read(checkedKey(key)),write:(key:PyramidSampleKey,value:number)=>authority.write(checkedKey(key),value),commitPreparedPatch:(key:PyramidSampleKey,revision:number,blocks:readonly IndexedPatchBlock[])=>{checkedKey(key);return authority.commitPreparedPatch(revision,blocks);},copyElevations:authority.copyElevations,
  snapshot:()=>({metadata,revision:authority.revision,elevations:authority.copyElevations()}),*samples(){for(let i=0;i<count;i++)yield keyAt(i);},
 });
}
export type PyramidTerrain=ReturnType<typeof createPyramidTerrain>;
