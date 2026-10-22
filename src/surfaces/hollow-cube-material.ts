import type {HollowCubeWorld} from '../terrain/hollow-cube.ts';
import {cubeDot,SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,type CubeVector,type SolidCubeFace} from './solid-cube.ts';
import type {HollowCubeRole} from './hollow-cube.ts';
import {rayCapsuleInterval,type ExcavationPrimitive} from './hollow-cube-csg.ts';
import {segmentPointDistance} from './passages.ts';

/** Explicit new physical reconstruction. This does NOT reinterpret v6/v7 cuts.
 * Each face's normal height is bilinear in its original reference coordinates.
 * At seams the clamped continuation of the six fields is intersected. This is
 * a continuous closed volume, including mixed positive/negative edge heights;
 * independent face-normal offset points alone do not form such a volume. */
export const HOLLOW_MATERIAL_CONTRACT='cube-bilinear-envelope-v1' as const;
export interface MaterialFace {
 readonly face:SolidCubeFace;readonly n:number;readonly half:number;readonly orientation:1|-1;
 readonly heights:Float32Array;readonly minLevel:number;readonly maxLevel:number;
 readonly lipschitz:number;
}
export interface HollowTerrainMaterial {
 readonly contract:typeof HOLLOW_MATERIAL_CONTRACT;readonly worldId:string;
 readonly revisions:Readonly<Record<HollowCubeRole,number>>;
 readonly exterior:readonly MaterialFace[];readonly interior:readonly MaterialFace[];
 readonly boundsHalf:number;readonly guaranteedGapMeters:number;readonly bytes:number;
}
const roles=['exterior','interior'] as const;
/** Detached revision-coherent snapshot. No authority writes, history or render
 * scheduling. The existing editor supplies cancellation and cooperative yields. */
export async function prepareHollowMaterial(world:HollowCubeWorld,yieldWork:()=>Promise<void>=async()=>{},alive=()=>true):Promise<HollowTerrainMaterial>{
 const revisions={exterior:world.surfaces.exterior.referenceTerrain.revision,interior:world.surfaces.interior.referenceTerrain.revision};
 const guard=()=>{if(!alive())throw Error('Terrain material preparation cancelled.');for(const role of roles)if(world.surfaces[role].referenceTerrain.revision!==revisions[role])throw Error('Terrain material source changed; prepare the current revisions.');};
 const fields={} as Record<HollowCubeRole,MaterialFace[]>;let bytes=0;
 for(const role of roles){
  const terrain=world.surfaces[role].referenceTerrain,n=terrain.metadata.representation.cellsPerEdge,half=terrain.metadata.geometry.sideLengthMeters/2,orientation=role==='exterior'?1:-1;
  const faces:MaterialFace[]=[];
  for(const face of SOLID_CUBE_FACES){
   const heights=new Float32Array((n+1)**2);let min=Infinity,max=-Infinity;
   for(let row=0;row<=n;row++){
    for(let column=0;column<=n;column++){
     const h=terrain.read(terrain.resolve({...terrain.metadata.identity,patchId:face,column,row}));
     heights[row*(n+1)+column]=h;const level=half+orientation*h;min=Math.min(min,level);max=Math.max(max,level);
    }
    if(row%8===7){await yieldWork();guard();}
   }
   let du=0,dv=0;const s=n+1;
   for(let row=0;row<=n;row++)for(let column=0;column<=n;column++){
    const i=row*s+column;
    if(column<n)du=Math.max(du,Math.abs(heights[i+1]!-heights[i]!)*n/(2*half));
    if(row<n)dv=Math.max(dv,Math.abs(heights[i+s]!-heights[i]!)*n/(2*half));
   }
   bytes+=heights.byteLength;faces.push(Object.freeze({face,n,half,orientation,heights,minLevel:min,maxLevel:max,lipschitz:Math.hypot(1,du,dv)}));
  }fields[role]=faces;
 }
 guard();
 const outerMin=Math.min(...fields.exterior.map(f=>f.minLevel)),innerMax=Math.max(...fields.interior.map(f=>f.maxLevel)),innerMin=Math.min(...fields.interior.map(f=>f.minLevel));
 if(!(outerMin>innerMax&&innerMin>0))throw RangeError('Displaced surfaces do not have a certified positive material envelope. No excavation was changed.');
 return Object.freeze({contract:HOLLOW_MATERIAL_CONTRACT,worldId:world.definition.id,revisions:Object.freeze(revisions),exterior:Object.freeze(fields.exterior),interior:Object.freeze(fields.interior),boundsHalf:Math.max(...fields.exterior.map(f=>f.maxLevel)),guaranteedGapMeters:outerMin-innerMax,bytes});
}

