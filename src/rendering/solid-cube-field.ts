import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,solidCubeConnection,cubeDot,type CubeVector,type SolidCubeFace} from '../surfaces/solid-cube.ts';
import {createSolidCubeTerrain,type SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {elevationToColor,elevationColorInto} from './elevation-colors.ts';

export interface CubeDisplayField {readonly n:number;readonly sourceRevision:number;readonly data:Float32Array;readonly bytes:number;readonly sourceCells:number;readonly updates?:{readonly baseRevision:number;readonly rects:readonly {face:number;column:number;row:number;width:number;height:number}[]}}
export const CUBE_DISPLAY_LIMITS=Object.freeze({maxCells:256,coarseCells:16,maxFieldBytes:6*257**2*16,maxTextureBytes:6*257**2*16,maxCpuFacePixels:6*513**2,maxCanvasPixels:1_200_000});
export function assertCubeDisplayField(field:CubeDisplayField){if(!field||!Number.isSafeInteger(field.n)||field.n<2||field.n>256||!Number.isSafeInteger(field.sourceCells)||field.sourceCells<field.n||field.sourceCells>256||field.sourceCells%field.n||!Number.isSafeInteger(field.sourceRevision)||field.sourceRevision<0||!(field.data instanceof Float32Array)||!(field.data.buffer instanceof ArrayBuffer)||field.data.length!==6*(field.n+1)**2*4||field.bytes!==field.data.byteLength||field.bytes>CUBE_DISPLAY_LIMITS.maxFieldBytes)throw RangeError('Invalid or oversized cube display field');}
/** Normal tasks, never a high-priority microtask spin. */
export function cubeTaskYield():Promise<void>{
 if(typeof setImmediate==='function')return new Promise(r=>setImmediate(r));
 return new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();c.port2.close();r();};c.port2.postMessage(0);});
}
/** Synthetic demonstration only. One globally continuous function of reference XYZ. */
export function cubeDemoElevation([x,y,z]:CubeVector){
 const wave=1050*Math.sin(2.7*x+.7*z)+850*Math.cos(2.4*y-1.2*z)+650*Math.sin(2.8*z+x)-650;
 const ridge=3600*Math.exp(-((y-.32*x-.1)**2)/.014)*(0.58+.42*Math.cos(2.1*z))*(.78+.22*Math.sin(24*x+17*z)*Math.cos(19*y-11*z));
 const valley=950*Math.exp(-((z+.28*y-.22)**2)/.012)*Math.exp(-((x-.3)**2)/1.3);
 return Math.max(-2700,Math.min(4800,wave+ridge-valley));
}
export async function createCubeDemonstration(n:128|256,yieldWork=cubeTaskYield,alive=()=>true){
 if(n!==128&&n!==256)throw RangeError('Demonstration supports N128/N256');
 const terrain=createSolidCubeTerrain({terrainId:`cube-d1-demonstration-${n}`,cellsPerEdge:n,geometry:{identity:{worldId:'cube-d1-demonstration',surfaceId:'exterior'},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1_000_000}});
 for(let i=0;i<terrain.sampleCount;i++){
  const key=terrain.keyAt(i),a=terrain.owner(key),f=SOLID_CUBE_FRAMES[a.patchId],u=2*a.column/n-1,v=2*a.row/n-1;
  terrain.write(key,cubeDemoElevation(f.normal.map((q,k)=>q+u*f.u[k]!+v*f.v[k]!) as unknown as CubeVector));
  if(i%2048===2047){await yieldWork();if(!alive())throw Error('Cube demonstration disposed');}
 }return terrain;
}
/** Connected one-cell stencil. At a corner each face keeps its own folded tangent axes. */
export function cubeNeighborAddress(face:SolidCubeFace,c:number,r:number,dc:number,dr:number,n:number){
 let column=c+dc,row=r+dr;if(column>=0&&column<=n&&row>=0&&row<=n)return{face,column,row};
 const edge=column<0?'u-min':column>n?'u-max':row<0?'v-min':'v-max',connection=solidCubeConnection(face,edge);
 const sourceAlong=edge.startsWith('u')?r:c,along=connection.reversed?n-sourceAlong:sourceAlong,fixed=connection.toEdge.endsWith('min')?1:n-1;
 column=connection.toEdge.startsWith('u')?fixed:along;row=connection.toEdge.startsWith('v')?fixed:along;
 return{face:connection.toFace,column,row};
}
export async function prepareCubeDisplayField(terrain:SolidCubeTerrain,n=terrain.metadata.representation.cellsPerEdge,yieldWork=cubeTaskYield,alive=()=>true):Promise<CubeDisplayField>{
 const sourceN=terrain.metadata.representation.cellsPerEdge,revision=terrain.revision;
 if(!Number.isSafeInteger(n)||n<2||n>sourceN||sourceN%n)throw RangeError('Cube display grid must divide the source grid');
 const source=terrain.copyElevations(),side=n+1,data=new Float32Array(6*side*side*4),step=sourceN/n,distance=terrain.sampleSpacingMeters;
 const guard=()=>{if(!alive()||terrain.revision!==revision)throw Error('Cube display preparation source changed or was disposed');};guard();
 // Full grid uses a temporary exact authority resolver table; never retained as geography.
 let indices:Uint32Array|undefined;
 const offset=(face:SolidCubeFace,c:number,r:number)=>SOLID_CUBE_FACES.indexOf(face)*(sourceN+1)**2+r*(sourceN+1)+c;
 const resolve=(face:SolidCubeFace,c:number,r:number)=>terrain.resolve({...terrain.metadata.identity,patchId:face,column:c,row:r}).index;
 if(n===sourceN){indices=new Uint32Array(6*(sourceN+1)**2);for(const face of SOLID_CUBE_FACES)for(let r=0;r<=sourceN;r++){
  for(let c=0;c<=sourceN;c++)indices[offset(face,c,r)]=resolve(face,c,r);
  if(r%4===3){await yieldWork();guard();}
 }}
 const height=(face:SolidCubeFace,c:number,r:number)=>source[indices?indices[offset(face,c,r)]!:resolve(face,c,r)]!;
 for(const [fi,face]of SOLID_CUBE_FACES.entries())for(let row=0;row<=n;row++){
  for(let col=0;col<=n;col++){
   const c=col*step,r=row*step,at=(fi*side*side+row*side+col)*4;
   data[at]=height(face,c,r);
   const neighbor=(dc:number,dr:number)=>{const a=cubeNeighborAddress(face,c,r,dc,dr,sourceN);return height(a.face,a.column,a.row);};
   data[at+1]=(neighbor(1,0)-neighbor(-1,0))/(2*distance);data[at+2]=(neighbor(0,1)-neighbor(0,-1))/(2*distance);data[at+3]=1;
   if(!Number.isFinite(data[at+1])||!Number.isFinite(data[at+2]))throw RangeError('Physical gradients exceed Float32 rendering range; canonical terrain retained');
  }if(row%4===3){await yieldWork();guard();}
 }guard();return Object.freeze({n,sourceRevision:revision,data,bytes:data.byteLength,sourceCells:sourceN});
}
/** Bilinear numerical elevation/gradient reconstruction, followed by palette and relief. */
export function cubeDisplaySample(field:CubeDisplayField,face:SolidCubeFace,u:number,v:number){
 const s=field.n+1,x=Math.max(0,Math.min(field.n,(u+1)*.5*field.n)),y=Math.max(0,Math.min(field.n,(v+1)*.5*field.n)),c=Math.min(field.n-1,Math.floor(x)),r=Math.min(field.n-1,Math.floor(y)),a=x-c,b=y-r,base=(SOLID_CUBE_FACES.indexOf(face)*s*s+r*s+c)*4;
 const q=(channel:number)=>{const d=field.data;return(d[base+channel]!*(1-a)+d[base+4+channel]!*a)*(1-b)+(d[base+s*4+channel]!*(1-a)+d[base+(s+1)*4+channel]!*a)*b;};
 return{height:q(0),du:q(1),dv:q(2)};
}
const light:CubeVector=[-.38,-.48,.78];
export function cubeDisplayColor(face:SolidCubeFace,height:number,du:number,dv:number,relief=true,orientation:1|-1=1){
 const f=SOLID_CUBE_FRAMES[face];return polyhedralDisplayColor(f.normal,f.u,f.v,height,du,dv,relief,orientation);
}
/** Accepted cube palette and oriented physical-slope relief, with a real face
 * frame supplied by a polyhedral geometry adapter. Cube callers are unchanged. */
