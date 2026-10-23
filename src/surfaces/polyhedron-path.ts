import {preparedPolyhedronDistance} from './polyhedron-distance-prepared.ts';
import type {SurfacePosition} from './contracts.ts';
import {pyramidSub,pyramidUnit} from './pyramid.ts';
import type {PolyhedronGeometry,PolyhedronPoint} from './polyhedron-contract.ts';
type PolyhedronPosition=SurfacePosition;type PolyhedronFace=string;
import type {ConnectedPathOptions,ConnectedPhysicalPath} from '../terrain/connected-stroke.ts';
import * as I from './pyramid-interval.ts';
const sub=(a:PolyhedronPoint,b:PolyhedronPoint):PolyhedronPoint=>[a[0]-b[0],a[1]-b[1]],cross=(a:PolyhedronPoint,b:PolyhedronPoint)=>a[0]*b[1]-a[1]*b[0],dot=(a:PolyhedronPoint,b:PolyhedronPoint)=>a[0]*b[0]+a[1]*b[1],clamp=(x:number)=>Math.max(0,Math.min(1,x));
interface Bounds{a:I.Interval;b:I.Interval;x:I.Interval;y:I.Interval;vertices:readonly I.IntervalPoint[]}
interface Placement{face:PolyhedronFace;a:number;b:number;x:number;y:number;vertices:readonly PolyhedronPoint[];bounds:Bounds}
interface Route{placements:readonly Placement[];edges:readonly (readonly[number,number])[]}
const zero=I.exact(0),one=I.exact(1);
function nativeVertices(g:PolyhedronGeometry,face:PolyhedronFace){return g.chartVertexBounds(face);}
function nativePoint(g:PolyhedronGeometry,p:PolyhedronPosition):I.IntervalPoint{const v=nativeVertices(g,p.patchId);return[I.add(I.multiply(v[1]![0],I.exact(p.u)),I.multiply(v[g.isTriangle(p.patchId)?2:3]![0],I.exact(p.v))),I.multiply(v[g.isTriangle(p.patchId)?2:3]![1],I.exact(p.v))];}
const transform=(bounds:Bounds,p:I.IntervalPoint):I.IntervalPoint=>[I.add(I.subtract(I.multiply(bounds.a,p[0]),I.multiply(bounds.b,p[1])),bounds.x),I.add(I.add(I.multiply(bounds.b,p[0]),I.multiply(bounds.a,p[1])),bounds.y)];
function unfoldBounds(g:PolyhedronGeometry,previous:Placement,face:PolyhedronFace,i:number,j:number):Bounds{const ids=g.vertexIds(face),prior=g.vertexIds(previous.face),native=nativeVertices(g,face),c=native[ids.indexOf(i)]!,d=native[ids.indexOf(j)]!,p=previous.bounds.vertices[prior.indexOf(i)]!,q=previous.bounds.vertices[prior.indexOf(j)]!,e=I.pointSubtract(d,c),f=I.pointSubtract(q,p),den=I.pointDot(e,e),a=I.divide(I.pointDot(e,f),den),b=I.divide(I.pointCross(e,f),den),x=I.add(I.subtract(p[0],I.multiply(a,c[0])),I.multiply(b,c[1])),y=I.subtract(I.subtract(p[1],I.multiply(b,c[0])),I.multiply(a,c[1])),bounds:Bounds={a,b,x,y,vertices:[]};bounds.vertices=native.map(p=>transform(bounds,p));return bounds;}
const routeCache=new WeakMap<PolyhedronGeometry,Map<string,readonly Route[]>>();
export function polyhedronUnfoldings(g:PolyhedronGeometry,from:PolyhedronFace,to:PolyhedronFace){let cache=routeCache.get(g);if(!cache){cache=new Map();routeCache.set(g,cache);}const key=`${from}:${to}`,cached=cache.get(key);if(cached)return cached;
 const first:Placement={face:from,a:1,b:0,x:0,y:0,vertices:g.frame(from).chartVertices,bounds:{a:one,b:zero,x:zero,y:zero,vertices:nativeVertices(g,from)}},values:Route[]=[];
 function walk(placements:Placement[],edges:(readonly[number,number])[]){const previous=placements.at(-1)!;if(previous.face===to){values.push({placements,edges});return;}for(const face of g.faces){if(placements.some(p=>p.face===face))continue;const ids=g.vertexIds(face),priorIds=g.vertexIds(previous.face),common=ids.filter(id=>priorIds.includes(id));if(common.length!==2)continue;const[i,j]=common as[number,number],p=previous.vertices[priorIds.indexOf(i)]!,q=previous.vertices[priorIds.indexOf(j)]!,native=g.frame(face).chartVertices,c=native[ids.indexOf(i)]!,d=native[ids.indexOf(j)]!,e=sub(d,c),f=sub(q,p),den=dot(e,e),a=dot(e,f)/den,b=cross(e,f)/den,x=p[0]-a*c[0]+b*c[1],y=p[1]-b*c[0]-a*c[1],vertices=native.map(v=>[a*v[0]-b*v[1]+x,b*v[0]+a*v[1]+y] as PolyhedronPoint);walk([...placements,{face,a,b,x,y,vertices,bounds:unfoldBounds(g,previous,face,i,j)}],[...edges,[i,j]]);}}
 walk([first],[]);cache.set(key,values);return values;
}
/** Segment/portal closest witnesses. Endpoint projections also cover parallel
 * and collinear segments without dividing by a vanishing cross product. */
