import { CUBE_FACES, FACE_BASES, QUARTER_PI, dot3, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain,SphericalSampleAddress } from '../terrain/spherical.ts';
import type { SphericalDisplayCache } from './spherical-raster.ts';
import { elevationColorInto } from './elevation-colors.ts';

export type SphereAppearance = 'elevation' | 'relief';
export const SPHERE_RELIEF_EXAGGERATION = 5;
export interface SphereFieldRegion { face: CubeFace; left: number; top: number; right: number; bottom: number }
export interface SphereFieldSnapshot { readonly n: number; readonly data: Readonly<Record<CubeFace,Float32Array>>; readonly sourceRevision: number; readonly heightScale: number }
const LIGHT: Vec3 = [-.6,-.6,.5291502622129182];
const clampSlope = (v:number) => Math.max(-1e6,Math.min(1e6,v));

/** Derived display fields. Every edge/corner alias reads the same canonical
 * height and the same world-tangent gradient. This class can never write terrain. */
export class SphericalElevationField implements SphereFieldSnapshot {
 readonly n:number;
 readonly data:Record<CubeFace,Float32Array>;
 readonly indices:Record<CubeFace,Uint32Array>;
 /** Immutable numerical-geometry directions; also used for cheap exact host visibility checks. */
 readonly directions:Float64Array;
 private readonly back:Record<CubeFace,Float32Array>;
 private source:Float32Array;
 private readonly terrain:SphericalTerrain;
 private readonly tangents:Float64Array;
 private indexBytes=0;
 private missing:CubeFace[]=[];
 sourceRevision=-1;
 previousRevision=-1;
 regions:SphereFieldRegion[]=[];
 heightScale=1;
 building=false;
 sourceCopies=0;
 private retainRegions=false;
 private backSynchronized=false;
 private aliasCache=new Map<number,readonly SphericalSampleAddress[]>();
 private aliases(index:number){if(!this.retainRegions)return this.terrain.aliases(this.terrain.keyAt(index));const found=this.aliasCache.get(index);if(found)return found;const result=this.terrain.aliases(this.terrain.keyAt(index));if(this.aliasCache.size===8192)this.aliasCache.delete(this.aliasCache.keys().next().value!);this.aliasCache.set(index,result);return result;}
 private regionJournal:{from:number;to:number;regions:SphereFieldRegion[]}[]=[];
 /** Optional bounded dirty history for geometry adapters that retain a current
  * sharp Canvas image. No elevation arrays or historical display fields. */
 enableRegionHistory(){this.retainRegions=true;}
 regionsSince(revision:number):SphereFieldRegion[]|undefined{
  if(revision===this.sourceRevision)return[];const start=this.regionJournal.findIndex(e=>e.from===revision);if(start<0)return;const merged=new Map<CubeFace,SphereFieldRegion>();let expected=revision;
  for(const e of this.regionJournal.slice(start)){if(e.from!==expected)return;expected=e.to;for(const r of e.regions){const old=merged.get(r.face);merged.set(r.face,old?{face:r.face,left:Math.min(old.left,r.left),right:Math.max(old.right,r.right),top:Math.min(old.top,r.top),bottom:Math.max(old.bottom,r.bottom)}:{...r});}}
  return expected===this.sourceRevision?[...merged.values()]:undefined;
 }
 constructor(terrain:SphericalTerrain,cache:SphericalDisplayCache) {
  this.terrain=terrain;this.n=terrain.metadata.representation.cellsPerEdge;this.source=new Float32Array(0);
  this.directions=new Float64Array(terrain.sampleCount*3);
  const side=this.n+1;
  this.indices=Object.fromEntries(CUBE_FACES.map(face=>{const map=cache.faces[face].sampleIndices;if(!map){this.missing.push(face);this.indexBytes+=side*side*4;}return[face,map??new Uint32Array(side*side)];})) as Record<CubeFace,Uint32Array>;
  this.data=Object.fromEntries(CUBE_FACES.map(face=>[face,new Float32Array(side*side*4)])) as Record<CubeFace,Float32Array>;
  this.back=Object.fromEntries(CUBE_FACES.map(face=>[face,new Float32Array(side*side*4)])) as Record<CubeFace,Float32Array>;
  this.tangents=Float64Array.from({length:side},(_,i)=>Math.tan((2*i/this.n-1)*QUARTER_PI));
 }
 get byteLength(){return this.indexBytes+this.source.byteLength+this.directions.byteLength+CUBE_FACES.reduce((sum,f)=>sum+this.data[f].byteLength+this.back[f].byteLength,0)+this.tangents.byteLength;}
 private gradient(index:number,values:Float32Array):Vec3 {
  const t=this.terrain,n=this.n,side=n+1,r=t.metadata.geometry.radiusMeters,aliases=this.aliases(index);let gx=0,gy=0,gz=0;
  for(const a of aliases){
   const c=a.column,row=a.row,map=this.indices[a.patchId],basis=FACE_BASES[a.patchId],u=this.tangents[c]!,v=this.tangents[row]!,length=Math.hypot(1,u,v);
   // Scalar Jacobian evaluation avoids allocating several vectors per dirty
   // sample. This field is display-only; canonical brush arithmetic is separate.
   const dx=(basis.normal[0]+u*basis.u[0]+v*basis.v[0])/length,dy=(basis.normal[1]+u*basis.u[1]+v*basis.v[1])/length,dz=(basis.normal[2]+u*basis.u[2]+v*basis.v[2])/length;
   const dotU=dx*basis.u[0]+dy*basis.u[1]+dz*basis.u[2],dotV=dx*basis.v[0]+dy*basis.v[1]+dz*basis.v[2],scaleU=(1+u*u)/length,scaleV=(1+v*v)/length;
   const ux=(basis.u[0]-dx*dotU)*scaleU,uy=(basis.u[1]-dy*dotU)*scaleU,uz=(basis.u[2]-dz*dotU)*scaleU,vx=(basis.v[0]-dx*dotV)*scaleV,vy=(basis.v[1]-dy*dotV)*scaleV,vz=(basis.v[2]-dz*dotV)*scaleV;
   const left=Math.max(0,c-1),right=Math.min(n,c+1),top=Math.max(0,row-1),bottom=Math.min(n,row+1);
   const hu=(values[map[row*side+right]!]!-values[map[row*side+left]!]!)/((right-left)*2*QUARTER_PI/n);
   const hv=(values[map[bottom*side+c]!]!-values[map[top*side+c]!]!)/((bottom-top)*2*QUARTER_PI/n);
   const aa=ux*ux+uy*uy+uz*uz,ab=ux*vx+uy*vy+uz*vz,bb=vx*vx+vy*vy+vz*vz,denominator=aa*bb-ab*ab;
   const x=clampSlope(((bb*hu-ab*hv)/denominator)/r),y=clampSlope(((aa*hv-ab*hu)/denominator)/r);
   gx+=x*ux+y*vx;gy+=x*uy+y*vy;gz+=x*uz+y*vz;
  }
  return[clampSlope(gx/aliases.length),clampSlope(gy/aliases.length),clampSlope(gz/aliases.length)];
 }
 /** A short-lived exact source epoch; the published face fields stay coherent
  * until the complete derived patch is ready. Yield points bound display work. */
 *prepare(changed:Iterable<number>|'all'):Generator<void,SphereFieldRegion[]> {
  if(this.building)throw Error('A spherical display epoch is already being prepared.');this.building=true;
  try{
   const t=this.terrain,target=t.revision,values=t.copyElevations(),side=this.n+1;this.sourceCopies++;
   for(const face of this.missing)for(let row=0;row<=this.n;row++){for(let column=0;column<=this.n;column++)this.indices[face][row*side+column]=t.resolve({...t.metadata.identity,patchId:face,column,row}).index;yield;}
   this.missing=[];
   const all=changed==='all'||this.sourceRevision<0,dirty=new Set<number>();let work=0;
   if(!all)for(const index of changed){dirty.add(index);if(this.retainRegions){for(const a of this.aliases(index)){const map=this.indices[a.patchId],c=a.column,r=a.row;if(c>0)dirty.add(map[r*side+c-1]!);if(c<this.n)dirty.add(map[r*side+c+1]!);if(r>0)dirty.add(map[(r-1)*side+c]!);if(r<this.n)dirty.add(map[(r+1)*side+c]!);}}else for(const k of t.neighbors(t.keyAt(index),'edges'))dirty.add(k.index);if(++work%64===0)yield;}
   if(!all&&!(this.retainRegions&&this.backSynchronized))for(const face of CUBE_FACES)this.back[face].set(this.data[face]);
   this.backSynchronized=false;
   const keys=all?function*(){for(let i=0;i<t.sampleCount;i++)yield i;}():dirty.values();let at=0,max=this.heightScale;
   const regions=new Map<CubeFace,SphereFieldRegion>();
   for(const index of keys){if(this.sourceRevision<0)this.directions.set(t.directionAt(t.keyAt(index)),index*3);const gradient=this.gradient(index,values),height=values[index]!;max=Math.max(max,Math.abs(height));
    for(const a of this.aliases(index)){const data=this.back[a.patchId],offset=(a.row*side+a.column)*4;data[offset]=height;data[offset+1]=gradient[0];data[offset+2]=gradient[1];data[offset+3]=gradient[2];const old=regions.get(a.patchId);regions.set(a.patchId,{face:a.patchId,left:Math.min(a.column,old?.left??a.column),right:Math.max(a.column,old?.right??a.column),top:Math.min(a.row,old?.top??a.row),bottom:Math.max(a.row,old?.bottom??a.row)});}
    if(++at%64===0)yield;
   }
   // Six reference swaps publish one coherent display epoch, never geography.
   for(const face of CUBE_FACES){const old=this.data[face];this.data[face]=this.back[face];this.back[face]=old;}
   // Rounded Crescent retains coherent banks by copying only changed rows
   // after publication. Native Sphere keeps its established full-bank copy.
   // A cancelled/failed preparation leaves backSynchronized false.
   if(this.retainRegions){for(const r of regions.values())for(let row=r.top;row<=r.bottom;row++){const start=(row*side+r.left)*4,end=(row*side+r.right+1)*4;this.back[r.face].set(this.data[r.face].subarray(start,end),start);}this.backSynchronized=true;}
   this.source=values;this.heightScale=max;this.previousRevision=this.sourceRevision;this.sourceRevision=target;this.regions=[...regions.values()];if(this.retainRegions&&this.previousRevision>=0){if(this.regionJournal.length===128)this.regionJournal.shift();this.regionJournal.push({from:this.previousRevision,to:target,regions:this.regions.map(r=>({...r}))});}return this.regions;
  }finally{this.building=false;}
 }
 snapshot():SphereFieldSnapshot {return{n:this.n,data:Object.fromEntries(CUBE_FACES.map(f=>[f,this.data[f].slice()])) as Record<CubeFace,Float32Array>,sourceRevision:this.sourceRevision,heightScale:this.heightScale};}
}

