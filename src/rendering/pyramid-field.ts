import {PolygonColorAtlas} from './polygon-atlas.ts';
import {polyhedronDisplayCapacity} from './polyhedron-display-policy.ts';
import {IndexedDisplayCache} from './indexed-display-cache.ts';
import type {PyramidTerrain} from '../terrain/pyramid.ts';
import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import {polyhedralDisplayColor,polyhedralDisplayColorInto} from './solid-cube-field.ts';
import {pyramidDot,pyramidSub} from '../surfaces/pyramid.ts';
export interface PyramidFieldRect{readonly face:string;readonly left:number;readonly right:number;readonly top:number;readonly bottom:number}
/** Derived triangle/square field. Canonical words remain exclusively in the
 * accepted indexed authority. Face aliases are read-only texture addresses. */
export class PyramidDisplayCache<T extends PolyhedronTerrain=PyramidTerrain> extends IndexedDisplayCache<T>{
 readonly n:number;readonly side:number;readonly data:Float32Array;readonly indices:Uint32Array;readonly initialAtlas:ReadonlyMap<string,Uint8ClampedArray>;readonly atlasSize:number;
 readonly polygonAtlases:PolygonColorAtlas[]=[];
 initialAtlasRevision=-1;
 private heights:Float32Array;private locations:Uint32Array;
 private faceOffsets:ReadonlyMap<string,number>;
 private readonly cacheInteriorStencils:boolean;
 private interiorStencils=new Map<string,Float64Array>();
 private interiorStencilBytes=0;
 private polygonGradients=new Map<number,Float64Array>();private polygonGradientBytes=0;
 private journal:{from:number;to:number;rects:PyramidFieldRect[]}[]=[];
 constructor(t:T,options:{polygonColorsOnly?:boolean;cacheInteriorStencils?:boolean}={}){super(t,polyhedronDisplayCapacity(t),'Polyhedron interactive capacity exceeded.');this.cacheInteriorStencils=options.cacheInteriorStencils??false;this.heights=t.copyElevations();this.locations=new Uint32Array(t.sampleCount).fill(0xffffffff);this.n=t.subdivisions;this.side=this.n+1;this.faceOffsets=new Map(t.geometry.faces.map((face,i)=>[face,i*this.side*this.side]));this.data=new Float32Array(t.geometry.faces.length*this.side*this.side*4);this.indices=new Uint32Array(t.geometry.faces.length*this.side*this.side).fill(0xffffffff);this.atlasSize=2*this.n+1;this.initialAtlas=new Map((options.polygonColorsOnly?[]:this.terrain.geometry.faces).map(face=>[face,new Uint8ClampedArray(this.atlasSize*this.atlasSize*4)]));}
 /** Owned numerical/display ArrayBuffers; Canvas/GPU allocations are reported separately. */
 get ownedArrayBufferBytes(){return this.polygonAtlases.reduce((s,a)=>s+a.pixels.byteLength+a.gutterBounds.byteLength,0)+super.byteLength+this.heights.byteLength+this.locations.byteLength+this.data.byteLength+this.indices.byteLength+this.polygonGradientBytes+this.interiorStencilBytes+[...this.initialAtlas.values()].reduce((sum,a)=>sum+a.byteLength,0);}
 private at(face:string,c:number,r:number){return this.faceOffsets.get(face)!+r*this.side+c;}
 private updateNode(face:string,c:number,r:number){const t=this.terrain,at=this.at(face,c,r),f=t.geometry.frame(face),current=this.heights[this.indices[at]!]!;let xx=0,xy=0,yy=0,hx=0,hy=0;
  // A polygon's triangulation diagonal is not a geographic crease. Fit one
  // physical gradient using the welded stencil on both coplanar charts.
  if(t.geometry.physicalFaceId&&(c===0||r===0||c+r===this.n)){
   let stencil=this.polygonGradients.get(at);
   if(!stencil){const key=t.keyAt(this.indices[at]!) as ReturnType<T['keyAt']>,point=t.referencePositionAt(key),physical=t.geometry.gradientRegionId?.(face)??t.geometry.physicalFaceId(face),values:number[]=[];
    for(const neighbor of t.neighbors(key))if(t.aliases(neighbor).some(p=>(t.geometry.gradientRegionId?.(p.patchId)??t.geometry.physicalFaceId!(p.patchId))===physical)){
     const d=pyramidSub(t.referencePositionAt(neighbor),point),dx=pyramidDot(d,f.e1),dy=pyramidDot(d,f.e2);xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;values.push(neighbor.index,dx,dy);
    }
    stencil=Float64Array.from([xx,xy,yy,xx*yy-xy*xy,...values]);this.polygonGradients.set(at,stencil);this.polygonGradientBytes+=stencil.byteLength;
   }
   for(let i=4;i<stencil.length;i+=3){const dh=this.heights[stencil[i]!]!-current;hx+=stencil[i+1]!*dh;hy+=stencil[i+2]!*dh;}
   this.data[at*4]=current;this.data[at*4+1]=(hx*stencil[2]!-hy*stencil[1]!)/stencil[3]!;this.data[at*4+2]=(hy*stencil[0]!-hx*stencil[1]!)/stencil[3]!;this.data[at*4+3]=1;return;
  }
  // An interior triangle node has the same complete six-neighbor metric
  // stencil on every update. Cache immutable geometry only, in the identical
  // arithmetic order; heights and gradients always read the current field.
  // Default-disabled while new geometry qualifies this reuse independently.
  if(this.cacheInteriorStencils&&t.geometry.isTriangle(face)&&c>0&&r>0&&c+r<this.n){
   let stencil=this.interiorStencils.get(face);
   if(!stencil){const values:number[]=[];for(const[dc,dr]of[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]){const du=dc!/this.n,dv=dr!/this.n,dx=du*Math.hypot(...f.u)+dv*(f.v[0]*f.e1[0]+f.v[1]*f.e1[1]+f.v[2]*f.e1[2]),dy=dv*(f.v[0]*f.e2[0]+f.v[1]*f.e2[1]+f.v[2]*f.e2[2]);xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;values.push(dc!,dr!,dx,dy);}stencil=Float64Array.from([xx,xy,yy,...values]);this.interiorStencils.set(face,stencil);this.interiorStencilBytes+=stencil.byteLength;}
   xx=stencil[0]!;xy=stencil[1]!;yy=stencil[2]!;
   for(let i=3;i<stencil.length;i+=4){const dh=this.heights[this.indices[this.at(face,c+stencil[i]!,r+stencil[i+1]!)]!]!-current;hx+=stencil[i+2]!*dh;hy+=stencil[i+3]!*dh;}
   const det=xx*yy-xy*xy;this.data[at*4]=current;this.data[at*4+1]=(hx*yy-hy*xy)/det;this.data[at*4+2]=(hy*xx-hx*xy)/det;this.data[at*4+3]=1;return;
  }
  for(const[dc,dr]of !this.terrain.geometry.isTriangle(face)?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]){const nc=c+dc!,nr=r+dr!;if(nc<0||nr<0||nc>this.n||nr>this.n||(this.terrain.geometry.isTriangle(face)&&nc+nr>this.n))continue;const du=dc!/this.n,dv=dr!/this.n,dx=du*Math.hypot(...f.u)+dv*(f.v[0]*f.e1[0]+f.v[1]*f.e1[1]+f.v[2]*f.e1[2]),dy=dv*(f.v[0]*f.e2[0]+f.v[1]*f.e2[1]+f.v[2]*f.e2[2]),dh=this.heights[this.indices[this.at(face,nc,nr)]!]!-current;xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;hx+=dx*dh;hy+=dy*dh;}
  const det=xx*yy-xy*xy;this.data[at*4]=current;this.data[at*4+1]=(hx*yy-hy*xy)/det;this.data[at*4+2]=(hy*xx-hx*xy)/det;this.data[at*4+3]=1;
 }
 override *prepare(){yield* super.prepare();const t=this.terrain;for(const face of this.terrain.geometry.faces)for(let r=0;r<=this.n;r++){for(let c=0;c<=(!this.terrain.geometry.isTriangle(face)?this.n:this.n-r);c++){const offset=this.at(face,c,r),index=t.resolve({...t.metadata.identity,patchId:face,column:c,row:r}).index;this.indices[offset]=index;if(this.locations[index]===0xffffffff)this.locations[index]=offset;}if(r%8===7)yield;}
  for(const face of this.terrain.geometry.faces)for(let r=0;r<=this.n;r++){for(let c=0;c<=(!this.terrain.geometry.isTriangle(face)?this.n:this.n-r);c++)this.updateNode(face,c,r);if(r%8===7)yield;}
  for(const [face,target]of this.initialAtlas){for(let row=0;row<this.atlasSize;row++){for(let col=0;col<this.atlasSize;col++){const u=col/(this.atlasSize-1),v=1-row/(this.atlasSize-1);if(this.terrain.geometry.isTriangle(face)&&u+v>1)continue;const color=this.color(face,u,v,true),offset=(row*this.atlasSize+col)*4;target.set([...color,255],offset);}if(row%8===7)yield;}}
  if(this.terrain.geometry.physicalFaces)for(const polygon of this.terrain.geometry.physicalFaces){const atlas=new PolygonColorAtlas(this as unknown as PyramidDisplayCache<PolyhedronTerrain>,polygon);this.polygonAtlases.push(atlas);yield* atlas.prepare();}
  this.initialAtlasRevision=this.sourceRevision;
 }
 override apply(indices:Uint32Array,packed:Uint32Array,revision:number){const from=this.sourceRevision;super.apply(indices,packed,revision);this.updateIndices(indices,from,revision);}
 override refresh(input:Iterable<number>){const values=[...input],from=this.sourceRevision;super.refresh(values);this.updateIndices(values,from,this.sourceRevision);}
 private updateIndices(indices:Iterable<number>,from:number,to:number){const nodes=new Set<number>(),regions=new Map<string,PyramidFieldRect>();for(const index of indices){this.heights[index]=this.terrain.read(this.terrain.keyAt(index));}for(const index of indices){const offset=this.locations[index]!,face=this.terrain.geometry.faces[Math.floor(offset/(this.side*this.side))]!,local=offset%(this.side*this.side),addresses=index<this.terrain.geometry.vertices.length+this.terrain.geometry.edges.length*(this.n-1)?this.terrain.aliases(this.terrain.keyAt(index) as ReturnType<T['keyAt']>):[{patchId:face,row:Math.floor(local/this.side),column:local%this.side}];for(const p of addresses)for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const c=p.column+dc,r=p.row+dr;if(c<0||r<0||c>this.n||r>this.n||(this.terrain.geometry.isTriangle(p.patchId)&&c+r>this.n))continue;nodes.add(this.at(p.patchId,c,r));const old=regions.get(p.patchId);regions.set(p.patchId,{face:p.patchId,left:Math.min(old?.left??c,c),right:Math.max(old?.right??c,c),top:Math.min(old?.top??r,r),bottom:Math.max(old?.bottom??r,r)});}}
  if(this.terrain.geometry.physicalFaceId)for(const at of [...nodes]){const local=at%(this.side*this.side),c=local%this.side,r=Math.floor(local/this.side);if(c!==0&&r!==0&&c+r!==this.n)continue;for(const p of this.terrain.aliases(this.terrain.keyAt(this.indices[at]!) as ReturnType<T['keyAt']>)){nodes.add(this.at(p.patchId,p.column,p.row));const old=regions.get(p.patchId);regions.set(p.patchId,{face:p.patchId,left:Math.min(old?.left??p.column,p.column),right:Math.max(old?.right??p.column,p.column),top:Math.min(old?.top??p.row,p.row),bottom:Math.max(old?.bottom??p.row,p.row)});}}
  for(const at of nodes){const face=this.terrain.geometry.faces[Math.floor(at/(this.side*this.side))]!,local=at%(this.side*this.side);this.updateNode(face,local%this.side,Math.floor(local/this.side));}if(this.journal.length===128)this.journal.shift();this.journal.push({from,to,rects:[...regions.values()]});
 }
 dirtySince(revision:number){const start=this.journal.findIndex(x=>x.from===revision);if(start<0||this.journal.at(-1)?.to!==this.sourceRevision)return;return this.journal.slice(start).flatMap(x=>x.rects);}
 sample(face:string,u:number,v:number){const n=this.n,x=Math.max(0,Math.min(n,u*n)),y=Math.max(0,Math.min(n,v*n)),c=Math.min(n-1,Math.floor(x)),r=Math.min(n-1,Math.floor(y)),a=x-c,b=y-r,at=this.at(face,c,r)*4;
  const channel=(k:number)=>{const d=this.data;if(this.terrain.geometry.isTriangle(face)&&c+r>=n-1){return d[at+k]!*(1-a-b)+d[at+4+k]!*a+d[at+this.side*4+k]!*b;}return(d[at+k]!*(1-a)+d[at+4+k]!*a)*(1-b)+(d[at+this.side*4+k]!*(1-a)+d[at+(this.side+1)*4+k]!*a)*b;};
  return{height:channel(0),du:channel(1),dv:channel(2)};
 }
 /** Prepared allocation-free entry to the SAME indexed interpolation/color pass.
  * The closure retains immutable face geometry and the live derived field only. */
 colorSampler(face:string){const n=this.n,side=this.side,d=this.data,base=this.faceOffsets.get(face),f=this.terrain.geometry.frame(face),triangle=this.terrain.geometry.isTriangle(face),orientation=this.terrain.geometry.metadata.role==='interior'?-1:1;if(base===undefined)throw RangeError('Unknown field face.');return(u:number,v:number,relief:boolean,out:Float64Array)=>{const x=Math.max(0,Math.min(n,u*n)),y=Math.max(0,Math.min(n,v*n)),c=Math.min(n-1,Math.floor(x)),r=Math.min(n-1,Math.floor(y)),a=x-c,b=y-r,at=(base+r*side+c)*4;for(let k=0;k<3;k++)out[k]=triangle&&c+r>=n-1?d[at+k]!*(1-a-b)+d[at+4+k]!*a+d[at+side*4+k]!*b:(d[at+k]!*(1-a)+d[at+4+k]!*a)*(1-b)+(d[at+side*4+k]!*(1-a)+d[at+(side+1)*4+k]!*a)*b;polyhedralDisplayColorInto(f.normal,f.e1,f.e2,out[0]!,out[1]!,out[2]!,relief,orientation,out);};}
 color(face:string,u:number,v:number,relief:boolean){const value=this.sample(face,u,v),f=this.terrain.geometry.frame(face);return polyhedralDisplayColor(f.normal,f.e1,f.e2,value.height,value.du,value.dv,relief,this.terrain.geometry.metadata.role==='interior'?-1:1);}
 colorInto(face:string,u:number,v:number,relief:boolean,out:Float64Array){const value=this.sample(face,u,v),f=this.terrain.geometry.frame(face);polyhedralDisplayColorInto(f.normal,f.e1,f.e2,value.height,value.du,value.dv,relief,this.terrain.geometry.metadata.role==='interior'?-1:1,out);}
 override dispose(){super.dispose();this.data.fill(0);(this.initialAtlas as Map<string,Uint8ClampedArray>).clear();this.polygonAtlases.length=0;this.polygonGradients.clear();this.polygonGradientBytes=0;this.interiorStencils.clear();this.interiorStencilBytes=0;this.journal=[];}
}