export function polyhedralDisplayColor(n:CubeVector,u:CubeVector,v:CubeVector,height:number,du:number,dv:number,relief=true,orientation:1|-1=1){
 const rgb=elevationToColor(height,0),factor=height>0&&relief?6:0;
 const normal=n.map((value,i)=>orientation*value-factor*(du*u[i]!+dv*v[i]!)) as unknown as CubeVector;
 const shade=Math.max(.58,Math.min(1.16,.88+.30*cubeDot(normal,light)/Math.hypot(...normal)));
 return rgb.map(v=>Math.max(0,Math.min(255,Math.round(v*shade)))) as unknown as readonly[number,number,number];
}
/** Identical accepted palette, physical normal and rounding, with caller-owned
 * output for dirty atlas rectangles. No per-pixel color/normal arrays. */
export function polyhedralDisplayColorInto(n:CubeVector,u:CubeVector,v:CubeVector,height:number,du:number,dv:number,relief:boolean,orientation:1|-1,out:Float64Array){
 elevationColorInto(height,0,out);const factor=height>0&&relief?6:0,x=orientation*n[0]-factor*(du*u[0]+dv*v[0]),y=orientation*n[1]-factor*(du*u[1]+dv*v[1]),z=orientation*n[2]-factor*(du*u[2]+dv*v[2]),shade=Math.max(.58,Math.min(1.16,.88+.30*(x*light[0]+y*light[1]+z*light[2])/Math.hypot(x,y,z)));
 for(let i=0;i<3;i++)out[i]=Math.max(0,Math.min(255,Math.round(out[i]!*shade)));
}