export function sampleSphereFace(field:SphereFieldSnapshot,face:CubeFace,u:number,v:number){
 const out=new Float64Array(5);sampleSphereFaceInto(field,face,u,v,out);return{height:out[0]!,gradient:[out[1]!,out[2]!,out[3]!] as Vec3};
}
export function sampleSphereFaceInto(field:SphereFieldSnapshot,face:CubeFace,u:number,v:number,out:Float64Array){
 const n=field.n,side=n+1,x=Math.max(0,Math.min(n,(u/QUARTER_PI+1)*n/2)),y=Math.max(0,Math.min(n,(v/QUARTER_PI+1)*n/2)),left=Math.min(n-1,Math.floor(x)),top=Math.min(n-1,Math.floor(y)),fx=x-left,fy=y-top,data=field.data[face];
 out.fill(0);let low=Infinity,high=-Infinity;for(let row=0;row<2;row++)for(let col=0;col<2;col++){const p=((top+row)*side+left+col)*4,w=(row?fy:1-fy)*(col?fx:1-fx);low=Math.min(low,data[p]!);high=Math.max(high,data[p]!);for(let channel=0;channel<4;channel++)out[channel]!+=data[p+channel]!*w;}out[4]=low<=0&&high>0?1:0;
}
export function sphereRelief(gradient:Vec3){const g=gradient.map(v=>clampSlope(v*SPHERE_RELIEF_EXAGGERATION)) as unknown as Vec3;return Math.max(.55,Math.min(1.25,(1-dot3(g,LIGHT))/Math.hypot(1,...g)));}
/** One accepted color pass for ordinary terrain and excavation intersections. */
export function sphereDisplayColorInto(height:number,gx:number,gy:number,gz:number,appearance:SphereAppearance,formShade:number,out:Float64Array){
 elevationColorInto(height,0,out);let gain=formShade;
 if(appearance==='relief'&&height>0){const x=clampSlope(gx*SPHERE_RELIEF_EXAGGERATION),y=clampSlope(gy*SPHERE_RELIEF_EXAGGERATION),z=clampSlope(gz*SPHERE_RELIEF_EXAGGERATION);gain*=Math.max(.55,Math.min(1.25,(1+.6*x+.6*y-.5291502622129182*z)/Math.hypot(1,x,y,z)));}
 for(let k=0;k<3;k++)out[k]=Math.max(0,Math.min(255,out[k]!*gain));
}
export function sphereDisplayColor(height:number,gradient:Vec3,appearance:SphereAppearance,formShade=1){const out=new Float64Array(3);sphereDisplayColorInto(height,...gradient,appearance,formShade,out);return [out[0]!,out[1]!,out[2]!]as Vec3;}