/** Physical chart coordinates remain meters at the reference face. Detail is
 * interpolation of stored samples, never invented high-resolution geography. */
export function materialFaceSample(f:MaterialFace,u:number,v:number){
 const n=f.n,s=n+1,x=Math.max(0,Math.min(n,(u/f.half+1)*n/2)),y=Math.max(0,Math.min(n,(v/f.half+1)*n/2));
 const c=Math.min(n-1,Math.floor(x)),r=Math.min(n-1,Math.floor(y)),a=x-c,b=y-r,i=r*s+c;
 const h00=f.heights[i]!,h10=f.heights[i+1]!,h01=f.heights[i+s]!,h11=f.heights[i+s+1]!;
 const height=(h00*(1-a)+h10*a)*(1-b)+(h01*(1-a)+h11*a)*b;
 const du=u<=-f.half||u>=f.half?0:((h10-h00)*(1-b)+(h11-h01)*b)*n/(2*f.half);
 const dv=v<=-f.half||v>=f.half?0:((h01-h00)*(1-a)+(h11-h10)*a)*n/(2*f.half);
 return{height,level:f.half+f.orientation*height,du:f.orientation*du,dv:f.orientation*dv};
}
export function materialEnvelopeValue(faces:readonly MaterialFace[],p:CubeVector){
 let value=-Infinity;
 for(const f of faces){const frame=SOLID_CUBE_FRAMES[f.face],h=materialFaceSample(f,cubeDot(p,frame.u),cubeDot(p,frame.v));value=Math.max(value,cubeDot(p,frame.normal)-h.level);}
 return value;
}
export function hollowMaterialContains(model:HollowTerrainMaterial,p:CubeVector){
 return materialEnvelopeValue(model.exterior,p)<=0&&materialEnvelopeValue(model.interior,p)>=0;
}
export interface MaterialRayHit {readonly distance:number;readonly point:CubeVector;readonly normal:CubeVector;readonly role:HollowCubeRole;readonly face:SolidCubeFace;readonly u:number;readonly v:number}
type Root={t:number;role:HollowCubeRole;face:MaterialFace};
const pointAt=(o:CubeVector,d:CubeVector,t:number)=>o.map((v,i)=>v+d[i]!*t) as unknown as CubeVector;

/** All roots of one face constraint. Between projected grid/clamp boundaries,
 * bilinear h(ray(t)) is quadratic. Solve it in a LOCAL interval parameter, not
 * by subtracting two world-scale squared distances. No fixed ray-march step or
 * hidden precision/iteration truncation can lose a mountain or a small rim. */