function portal(a:PolyhedronPoint,b:PolyhedronPoint,p:PolyhedronPoint,q:PolyhedronPoint){const d=sub(b,a),e=sub(q,p),den=cross(d,e),candidates:{t:number;s:number;gap:number}[]=[];
 const offer=(t:number,s:number)=>{t=clamp(t);s=clamp(s);candidates.push({t,s,gap:Math.hypot(a[0]+t*d[0]-p[0]-s*e[0],a[1]+t*d[1]-p[1]-s*e[1])});};
 if(den!==0){const v=sub(p,a),t=cross(v,e)/den,s=cross(v,d)/den;if(t>=0&&t<=1&&s>=0&&s<=1)offer(t,s);}
 const dd=dot(d,d),ee=dot(e,e);offer(0,dot(sub(a,p),e)/ee);offer(1,dot(sub(b,p),e)/ee);offer(dd?dot(sub(p,a),d)/dd:0,0);offer(dd?dot(sub(q,a),d)/dd:0,1);return candidates.sort((a,b)=>a.gap-b.gap||a.t-b.t)[0]!;
}
export function polyhedronArithmeticGuard(g:PolyhedronGeometry){return 32768*Number.EPSILON*g.scaleMeters;}
/** Only proven side/ordering exclusions may remove a possible shortest route. */
function portalBounds(a:I.IntervalPoint,b:I.IntervalPoint,p:I.IntervalPoint,q:I.IntervalPoint):I.Interval|undefined{const d=I.pointSubtract(b,a),e=I.pointSubtract(q,p),ap=I.pointSubtract(p,a),aq=I.pointSubtract(q,a),pa=I.pointSubtract(a,p),pb=I.pointSubtract(b,p),left=I.pointCross(d,ap),right=I.pointCross(d,aq),first=I.pointCross(e,pa),last=I.pointCross(e,pb),sameSide=(a:I.Interval,b:I.Interval)=>a[0]>0&&b[0]>0||a[1]<0&&b[1]<0;if(sameSide(left,right)||sameSide(first,last))return;const den=I.pointCross(d,e);if(den[0]<=0&&den[1]>=0)return[0,1];const t=I.divide(I.pointCross(ap,e),den);if(t[1]<0||t[0]>1)return;return[Math.max(0,t[0]),Math.min(1,t[1])];}
type PhysicalBounds=readonly[I.Interval,I.Interval,I.Interval];
function vertexBounds(g:PolyhedronGeometry,index:number):PhysicalBounds{return g.physicalVertexBounds(index);}
function physicalBounds(g:PolyhedronGeometry,p:PolyhedronPosition):PhysicalBounds{const u=I.exact(p.u),v=I.exact(p.v),weights=!g.isTriangle(p.patchId)?[I.multiply(I.subtract(one,u),I.subtract(one,v)),I.multiply(u,I.subtract(one,v)),I.multiply(u,v),I.multiply(I.subtract(one,u),v)]:[I.subtract(I.subtract(one,u),v),u,v],ids=g.vertexIds(p.patchId);return[0,1,2].map(k=>weights.reduce((sum,w,i)=>I.add(sum,I.multiply(w,vertexBounds(g,ids[i]!)[k]!)),zero)) as unknown as PhysicalBounds;}
function edgeBounds(g:PolyhedronGeometry,i:number,j:number,t:number):PhysicalBounds{const a=vertexBounds(g,i),b=vertexBounds(g,j),v=I.exact(t),u=I.subtract(one,v);return a.map((x,k)=>I.add(I.multiply(u,x),I.multiply(v,b[k]!))) as unknown as PhysicalBounds;}
function physicalLength(a:PhysicalBounds,b:PhysicalBounds){return I.root(a.reduce((sum,x,k)=>I.add(sum,I.square(I.subtract(x,b[k]!))),zero));}
function solve(g:PolyhedronGeometry,first:SurfacePosition,last:SurfacePosition,options:{absoluteToleranceMeters?:number;maxBoxes?:number}={},filtered?:readonly Route[]){
 const start=g.normalize(first),end=g.normalize(last),tolerance=options.absoluteToleranceMeters??g.scaleMeters*1e-6,all=filtered??polyhedronUnfoldings(g,start.patchId,end.patchId);
 if(!Number.isFinite(tolerance)||tolerance<=0||!Number.isInteger(options.maxBoxes??32768)||(options.maxBoxes??32768)<1)throw RangeError('Invalid pyramid distance certificate options.');if(all.length>(options.maxBoxes??32768))throw RangeError('Pyramid route work budget exhausted.');
 const a=g.chartPoint(start),nativeEnd=g.chartPoint(end),ai=nativePoint(g,start),ni=nativePoint(g,end),feasible:{route:Route;points:PolyhedronPosition[][];length:number;lower:number;upper:number}[]=[];
 for(const route of all){const target=route.placements.at(-1)!,b:PolyhedronPoint=[target.a*nativeEnd[0]-target.b*nativeEnd[1]+target.x,target.b*nativeEnd[0]+target.a*nativeEnd[1]+target.y],bi=transform(target.bounds,ni),flat=I.pointLength(I.pointSubtract(bi,ai)),points:PolyhedronPosition[][]=[[start]],crossings:{t:number;s:number;i:number;j:number}[]=[];let previous=0,valid=true;
  for(let k=0;k<route.edges.length;k++){const[i,j]=route.edges[k]!,placement=route.placements[k]!,ids=g.vertexIds(placement.face),p=placement.vertices[ids.indexOf(i)]!,q=placement.vertices[ids.indexOf(j)]!,range=portalBounds(ai,bi,placement.bounds.vertices[ids.indexOf(i)]!,placement.bounds.vertices[ids.indexOf(j)]!);if(!range||previous>range[1]){valid=false;break;}previous=Math.max(previous,range[0]);crossings.push({...portal(a,b,p,q),i,j});}
  if(!valid)continue;
  for(let k=0;k<crossings.length;k++){const c=crossings[k]!,weights=new Map([[c.i,1-c.s],[c.j,c.s]]),incoming=g.fromWeights(route.placements[k]!.face,weights)!,outgoing=g.fromWeights(route.placements[k+1]!.face,weights)!;points[k]!.push(incoming);points.push([outgoing]);}points.at(-1)!.push(end);
  let length=0;for(const[p,q]of points)length+=Math.hypot(...pyramidSub(g.referencePosition(q!),g.referencePosition(p!)));
  const witnesses=[physicalBounds(g,start),...crossings.map(c=>edgeBounds(g,c.i,c.j,c.s)),physicalBounds(g,end)];let upper=zero;for(let k=1;k<witnesses.length;k++)upper=I.add(upper,physicalLength(witnesses[k-1]!,witnesses[k]!));
  feasible.push({route,points,length,lower:Math.max(0,flat[0]),upper:upper[1]});
 }
 if(!feasible.length)throw RangeError('Pyramid route cannot be certified at this arithmetic precision.');
 const best=feasible.reduce((a,b)=>a.upper<=b.upper?a:b),same=g.aliases(start).some(p=>p.patchId===end.patchId&&p.u===end.u&&p.v===end.v),lower=same?0:Math.min(...feasible.map(p=>p.lower)),upper=same?0:Math.max(best.length,best.upper);
 if(upper-lower>tolerance)throw RangeError('Pyramid route enclosure exceeds requested precision; no approximate route was published.');
 return{start,end,best,lower,upper,routes:all.length};
}
/** Exhaustive simple-face unfoldings on the actual convex boundary. A shortest
 * convex route never revisits a face. Portals must be met in order; ambiguous
 * grazing candidates retain lower bounds and actual feasible polyline witnesses.
 * No ambient chord is ever substituted for a surface route. */
