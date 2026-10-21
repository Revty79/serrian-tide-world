import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {SOLID_CUBE_FACES} from '../surfaces/solid-cube.ts';
import {cubeNeighborAddress,cubeTaskYield,type CubeDisplayField} from './solid-cube-field.ts';
import type {CubePublication} from '../editor/solid-cube-history.ts';

/** Geometry-only resolver retained by an editor renderer. Geography remains canonical.
 * A full-resolution epoch is published only after all derived values are ready. */
export class CubeEditorField {
 private indices?:Uint32Array;
 private dependencyOffsets?:Uint32Array;private dependencyNodes?:Uint32Array;
 private previousSource?:Uint32Array;private previousData?:Float32Array;private previousRevision=-1;
 private queuedRevision=-1;private pendingWords=new Map<number,number>();private fullRequested=false;
 private readonly word=new DataView(new ArrayBuffer(4));
 readonly statistics={fullRefreshes:0,incrementalRefreshes:0,canonicalWordsRead:0,preparedNodes:0,fieldCopyBytes:0,stencilBytes:0,maxSliceMs:0};
 /** Called only AFTER canonical publication and history promotion. Capture values
  * now so later numerical commits cannot change an in-flight display epoch. */
 queue(terrain:SolidCubeTerrain,publication:CubePublication){
  if(publication.revision!==terrain.revision||publication.sourceRevision!==this.queuedRevision||publication.kind==='all'){
   this.fullRequested=true;this.pendingWords.clear();this.queuedRevision=terrain.revision;return;
  }
  for(const index of publication.indices){this.word.setFloat32(0,terrain.read(terrain.keyAt(index)),true);this.pendingWords.set(index,this.word.getUint32(0,true));this.statistics.canonicalWordsRead++;}
  this.queuedRevision=publication.revision;
 }
 async refresh(terrain:SolidCubeTerrain,alive:()=>boolean):Promise<CubeDisplayField>{
  try{return await this.prepare(terrain,alive);}catch(error){this.fullRequested=true;throw error;}
 }
 private async prepare(terrain:SolidCubeTerrain,alive:()=>boolean):Promise<CubeDisplayField>{
  const n=terrain.metadata.representation.cellsPerEdge,s=n+1;
  const guard=()=>{if(!alive())throw Error('Cube display closed');};
  const offset=(fi:number,c:number,r:number)=>fi*s*s+r*s+c;
  if(!this.indices){
   const indices=new Uint32Array(6*s*s);
   for(const [fi,face] of SOLID_CUBE_FACES.entries())for(let r=0;r<=n;r++){
    for(let c=0;c<=n;c++)indices[offset(fi,c,r)]=terrain.resolve({...terrain.metadata.identity,patchId:face,column:c,row:r}).index;
    if(r%8===7){await cubeTaskYield();guard();}
   }guard();this.indices=indices;
  }
  if(!this.dependencyOffsets){
   // Invert the ACTUAL accepted height/gradient stencils once. Subsequent local
   // publications need no repeated topology/alias discovery. Geometry only.
   const offsets=new Uint32Array(terrain.sampleCount+1),indices=this.indices;
   const visit=async(add:(canonical:number,node:number)=>void)=>{
    for(const[fi,face]of SOLID_CUBE_FACES.entries())for(let r=0;r<=n;r++){
     for(let c=0;c<=n;c++){
      const node=offset(fi,c,r),neighbor=(dc:number,dr:number)=>{if(c+dc>=0&&c+dc<=n&&r+dr>=0&&r+dr<=n)return indices[offset(fi,c+dc,r+dr)]!;const a=cubeNeighborAddress(face,c,r,dc,dr,n);return indices[offset(SOLID_CUBE_FACES.indexOf(a.face),a.column,a.row)]!;};
      add(indices[node]!,node);add(neighbor(1,0),node);add(neighbor(-1,0),node);add(neighbor(0,1),node);add(neighbor(0,-1),node);
     }if(r%8===7){await cubeTaskYield();guard();}
    }
   };
   await visit(index=>{offsets[index+1]=offsets[index+1]!+1;});for(let i=1;i<offsets.length;i++)offsets[i]=offsets[i]!+offsets[i-1]!;
   const nodes=new Uint32Array(offsets.at(-1)!),cursor=offsets.slice(0,-1);await visit((index,node)=>{const at=cursor[index]!;nodes[at]=node;cursor[index]=at+1;});guard();
   this.dependencyOffsets=offsets;this.dependencyNodes=nodes;this.statistics.stencilBytes=offsets.byteLength+nodes.byteLength;
  }
  const full=!this.previousSource||!this.previousData||this.fullRequested||this.queuedRevision!==terrain.revision;
  const revision=terrain.revision,changes=this.pendingWords;this.pendingWords=new Map();this.fullRequested=false;
  let words:Uint32Array;const affected=new Set<number>();let sliceAt=performance.now(),count=0;
  if(full){words=new Uint32Array(terrain.copyElevations().buffer);this.queuedRevision=revision;this.statistics.fullRefreshes++;this.statistics.canonicalWordsRead+=terrain.sampleCount;}
  else{
   words=this.previousSource!;for(const[index,value]of changes)words[index]=value;
   for(const index of changes.keys()){
    // Every face alias and gradient that reads this canonical word is included.
    for(let at=this.dependencyOffsets[index]!;at<this.dependencyOffsets[index+1]!;at++)affected.add(this.dependencyNodes![at]!);
    if(++count%64===0&&performance.now()-sliceAt>=4){this.statistics.maxSliceMs=Math.max(this.statistics.maxSliceMs,performance.now()-sliceAt);await cubeTaskYield();guard();sliceAt=performance.now();}
   }this.statistics.incrementalRefreshes++;
  }
  const source=new Float32Array(words.buffer),indices=this.indices,data=this.previousData?.slice()??new Float32Array(6*s*s*4),distance=2*terrain.sampleSpacingMeters;
  this.statistics.fieldCopyBytes+=data.byteLength;
  const bounds=SOLID_CUBE_FACES.map(()=>({left:s,top:s,right:-1,bottom:-1}));
  const nodes=full?(function*(){for(let i=0;i<6*s*s;i++)yield i;})():affected.values();
  count=0;
  for(const index of nodes){
   const fi=Math.floor(index/(s*s)),face=SOLID_CUBE_FACES[fi]!,r=Math.floor(index/s)%s,c=index%s,at=index*4;
   const neighbor=(dc:number,dr:number)=>{if(c+dc>=0&&c+dc<=n&&r+dr>=0&&r+dr<=n)return indices[offset(fi,c+dc,r+dr)]!;const a=cubeNeighborAddress(face,c,r,dc,dr,n);return indices[offset(SOLID_CUBE_FACES.indexOf(a.face),a.column,a.row)]!;};
   const a=c<n?indices[index+1]!:neighbor(1,0),b=c>0?indices[index-1]!:neighbor(-1,0),d=r<n?indices[index+s]!:neighbor(0,1),e=r>0?indices[index-s]!:neighbor(0,-1);
   data[at]=source[indices[index]!]!;data[at+1]=(source[a]!-source[b]!)/distance;data[at+2]=(source[d]!-source[e]!)/distance;data[at+3]=1;
   if(!Number.isFinite(data[at+1])||!Number.isFinite(data[at+2]))throw RangeError('Relief exceeds display range; terrain preserved');
   if(!this.previousData||!Object.is(data[at],this.previousData[at])||!Object.is(data[at+1],this.previousData[at+1])||!Object.is(data[at+2],this.previousData[at+2])){const rect=bounds[fi]!;rect.left=Math.min(rect.left,c);rect.right=Math.max(rect.right,c);rect.top=Math.min(rect.top,r);rect.bottom=Math.max(rect.bottom,r);}
   this.statistics.preparedNodes++;
   if(++count%256===0&&performance.now()-sliceAt>=4){this.statistics.maxSliceMs=Math.max(this.statistics.maxSliceMs,performance.now()-sliceAt);await cubeTaskYield();guard();sliceAt=performance.now();}
  }
  this.statistics.maxSliceMs=Math.max(this.statistics.maxSliceMs,performance.now()-sliceAt);
  const rects=bounds.flatMap((r,face)=>r.right<r.left?[]:[{face,column:r.left,row:r.top,width:r.right-r.left+1,height:r.bottom-r.top+1}]);
  guard();const updates=this.previousData?{baseRevision:this.previousRevision,rects}:undefined;this.previousSource=words;this.previousData=data;this.previousRevision=revision;
  return Object.freeze({n,sourceRevision:revision,sourceCells:n,data,bytes:data.byteLength,updates});
 }
}