function faceRoots(f:MaterialFace,o:CubeVector,d:CubeVector,start:number,end:number):number[]{
 const frame=SOLID_CUBE_FRAMES[f.face],normalO=cubeDot(o,frame.normal),normalD=cubeDot(d,frame.normal);
 if(normalD===0&&(normalO<f.minLevel||normalO>f.maxLevel))return[];
 let low=start,high=end;
 if(normalD!==0){const a=(f.minLevel-normalO)/normalD,b=(f.maxLevel-normalO)/normalD;low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));if(low>high)return[];}
 const u0=cubeDot(o,frame.u),v0=cubeDot(o,frame.v),ud=cubeDot(d,frame.u),vd=cubeDot(d,frame.v),events=[low,high];
 for(const [origin,delta]of [[u0,ud],[v0,vd]])if(delta!==0){
  const a=origin!+delta!*low,b=origin!+delta!*high;
  const first=Math.max(0,Math.ceil((Math.min(a,b)/f.half+1)*f.n/2)),last=Math.min(f.n,Math.floor((Math.max(a,b)/f.half+1)*f.n/2));
  for(let k=first;k<=last;k++){const t=(f.half*(2*k/f.n-1)-origin!)/delta!;if(t>low&&t<high)events.push(t);}
 }
 events.sort((a,b)=>a-b);const roots:number[]=[];
 const value=(t:number)=>normalO+normalD*t-materialFaceSample(f,u0+ud*t,v0+vd*t).level;
 if(low===high){roots.push(low);return roots;}
 for(let i=1;i<events.length;i++){
  const a=events[i-1]!,b=events[i]!;if(a===b)continue;
  const span=b-a;
  // Form the polynomial directly from local sample differences. Fitting three
  // world-space function evaluations would lose small curvature in cancellation.
  const localO=pointAt(o,d,a),un=cubeDot(localO,frame.u),vn=cubeDot(localO,frame.v),nn=cubeDot(localO,frame.normal);
  const coordinate=(origin:number,delta:number)=>{
   const middle=origin+delta*span/2;
   if(middle<=-f.half)return{cell:0,x:0,dx:0};
   if(middle>=f.half)return{cell:f.n-1,x:1,dx:0};
   const cell=Math.max(0,Math.min(f.n-1,Math.floor((middle/f.half+1)*f.n/2)));
   return{cell,x:(origin/f.half+1)*f.n/2-cell,dx:delta*span*f.n/(2*f.half)};
  };
  const x=coordinate(un,ud),y=coordinate(vn,vd),s=f.n+1,index=y.cell*s+x.cell;
  const h=f.heights[index]!,hu=f.heights[index+1]!-h,hv=f.heights[index+s]!-h,hxy=f.heights[index+s+1]!-f.heights[index+1]!-f.heights[index+s]!+h;
  const c0=(nn-f.half)-f.orientation*(h+hu*x.x+hv*y.x+hxy*x.x*y.x);
  const b0=normalD*span-f.orientation*(hu*x.dx+hv*y.dx+hxy*(x.x*y.dx+y.x*x.dx));
  const a0=-f.orientation*hxy*x.dx*y.dx,scale=Math.max(Math.abs(a0),Math.abs(b0),Math.abs(c0));
  const aa=scale?a0/scale:0,bb=scale?b0/scale:0,c=scale?c0/scale:0;
  const include=(s:number)=>{if(s>=0&&s<=1&&Number.isFinite(s))roots.push(a+span*s);};
  if(aa===0){if(bb!==0)include(-c/bb);else if(c===0){roots.push(a,b);}continue;}
  const disc=bb*bb-4*aa*c;
  if(disc<0)continue;
  const q=-.5*(bb+(bb<0?-1:1)*Math.sqrt(disc));
  if(q===0)include(-bb/(2*aa));else{include(q/aa);include(c/q);}
 }
 // Height-extrema bounds may collapse to a plane; include exact endpoints too.
 if(value(low)===0)roots.push(low);if(value(high)===0)roots.push(high);
 return roots;
}

/** Finite, exhaustive terrain intersections, in CPU double precision. Callers
 * compose these surfaces with the SAME excavation primitives, not map links.
 * `skipExterior` is the existing far-wall interior cutaway convention. */
export function hollowMaterialIntersections(model:HollowTerrainMaterial,o:CubeVector,inputDirection:CubeVector):MaterialRayHit[]{
 const length=Math.hypot(...inputDirection);if(!Number.isFinite(length)||length===0||!o.every(Number.isFinite))throw RangeError('Finite nonzero material ray required.');
 const d=inputDirection.map(v=>v/length) as unknown as CubeVector;
 let lo=0,hi=Infinity;
 for(let axis=0;axis<3;axis++){
  if(d[axis]===0){if(Math.abs(o[axis]!)>model.boundsHalf)return[];continue;}
  const a=(-model.boundsHalf-o[axis]!)/d[axis]!,b=(model.boundsHalf-o[axis]!)/d[axis]!;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
 }if(!(lo<=hi&&Number.isFinite(hi)))return[];
 const roots:Root[]=[];
 for(const role of roles)for(const face of model[role])for(const t of faceRoots(face,o,d,lo,hi))if(t>=0)roots.push({t,role,face});
 roots.sort((a,b)=>a.t-b.t);
 const error=64*Number.EPSILON*Math.max(model.boundsHalf,...o.map(Math.abs));
 const hits:MaterialRayHit[]=[];
 for(const root of roots){
  const point=pointAt(o,d,root.t),other=root.role==='exterior'?model.interior:model.exterior;
  // A face zero is a boundary only when every other face constraint is met.
  const own=model[root.role];if(materialEnvelopeValue(own,point)>error)continue;
  const otherValue=materialEnvelopeValue(other,point);
  if(root.role==='exterior'?otherValue<-error:otherValue>error)continue;
  const frame=SOLID_CUBE_FRAMES[root.face.face],u=cubeDot(point,frame.u),v=cubeDot(point,frame.v),sample=materialFaceSample(root.face,u,v),sign=root.role==='exterior'?1:-1;
  const raw=frame.normal.map((x,i)=>sign*(x-sample.du*frame.u[i]!-sample.dv*frame.v[i]!)),norm=Math.hypot(...raw);
  hits.push({distance:root.t,point,normal:raw.map(v=>v/norm) as unknown as CubeVector,role:root.role,face:root.face.face,u,v});
 }
 return hits;
}
export function traceHollowMaterial(model:HollowTerrainMaterial,o:CubeVector,d:CubeVector,skipExterior=false){
 return hollowMaterialIntersections(model,o,d).find(hit=>!skipExterior||hit.role==='interior'&&cubeDot(hit.normal,d)<0);
}

