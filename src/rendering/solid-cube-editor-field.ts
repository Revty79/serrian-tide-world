import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {SOLID_CUBE_FACES} from '../surfaces/solid-cube.ts';
import {cubeNeighborAddress,cubeTaskYield,type CubeDisplayField} from './solid-cube-field.ts';

/** Geometry-only resolver retained by an editor renderer. Geography remains canonical.
 * A full-resolution epoch is published only after all derived values are ready. */
export class CubeEditorField {
 private indices?:Uint32Array;
 private previousSource?:Uint32Array;private previousData?:Float32Array;private previousRevision=-1;
 async refresh(terrain:SolidCubeTerrain,alive:()=>boolean):Promise<CubeDisplayField>{
  const n=terrain.metadata.representation.cellsPerEdge,s=n+1,revision=terrain.revision;
  const guard=()=>{if(!alive()||terrain.revision!==revision)throw Error('Cube display source changed or closed');};
  const offset=(fi:number,c:number,r:number)=>fi*s*s+r*s+c;
  if(!this.indices){
   const indices=new Uint32Array(6*s*s);
   for(const [fi,face] of SOLID_CUBE_FACES.entries())for(let r=0;r<=n;r++){
    for(let c=0;c<=n;c++)indices[offset(fi,c,r)]=terrain.resolve({...terrain.metadata.identity,patchId:face,column:c,row:r}).index;
    if(r%8===7){await cubeTaskYield();guard();}
   }guard();this.indices=indices;
  }
  const source=terrain.copyElevations(),words=new Uint32Array(source.buffer),changed=new Uint8Array(source.length),indices=this.indices,data=this.previousData?.slice()??new Float32Array(6*s*s*4),distance=2*terrain.sampleSpacingMeters;
  for(let i=0;i<source.length;i++)changed[i]=!this.previousSource||words[i]!==this.previousSource[i]?1:0;
  const rects:{face:number;column:number;row:number;width:number;height:number}[]=[];
  for(const [fi,face] of SOLID_CUBE_FACES.entries())for(let r=0;r<=n;r++){
   for(let c=0;c<=n;c++){
    const index=offset(fi,c,r),at=index*4;
    const neighbor=(dc:number,dr:number)=>{if(c+dc>=0&&c+dc<=n&&r+dr>=0&&r+dr<=n)return indices[offset(fi,c+dc,r+dr)]!;
     const a=cubeNeighborAddress(face,c,r,dc,dr,n);return indices[offset(SOLID_CUBE_FACES.indexOf(a.face),a.column,a.row)]!;};
    const a=c<n?indices[index+1]!:neighbor(1,0),b=c>0?indices[index-1]!:neighbor(-1,0),d=r<n?indices[index+s]!:neighbor(0,1),e=r>0?indices[index-s]!:neighbor(0,-1),center=indices[index]!;
    if(!changed[center]&&!changed[a]&&!changed[b]&&!changed[d]&&!changed[e])continue;
    data[at]=source[center]!;data[at+1]=(source[a]!-source[b]!)/distance;data[at+2]=(source[d]!-source[e]!)/distance;data[at+3]=1;
    if(!Number.isFinite(data[at+1])||!Number.isFinite(data[at+2]))throw RangeError('Relief exceeds display range; terrain preserved');
   }if(r%16===15){await cubeTaskYield();guard();}
  }
  if(this.previousData)for(let fi=0;fi<6;fi++){let left=s,top=s,right=-1,bottom=-1;for(let r=0;r<s;r++)for(let c=0;c<s;c++){const at=offset(fi,c,r)*4;if(!Object.is(data[at],this.previousData[at])||!Object.is(data[at+1],this.previousData[at+1])||!Object.is(data[at+2],this.previousData[at+2])){left=Math.min(left,c);right=Math.max(right,c);top=Math.min(top,r);bottom=Math.max(bottom,r);}}if(right>=left)rects.push({face:fi,column:left,row:top,width:right-left+1,height:bottom-top+1});}
  guard();const updates=this.previousData?{baseRevision:this.previousRevision,rects}:undefined;this.previousSource=words;this.previousData=data;this.previousRevision=revision;
  return Object.freeze({n,sourceRevision:revision,sourceCells:n,data,bytes:data.byteLength,updates});
 }
}
