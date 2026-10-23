import {polyhedronDisplayCapacity} from './polyhedron-display-policy.ts';
import {IndexedDisplayCache} from './indexed-display-cache.ts';
import type {PyramidTerrain} from '../terrain/pyramid.ts';
import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import {polyhedralDisplayColor} from './solid-cube-field.ts';
export interface PyramidFieldRect{readonly face:string;readonly left:number;readonly right:number;readonly top:number;readonly bottom:number}
/** Derived triangle/square field. Canonical words remain exclusively in the
 * accepted indexed authority. Face aliases are read-only texture addresses. */
export class PyramidDisplayCache<T extends PolyhedronTerrain=PyramidTerrain> extends IndexedDisplayCache<T>{
 readonly n:number;readonly side:number;readonly data:Float32Array;readonly indices:Uint32Array;readonly initialAtlas:ReadonlyMap<string,Uint8ClampedArray>;readonly atlasSize:number;
 initialAtlasRevision=-1;
 private heights:Float32Array;private locations:Uint32Array;
 private journal:{from:number;to:number;rects:PyramidFieldRect[]}[]=[];
 constructor(t:T){super(t,polyhedronDisplayCapacity(t),'Polyhedron interactive capacity exceeded.');this.heights=t.copyElevations();this.locations=new Uint32Array(t.sampleCount).fill(0xffffffff);this.n=t.subdivisions;this.side=this.n+1;this.data=new Float32Array(t.geometry.faces.length*this.side*this.side*4);this.indices=new Uint32Array(t.geometry.faces.length*this.side*this.side).fill(0xffffffff);this.atlasSize=2*this.n+1;this.initialAtlas=new Map(this.terrain.geometry.faces.map(face=>[face,new Uint8ClampedArray(this.atlasSize*this.atlasSize*4)]));}
 /** Owned numerical/display ArrayBuffers; Canvas/GPU allocations are reported separately. */
 get ownedArrayBufferBytes(){return super.byteLength+this.heights.byteLength+this.locations.byteLength+this.data.byteLength+this.indices.byteLength+[...this.initialAtlas.values()].reduce((sum,a)=>sum+a.byteLength,0);}
 private at(face:string,c:number,r:number){return this.terrain.geometry.faces.indexOf(face)*this.side*this.side+r*this.side+c;}
 private updateNode(face:string,c:number,r:number){const t=this.terrain,at=this.at(face,c,r),f=t.geometry.frame(face),current=this.heights[this.indices[at]!]!;let xx=0,xy=0,yy=0,hx=0,hy=0;
  for(const[dc,dr]of !this.terrain.geometry.isTriangle(face)?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]){const nc=c+dc!,nr=r+dr!;if(nc<0||nr<0||nc>this.n||nr>this.n||(this.terrain.geometry.isTriangle(face)&&nc+nr>this.n))continue;const du=dc!/this.n,dv=dr!/this.n,dx=du*Math.hypot(...f.u)+dv*(f.v[0]*f.e1[0]+f.v[1]*f.e1[1]+f.v[2]*f.e1[2]),dy=dv*(f.v[0]*f.e2[0]+f.v[1]*f.e2[1]+f.v[2]*f.e2[2]),dh=this.heights[this.indices[this.at(face,nc,nr)]!]!-current;xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;hx+=dx*dh;hy+=dy*dh;}
  const det=xx*yy-xy*xy;this.data[at*4]=current;this.data[at*4+1]=(hx*yy-hy*xy)/det;this.data[at*4+2]=(hy*xx-hx*xy)/det;this.data[at*4+3]=1;
 }
 override *prepare(){yield* super.prepare();const t=this.terrain;for(const face of this.terrain.geometry.faces)for(let r=0;r<=this.n;r++){for(let c=0;c<=(!this.terrain.geometry.isTriangle(face)?this.n:this.n-r);c++){const offset=this.at(face,c,r),index=t.resolve({...t.metadata.identity,patchId:face,column:c,row:r}).index;this.indices[offset]=index;if(this.locations[index]===0xffffffff)this.locations[index]=offset;}if(r%8===7)yield;}
  for(const face of this.terrain.geometry.faces)for(let r=0;r<=this.n;r++){for(let c=0;c<=(!this.terrain.geometry.isTriangle(face)?this.n:this.n-r);c++)this.updateNode(face,c,r);if(r%8===7)yield;}
  for(const face of this.terrain.geometry.faces){const target=this.initialAtlas.get(face)!;for(let row=0;row<this.atlasSize;row++){for(let col=0;col<this.atlasSize;col++){const u=col/(this.atlasSize-1),v=1-row/(this.atlasSize-1);if(this.terrain.geometry.isTriangle(face)&&u+v>1)continue;const color=this.color(face,u,v,true),offset=(row*this.atlasSize+col)*4;target.set([...color,255],offset);}if(row%8===7)yield;}}
  this.initialAtlasRevision=this.sourceRevision;
 }
 override apply(indices:Uint32Array,packed:Uint32Array,revision:number){const from=this.sourceRevision;super.apply(indices,packed,revision);this.updateIndices(indices,from,revision);}
 override refresh(input:Iterable<number>){const values=[...input],from=this.sourceRevision;super.refresh(values);this.updateIndices(values,from,this.sourceRevision);}
 private updateIndices(indices:Iterable<number>,from:number,to:number){const nodes=new Set<number>(),regions=new Map<string,PyramidFieldRect>();for(const index of indices){this.heights[index]=this.terrain.read(this.terrain.keyAt(index));}for(const index of indices){const offset=this.locations[index]!,face=this.terrain.geometry.faces[Math.floor(offset/(this.side*this.side))]!,local=offset%(this.side*this.side),addresses=index<this.terrain.geometry.vertices.length+this.terrain.geometry.edges.length*(this.n-1)?this.terrain.aliases(this.terrain.keyAt(index) as ReturnType<T['keyAt']>):[{patchId:face,row:Math.floor(local/this.side),column:local%this.side}];for(const p of addresses)for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const c=p.column+dc,r=p.row+dr;if(c<0||r<0||c>this.n||r>this.n||(this.terrain.geometry.isTriangle(p.patchId)&&c+r>this.n))continue;nodes.add(this.at(p.patchId,c,r));const old=regions.get(p.patchId);regions.set(p.patchId,{face:p.patchId,left:Math.min(old?.left??c,c),right:Math.max(old?.right??c,c),top:Math.min(old?.top??r,r),bottom:Math.max(old?.bottom??r,r)});}}
  for(const at of nodes){const face=this.terrain.geometry.faces[Math.floor(at/(this.side*this.side))]!,local=at%(this.side*this.side);this.updateNode(face,local%this.side,Math.floor(local/this.side));}if(this.journal.length===128)this.journal.shift();this.journal.push({from,to,rects:[...regions.values()]});
 }
 dirtySince(revision:number){const start=this.journal.findIndex(x=>x.from===revision);if(start<0||this.journal.at(-1)?.to!==this.sourceRevision)return;return this.journal.slice(start).flatMap(x=>x.rects);}
 sample(face:string,u:number,v:number){const n=this.n,x=Math.max(0,Math.min(n,u*n)),y=Math.max(0,Math.min(n,v*n)),c=Math.min(n-1,Math.floor(x)),r=Math.min(n-1,Math.floor(y)),a=x-c,b=y-r,at=this.at(face,c,r)*4;
  const channel=(k:number)=>{const d=this.data;if(this.terrain.geometry.isTriangle(face)&&c+r>=n-1){return d[at+k]!*(1-a-b)+d[at+4+k]!*a+d[at+this.side*4+k]!*b;}return(d[at+k]!*(1-a)+d[at+4+k]!*a)*(1-b)+(d[at+this.side*4+k]!*(1-a)+d[at+(this.side+1)*4+k]!*a)*b;};
  return{height:channel(0),du:channel(1),dv:channel(2)};
 }
 color(face:string,u:number,v:number,relief:boolean){const value=this.sample(face,u,v),f=this.terrain.geometry.frame(face);return polyhedralDisplayColor(f.normal,f.e1,f.e2,value.height,value.du,value.dv,relief,this.terrain.geometry.metadata.role==='interior'?-1:1);}
 override dispose(){super.dispose();this.data.fill(0);(this.initialAtlas as Map<string,Uint8ClampedArray>).clear();this.journal=[];}
}