/** Voids remain ordinary shared sphere/capsule cutters, expressed here in meters.
 * Terrain and cuts use one boundary query for visible hits and inspection. */
export function traceTerrainExcavation(model:HollowTerrainMaterial,cuts:readonly ExcavationPrimitive[],o:CubeVector,inputDirection:CubeVector,skipExterior=false){
 const length=Math.hypot(...inputDirection),d=inputDirection.map(v=>v/length) as unknown as CubeVector;
 const error=64*Number.EPSILON*Math.max(model.boundsHalf,...o.map(Math.abs));
 const surfaces=hollowMaterialIntersections(model,o,d).filter(hit=>(!skipExterior||hit.role==='interior'&&cubeDot(hit.normal,d)<0)&&!cuts.some(c=>segmentPointDistance(hit.point,c.a,c.b)<c.radius-error));
 const hits:{distance:number;point:CubeVector;normal:CubeVector;kind:'rock'|'exterior'|'interior';face?:SolidCubeFace;u?:number;v?:number}[]=surfaces.map(hit=>({...hit,kind:hit.role}));
 let cutaway=0;if(skipExterior){const first=traceHollowMaterial(model,o,d,true);if(!first)return;cutaway=first.distance;}
 for(const cut of cuts){const interval=rayCapsuleInterval(o,d,cut);if(!interval)continue;
  for(const t of interval){
   if(t<cutaway||t<0)continue;const point=pointAt(o,d,t);
   if(materialEnvelopeValue(model.exterior,point)>error||materialEnvelopeValue(model.interior,point)<-error)continue;
   if(cuts.some(other=>other!==cut&&segmentPointDistance(point,other.a,other.b)<other.radius-error))continue;
   const axis=cut.b.map((v,i)=>v-cut.a[i]!) as unknown as CubeVector,v=point.map((q,i)=>q-cut.a[i]!) as unknown as CubeVector,length2=cubeDot(axis,axis),s=length2?Math.max(0,Math.min(1,cubeDot(v,axis)/length2)):0;
   const raw=cut.a.map((q,i)=>q+axis[i]!*s-point[i]!),norm=Math.hypot(...raw);
   hits.push({distance:t,point,normal:raw.map(v=>v/norm) as unknown as CubeVector,kind:'rock'});
  }
 }
 return hits.sort((a,b)=>a.distance-b.distance)[0];
}

/** Conservative ball clearance against the actual material and authored voids.
 * A false result is inconclusive near combined-void junctions, never a guarantee
 * that a traveler fits. No reference-plane shortcut can approve a blocked path. */
export function terrainExcavationFreeBall(model:HollowTerrainMaterial,cuts:readonly ExcavationPrimitive[],p:CubeVector,margin=0){
 if(!Number.isFinite(margin)||margin<0||!p.every(Number.isFinite))throw RangeError('Finite clearance position and nonnegative margin required.');
 const value=(f:MaterialFace)=>{const frame=SOLID_CUBE_FRAMES[f.face];return cubeDot(p,frame.normal)-materialFaceSample(f,cubeDot(p,frame.u),cubeDot(p,frame.v)).level;};
 if(model.exterior.some(f=>value(f)>f.lipschitz*margin)||model.interior.every(f=>value(f)<-f.lipschitz*margin))return true;
 return cuts.some(c=>c.radius>margin&&segmentPointDistance(p,c.a,c.b)<c.radius-margin);
}
