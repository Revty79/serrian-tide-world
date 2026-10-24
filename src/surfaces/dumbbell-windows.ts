import type {SurfacePosition} from './contracts.ts';
import type {DumbbellGeometry} from './dumbbell.ts';
import type {PolyhedronPhysicalBounds,PolyhedronPoint} from './polyhedron-contract.ts';
import {polyhedronPositionBounds} from './polyhedron-physical-bounds.ts';
import {prismAngle} from './prismatic-distance.ts';
import * as I from './pyramid-interval.ts';
type Bounds={a:I.Interval;b:I.Interval;x:I.Interval;y:I.Interval;vertices:readonly I.IntervalPoint[]};
interface Placement{face:string;a:number;b:number;x:number;y:number;vertices:readonly PolyhedronPoint[];bounds:Bounds}
export interface DumbbellWindow{placements:readonly Placement[];edges:readonly(readonly[number,number])[]}
const zero=I.exact(0),one=I.exact(1),tau=I.multiply([I.adjacentFloat(Math.PI,false),I.adjacentFloat(Math.PI,true)],I.exact(2));
const sub=(a:PolyhedronPoint,b:PolyhedronPoint):PolyhedronPoint=>[a[0]-b[0],a[1]-b[1]],dot=(a:PolyhedronPoint,b:PolyhedronPoint)=>a[0]*b[0]+a[1]*b[1],cross=(a:PolyhedronPoint,b:PolyhedronPoint)=>a[0]*b[1]-a[1]*b[0];
function transform(t:Bounds,p:I.IntervalPoint):I.IntervalPoint{return[I.add(I.subtract(I.multiply(t.a,p[0]),I.multiply(t.b,p[1])),t.x),I.add(I.add(I.multiply(t.b,p[0]),I.multiply(t.a,p[1])),t.y)];}
function unfold(g:DumbbellGeometry,previous:Placement,face:string,i:number,j:number):Placement{
 const ids=g.vertexIds(face),prior=g.vertexIds(previous.face),native=g.frame(face).chartVertices,c=native[ids.indexOf(i)]!,d=native[ids.indexOf(j)]!,p=previous.vertices[prior.indexOf(i)]!,q=previous.vertices[prior.indexOf(j)]!,e=sub(d,c),f=sub(q,p),den=dot(e,e),a=dot(e,f)/den,b=cross(e,f)/den,x=p[0]-a*c[0]+b*c[1],y=p[1]-b*c[0]-a*c[1];
 const ni=g.chartVertexBounds(face),ci=ni[ids.indexOf(i)]!,di=ni[ids.indexOf(j)]!,pi=previous.bounds.vertices[prior.indexOf(i)]!,qi=previous.bounds.vertices[prior.indexOf(j)]!,ei=I.pointSubtract(di,ci),fi=I.pointSubtract(qi,pi),deni=I.pointDot(ei,ei),ai=I.divide(I.pointDot(ei,fi),deni),bi=I.divide(I.pointCross(ei,fi),deni),xi=I.add(I.subtract(pi[0],I.multiply(ai,ci[0])),I.multiply(bi,ci[1])),yi=I.subtract(I.subtract(pi[1],I.multiply(bi,ci[0])),I.multiply(ai,ci[1])),bounds:Bounds={a:ai,b:bi,x:xi,y:yi,vertices:[]};bounds.vertices=ni.map(p=>transform(bounds,p));
 return{face,a,b,x,y,vertices:native.map(v=>[a*v[0]-b*v[1]+x,b*v[0]+a*v[1]+y] as PolyhedronPoint),bounds};
}
function segmentLower(p:PolyhedronPhysicalBounds,a:PolyhedronPhysicalBounds,b:PolyhedronPhysicalBounds){const d=b.map((x,k)=>I.subtract(x,a[k]!)),v=p.map((x,k)=>I.subtract(x,a[k]!)),den=d.reduce((s,x)=>I.add(s,I.square(x)),zero);if(den[0]<=0)return 0;const t=I.divide(d.reduce((s,x,k)=>I.add(s,I.multiply(x,v[k]!)),zero),den),clamp=(x:number)=>Math.max(0,Math.min(1,x)),range:I.Interval=[clamp(t[0]),clamp(t[1])];return Math.max(0,I.root(a.reduce((s,x,k)=>I.add(s,I.square(I.subtract(p[k]!,I.add(x,I.multiply(range,d[k]!))))),zero))[0]);}
const models=new WeakMap<DumbbellGeometry,Map<string,{face:string;edge:readonly[number,number]}[]>>();
function neighbors(g:DumbbellGeometry){let result=models.get(g);if(result)return result;result=new Map(g.faces.map(f=>[f,[]]));for(const edge of g.edges){const faces=g.faces.filter(f=>edge.every(v=>g.vertexIds(f).includes(v)));if(faces.length!==2)throw Error('Dumbbell boundary is not closed.');result.get(faces[0]!)!.push({face:faces[1]!,edge});result.get(faces[1]!)!.push({face:faces[0]!,edge});}models.set(g,result);return result;}
/** Straight unfolded rays must stay in every preceding portal's angular cone.
 * All angular endpoints are outward certificates. Empty intersections prune a
 * route; an uncertain source-on-portal case deliberately keeps the route. */