export function polyhedronDistanceReference(g:PolyhedronGeometry,a:SurfacePosition,b:SurfacePosition,options:{absoluteToleranceMeters?:number;maxBoxes?:number}={}){const s=solve(g,a,b,options);return{scope:'global-reference-surface' as const,lowerBoundMeters:s.lower,upperBoundMeters:s.upper,evaluatedBoxes:0,evaluatedRoutes:s.routes};}
export function polyhedronDistance(g:PolyhedronGeometry,a:SurfacePosition,b:SurfacePosition,options:{absoluteToleranceMeters?:number;maxBoxes?:number}={}){const quick=preparedPolyhedronDistance(g,a,b,options);if(!quick)return polyhedronDistanceReference(g,a,b,options);if(!('onlyRoutes'in quick))return quick;const s=solve(g,a,b,options,quick.onlyRoutes);return{scope:'global-reference-surface' as const,lowerBoundMeters:s.lower,upperBoundMeters:s.upper,evaluatedBoxes:0,evaluatedRoutes:quick.consideredRoutes,certifiedRoutes:s.routes};}
export function reconstructPolyhedronPath(g:PolyhedronGeometry,a:SurfacePosition,b:SurfacePosition,options:ConnectedPathOptions={version:1}):ConnectedPhysicalPath{
 if(options.version!==1)throw RangeError('Only pyramid path version 1 is supported.');const s=solve(g,a,b,options),pieces=s.best.points.map(([start,end])=>{const p=g.referencePosition(start!),q=g.referencePosition(end!),length=Math.hypot(...pyramidSub(q,p));return{start:start!,end:end!,length,tangent:length?pyramidUnit(pyramidSub(q,p)):null};}).filter(p=>p.length>0),length=pieces.reduce((sum,p)=>sum+p.length,0),error=s.upper-s.lower;
 return Object.freeze({end:s.end,pieces,lengthMeters:length,lengthUpperBoundMeters:s.upper,lengthErrorBoundMeters:error,distance:{evaluatedBoxes:0},atDistance(meters:number,boundary:'incoming'|'outgoing'='outgoing'){
  if(!Number.isFinite(meters)||meters<0||meters>length)throw RangeError('Pyramid path position outside its length.');let offset=0,index=0;for(;index<pieces.length-1;index++){const p=pieces[index]!;if(meters<offset+p.length||(meters===offset+p.length&&boundary==='incoming'))break;offset+=p.length;}const p=pieces[index];if(!p)return{position:s.end,referencePosition:g.referencePosition(s.end),tangent:null,pieceIndex:0,distanceMeters:meters,atEnd:true,oneSidedPatchId:s.end.patchId};const t=clamp((meters-offset)/p.length),u=p.start.u+(p.end.u-p.start.u)*t;let v=p.start.v+(p.end.v-p.start.v)*t;if(g.isTriangle(p.start.patchId)&&p.start.u+p.start.v===1&&p.end.u+p.end.v===1)v=1-u;const position=meters===0?s.start:meters===length?s.end:t===0?p.start:t===1?p.end:g.normalize({...p.start,u,v});return{position,referencePosition:g.referencePosition(position),tangent:p.tangent,pieceIndex:index,distanceMeters:meters,atEnd:meters===length,oneSidedPatchId:position.patchId};},
 });
}
