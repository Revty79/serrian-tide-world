import type {SurfacePosition} from './contracts.ts';
import type {DumbbellGeometry} from './dumbbell.ts';
import {dumbbellWindows} from './dumbbell-windows.ts';
import {preparePolyhedronRouteEnclosures} from './polyhedron-distance-prepared.ts';
import {polyhedronRouteCertificate} from './polyhedron-path.ts';
import {polyhedronPositionBounds,polyhedronPhysicalLength} from './polyhedron-physical-bounds.ts';
import * as I from './pyramid-interval.ts';
const guard=(g:DumbbellGeometry)=>32768*Number.EPSILON*g.scaleMeters;
const vertexPosition=(g:DumbbellGeometry,i:number)=>{const face=g.faces.find(f=>g.vertexIds(f).includes(i))!;return g.fromWeights(face,new Map([[i,1]]))!;};
function compile(g:DumbbellGeometry,start:SurfacePosition,reach:number){
 const w=dumbbellWindows(g,start,reach),byFace=new Map([...w.byFace].map(([face,routes])=>[face,preparePolyhedronRouteEnclosures(g,start,routes)]));
 const aliases=new Set(g.aliases(start).map(p=>g.physicalFaceId(p.patchId))),source=polyhedronPositionBounds(g,start);
 return{...w,bounds:(end:SurfacePosition,tolerance:number)=>{
  if(aliases.has(g.physicalFaceId(end.patchId))){const b=polyhedronPhysicalLength(source,polyhedronPositionBounds(g,end));return{lower:Math.max(0,b[0]),upper:b[1]};}
  const raw=byFace.get(end.patchId)?.(end);if(!raw)return{lower:reach,upper:Infinity};
  if(raw.upper-raw.lower<=tolerance)return raw;
  if(raw.surviving.length)try{const proof=polyhedronRouteCertificate(g,start,end,raw.surviving,{absoluteToleranceMeters:tolerance,maxBoxes:8192});return{lower:proof.lowerBoundMeters,upper:proof.upperBoundMeters};}catch(error){if(!(error instanceof RangeError))throw error;}
  return raw;
 }};
}
type Compiled=ReturnType<typeof compile>;
const vertexCaches=new WeakMap<DumbbellGeometry,Map<string,Compiled>>();
function atVertex(g:DumbbellGeometry,i:number,reach:number){let cache=vertexCaches.get(g);if(!cache){cache=new Map();vertexCaches.set(g,cache);}const key=`${i}:${reach}`;let found=cache.get(key);if(!found){found=compile(g,vertexPosition(g,i),reach);if(found.statistics.placements>8192)return found;while(cache.size&&([...cache.values()].reduce((s,c)=>s+c.statistics.placements,0)+found.statistics.placements>8192||cache.size>=24))cache.delete(cache.keys().next().value!);cache.set(key,found);}return found;}
function dijkstra(edges:readonly(readonly number[])[],roundUp:boolean){const n=edges.length,d=Array<number>(n).fill(Infinity),seen=new Set<number>();d[0]=0;for(let k=0;k<n;k++){let at=-1;for(let j=0;j<n;j++)if(!seen.has(j)&&(at<0||d[j]!<d[at]!))at=j;if(at<0||!Number.isFinite(d[at]!))break;seen.add(at);for(let j=1;j<n;j++){const value=I.adjacentFloat(d[at]!+edges[at]![j]!,roundUp);if(value<d[j]!)d[j]=Math.max(0,value);}}return d;}
const rootWitnesses=new WeakMap<DumbbellGeometry,readonly number[]>();
/** A retained real edge route to one root is enough for a finite upper
 * witness. It is never used as the influential metric. Prepare it once rather
 * than rerunning a whole-boundary edge search for every local source. */
function rootWitness(g:DumbbellGeometry){let found=rootWitnesses.get(g);if(found)return found;const adjacency:{to:number;upper:number}[][]=Array.from({length:g.vertices.length},()=>[]);for(const [a,b]of g.edges){const upper=polyhedronPhysicalLength(g.physicalVertexBounds(a),g.physicalVertexBounds(b))[1];adjacency[a]!.push({to:b,upper});adjacency[b]!.push({to:a,upper});}const distance=Array<number>(g.vertices.length).fill(Infinity),seen=new Set<number>();distance[0]=0;for(let k=0;k<distance.length;k++){let at=-1;for(let i=0;i<distance.length;i++)if(!seen.has(i)&&(at<0||distance[i]!<distance[at]!))at=i;if(at<0)break;seen.add(at);for(const e of adjacency[at]!)distance[e.to]=Math.min(distance[e.to]!,I.adjacentFloat(distance[at]!+e.upper,true));}found=Object.freeze(distance);rootWitnesses.set(g,found);return found;}
/** Global intrinsic enclosure below a finite physical reach. Straight geodesic
 * pieces are exhaustively unfolded inside that reach. Every mesh vertex is a
 * permitted intermediate node, so saddle-apex shortest paths are not lost.
 * Dijkstra uses directed bounds; excluded pieces are >=reach and cannot win a
 * shorter route. A real boundary-edge path supplies a finite upper witness.
 * No approximate graph distance is substituted for an influential distance. */