function angularCone(p:I.IntervalPoint,q:I.IntervalPoint,prior:I.Interval|undefined):I.Interval|undefined|false{
 const norm=(v:I.IntervalPoint)=>I.pointLength(v)[0];if(norm(p)<1e-10||norm(q)<1e-10)return prior;
 let A:I.Interval,B:I.Interval;try{A=prismAngle(p[1],p[0]);B=prismAngle(q[1],q[0]);}catch(error){if(!(error instanceof RangeError))throw error;return prior;}
 const mid=(a:I.Interval)=>(a[0]+a[1])/2,shift=Math.round((mid(A)-mid(B))/(2*Math.PI)),C=I.add(B,I.multiply(tau,I.exact(shift))),next:I.Interval=[Math.min(A[0],C[0]),Math.max(A[1],C[1])];
 if(next[1]-next[0]>=Math.PI-1e-10)return prior;if(!prior)return next;
 const turn=Math.round((mid(prior)-mid(next))/(2*Math.PI)),intersections:I.Interval[]=[];for(const k of [turn-1,turn,turn+1]){const shifted=I.add(next,I.multiply(tau,I.exact(k))),lo=Math.max(prior[0],shifted[0]),hi=Math.min(prior[1],shifted[1]);if(lo<=hi)intersections.push([lo,hi]);}
 return intersections.length?[Math.min(...intersections.map(x=>x[0])),Math.max(...intersections.map(x=>x[1]))]:false;
}
/** Enumerates ALL possible straight geodesic pieces shorter than reach. A
 * shortest path never revisits a convex physical polygon. Radius exclusion uses
 * only the certified ambient source-to-portal lower bound, never a substitute
 * for intrinsic distance. Vertex passages require separate vertex propagation.
 * Hard limits fail closed before unbounded preparation; nothing is truncated. */
export function dumbbellWindows(g:DumbbellGeometry,input:SurfacePosition,reach:number,limits:{maxWindows?:number;maxPlacements?:number}={}){
 const start=g.normalize(input);if(!Number.isFinite(reach)||reach<=0)throw RangeError('Positive finite Dumbbell window reach required.');
 const source=polyhedronPositionBounds(g,start),adj=neighbors(g),byFace=new Map<string,DumbbellWindow[]>(),maxWindows=limits.maxWindows??8192,maxPlacements=limits.maxPlacements??65536;
 if(!Number.isSafeInteger(maxWindows)||maxWindows<1||maxWindows>8192||!Number.isSafeInteger(maxPlacements)||maxPlacements<1||maxPlacements>65536)throw RangeError('Dumbbell preparation budgets may only lower the hard limits.');
 let windows=0,placementsCount=0,visited=0;const lower=new Map<string,number>();
 // A boundary source starts in its canonical chart. Zero-length portals reach
 // all incident charts, retaining every direction without duplicate roots.
 for(const root of [start]){
  const f=g.frame(root.patchId),first:Placement={face:root.patchId,a:1,b:0,x:0,y:0,vertices:f.chartVertices,bounds:{a:one,b:zero,x:zero,y:zero,vertices:g.chartVertexBounds(root.patchId)}},native=g.chartVertexBounds(root.patchId),origin:I.IntervalPoint=[I.add(I.multiply(native[1]![0],I.exact(root.u)),I.multiply(native[2]![0],I.exact(root.v))),I.multiply(native[2]![1],I.exact(root.v))];
  function walk(path:Placement[],edges:(readonly[number,number])[],cone?:I.Interval){
   if(++visited>maxPlacements)throw RangeError('Dumbbell window preparation exceeds its bounded visit budget.');
   const at=path.at(-1)!,route={placements:path,edges};if(++windows>maxWindows||placementsCount+path.length>maxPlacements)throw RangeError('Dumbbell window preparation exceeds its bounded retained budget.');placementsCount+=path.length;const existing=byFace.get(at.face)??[];existing.push(route);byFace.set(at.face,existing);
   for(const next of adj.get(at.face)!){if(path.some(p=>p.face===next.face))continue;const physical=g.physicalFaceId(next.face),prior=g.physicalFaceId(at.face);if(physical!==prior&&path.some(p=>g.physicalFaceId(p.face)===physical))continue;
    const id=next.edge.join(',');let distance=lower.get(id);if(distance===undefined){distance=segmentLower(source,g.physicalVertexBounds(next.edge[0]),g.physicalVertexBounds(next.edge[1]));lower.set(id,distance);}if(distance>=reach)continue;
    const ids=g.vertexIds(at.face),p=I.pointSubtract(at.bounds.vertices[ids.indexOf(next.edge[0])]!,origin),q=I.pointSubtract(at.bounds.vertices[ids.indexOf(next.edge[1])]!,origin),allowed=angularCone(p,q,cone);if(allowed===false)continue;
    walk([...path,unfold(g,at,next.face,...next.edge)],[...edges,next.edge],allowed);
   }
  }
  walk([first],[]);
 }
 return{start,reach,byFace,statistics:{windows,placements:placementsCount,visited}};
}