export function prepareDumbbellDistance(g:DumbbellGeometry,input:SurfacePosition,reach:number,tolerance:number){
 const start=g.canonicalPosition(input),pad=guard(g);if(!Number.isFinite(tolerance)||tolerance<=0||!Number.isFinite(reach)||reach<=0)throw RangeError('Dumbbell needs a finite positive distance reach and tolerance.');
 const source=polyhedronPositionBounds(g,start),included=g.vertices.flatMap((_,i)=>polyhedronPhysicalLength(source,g.physicalVertexBounds(i))[0]<reach?[i]:[]),points=[start,...included.map(i=>vertexPosition(g,i))],compiled:Compiled[]=[];
 for(let k=0;k<points.length;k++){compiled.push(k===0?compile(g,start,reach):atVertex(g,included[k-1]!,reach));if(compiled.reduce((s,c)=>s+c.statistics.placements,0)>65536||compiled.reduce((s,c)=>s+c.statistics.windows,0)>8192)throw RangeError('Dumbbell complete source preparation exceeds its work budget.');}
 const lower=points.map(()=>Array<number>(points.length).fill(Infinity)),upper=points.map(()=>Array<number>(points.length).fill(Infinity));
 for(let i=0;i<points.length;i++)for(let j=0;j<points.length;j++){if(i===j){lower[i]![j]=upper[i]![j]=0;continue;}const b=compiled[i]!.bounds(points[j]!,tolerance/8);lower[i]![j]=Math.min(reach,b.lower);upper[i]![j]=b.upper;}
 const lo=dijkstra(lower,false),hi=dijkstra(upper,true);
 // Feasible edge-only route: a conservative upper witness, never brush metric.
 const root=rootWitness(g),prefix=Math.min(...g.vertexIds(start.patchId).map(v=>I.adjacentFloat(polyhedronPhysicalLength(source,g.physicalVertexBounds(v))[1]+root[v]!,true))),all=root.map(d=>I.adjacentFloat(prefix+d,true));
 return{start,reach,statistics:{vertexSources:included.length,windows:compiled.reduce((s,c)=>s+c.statistics.windows,0),placements:compiled.reduce((s,c)=>s+c.statistics.placements,0)},distance:(input:SurfacePosition,options:{absoluteToleranceMeters:number;maxBoxes:number})=>{
  const end=g.canonicalPosition(input),target=polyhedronPositionBounds(g,end);let low=reach,high=Infinity;
  for(const v of g.vertexIds(end.patchId))high=Math.min(high,I.adjacentFloat(all[v]!+polyhedronPhysicalLength(g.physicalVertexBounds(v),target)[1],true));
  const endPoint=g.referencePosition(end);
  for(let i=0;i<compiled.length;i++){if(lo[i]!>=reach)continue;
   // A real upper witness already beats this vertex's complete ambient lower
   // bound. Such a vertex cannot improve either side of the global minimum.
   if(i>0&&lo[i]!+Math.hypot(...g.vertices[included[i-1]!]!.map((x,k)=>x-endPoint[k]!))-4*pad>=high)continue;
   const b=compiled[i]!.bounds(end,options.absoluteToleranceMeters/8);low=Math.min(low,Math.max(0,I.adjacentFloat(lo[i]!+b.lower,false)));if(Number.isFinite(hi[i]!)&&Number.isFinite(b.upper))high=Math.min(high,I.adjacentFloat(hi[i]!+b.upper,true));}
  low=Math.max(0,low-pad);high+=pad;
  if(low<reach-4*pad&&high-low>options.absoluteToleranceMeters)throw RangeError(`Dumbbell intrinsic distance cannot meet its requested enclosure: ${high-low} m.`);
  return{scope:'global-reference-surface' as const,lowerBoundMeters:low,upperBoundMeters:high,evaluatedBoxes:0};
 }};
}
