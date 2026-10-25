import type {SurfacePosition} from './contracts.ts';
import type {RibbonGeometry} from './ribbon.ts';
import {polyhedronPositionBounds,polyhedronPhysicalLength} from './polyhedron-physical-bounds.ts';
import {polyhedronUnfoldings,polyhedronRouteCertificate,reconstructPolyhedronPath} from './polyhedron-path.ts';
import {preparePolyhedronRouteEnclosures} from './polyhedron-distance-prepared.ts';
import type {PolyhedronPhysicalBounds} from './polyhedron-contract.ts';
import * as I from './pyramid-interval.ts';
export {ribbonPointerInputs} from './ribbon-material.ts';

type Routes=ReturnType<typeof polyhedronUnfoldings>;
type B=PolyhedronPhysicalBounds;
interface Certificate {lowerBoundMeters:number;upperBoundMeters:number;evaluatedBoxes:number;scope:'global-reference-surface'}
const preparationBudget={maxExpansions:8192,maxRoutes:2048};
function sharedConvexFace(g:RibbonGeometry,a:SurfacePosition,b:SurfacePosition){const ra=g.region(a.patchId);if(ra.endsWith('end')&&ra===g.region(b.patchId))return{a,b};const first=g.aliases(a);for(const q of g.aliases(b)){const p=first.find(p=>g.physicalFaceId(p.patchId)===g.physicalFaceId(q.patchId));if(p)return{a:p,b:q};}return undefined;}
const midpoint=(a:B,b:B)=>a.map((x,k)=>I.multiply(I.add(x,b[k]!),I.exact(.5))) as unknown as B;
function boxDistance(p:B,vertices:readonly B[]){
 let squared=I.exact(0);for(let k=0;k<3;k++){const box:I.Interval=[Math.min(...vertices.map(v=>v[k]![0])),Math.max(...vertices.map(v=>v[k]![1]))],gap=Math.max(0,I.subtract(p[k]!,box)[0],I.subtract(box,p[k]!)[0]);squared=I.add(squared,I.square(I.exact(gap)));}return Math.max(0,I.root(squared)[0]);
}
interface Edge {lower:number;upper:number;routes:Routes;a?:SurfacePosition;b?:SurfacePosition}
interface Query {start:SurfacePosition;reach:number;faces:readonly string[];vertices:readonly SurfacePosition[];boxes:number;placements:number;prepared:Map<string,{routes:Routes;at:ReturnType<typeof preparePolyhedronRouteEnclosures>}>;fixed:Map<string,Edge>}
const queries=new WeakMap<RibbonGeometry,Query>();
export function ribbonDistanceResources(g:RibbonGeometry){const q=queries.get(g);return{faces:q?.faces.length??0,vertices:q?.vertices.length??0,compiledEntries:q?.prepared.size??0,compiledPlacements:q?.placements??0};}
const edgeWalkBounds=new WeakMap<RibbonGeometry,number>();
function edgeWalkUpper(g:RibbonGeometry){let value=edgeWalkBounds.get(g);if(value===undefined){let sum=I.exact(0);for(const[i,j]of g.edges)sum=I.add(sum,polyhedronPhysicalLength(g.physicalVertexBounds(i),g.physicalVertexBounds(j)));value=I.add(sum,I.exact(2*g.maximumLatticeEdgeMeters))[1];value=I.adjacentFloat(value+g.scaleMeters*1e-8,true);edgeWalkBounds.set(g,value);}return value;}
/** Every route shorter than reach lies in the ambient reach ball. Only a
 * certified triangle-box exclusion can remove a chart; unresolved cells remain.
 * This is a complete domain proof, never an influential ambient distance. */
function query(g:RibbonGeometry,start:SurfacePosition,reach:number,maxBoxes:number){
 let old=queries.get(g);if(old&&old.start.patchId===start.patchId&&old.start.u===start.u&&old.start.v===start.v&&old.reach===reach)return{state:old,boxes:0};
 const p=polyhedronPositionBounds(g,start),station=g.stationBounds(start);let boxes=0;
 const possible=(v:readonly B[],depth:number):boolean=>{
  if(++boxes>Math.min(16384,maxBoxes))throw RangeError('Ribbon domain preparation budget exhausted.');
  if(boxDistance(p,v)>=reach)return false;
  if(depth===0||v.some(q=>polyhedronPhysicalLength(p,q)[1]<reach))return true;
  const[a,b,c]=v as readonly[B,B,B],ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
  return possible([a,ab,ca],depth-1)||possible([ab,b,bc],depth-1)||possible([ca,bc,c],depth-1)||possible([ab,bc,ca],depth-1);
 };
 const faces=g.faces.filter(face=>g.faceLongitudinalLowerBound(station,face)<reach&&possible(g.vertexIds(face).map(i=>g.physicalVertexBounds(i)),6));
 if(!faces.includes(start.patchId)||faces.length>32)throw RangeError('Ribbon brush exceeds the qualified local face domain.');
 const sourceWeights=g.weights(start),sourceIds=g.vertexIds(start.patchId),sourceVertex=sourceWeights.findIndex(w=>w===1),vertices=g.vertices.flatMap((_,id)=>id!==(sourceVertex<0?-1:sourceIds[sourceVertex])&&g.vertexLongitudinalLowerBound(station,id)<reach&&polyhedronPhysicalLength(p,g.physicalVertexBounds(id))[0]<reach?[g.fromWeights(faces.find(f=>g.vertexIds(f).includes(id))!,new Map([[id,1]]))!]:[]);
 if(vertices.length>8)throw RangeError('Ribbon brush reaches too many material vertices.');
 old={start,reach,faces,vertices,boxes,placements:0,prepared:new Map(),fixed:new Map()};queries.set(g,old);return{state:old,boxes};
}
function prepared(g:RibbonGeometry,q:Query,a:SurfacePosition,b:SurfacePosition){
 const support=(p:SurfacePosition)=>g.vertexIds(p.patchId).filter((_,i)=>g.weights(p)[i]!==0),A=support(a),B=support(b),key=[a.patchId,a.u,a.v,b.patchId,B.join(',')].join('|');let value=q.prepared.get(key);
 if(!value){const routes=polyhedronUnfoldings(g,a.patchId,b.patchId,q.faces,preparationBudget).filter(r=>!r.edges.length||!A.every(id=>r.edges[0]!.includes(id))&&!B.every(id=>r.edges.at(-1)!.includes(id))),cost=routes.reduce((s,r)=>s+r.placements.length,0);if(q.prepared.size>=1024||q.placements+cost>8192)throw RangeError('Ribbon compiled route storage budget exhausted.');value={routes,at:preparePolyhedronRouteEnclosures(g,a,routes)};q.prepared.set(key,value);q.placements+=cost;}
 return value;
}
/** A vertex-free geodesic has a first/last nonzero segment in some actual
 * endpoint chart. Visit those aliases directly and exclude redundant zero-length
 * endpoint portals. This removes grazing lower candidates without deleting any
 * physical route; saddle-vertex propagation remains in the complete graph. */
function edgeBounds(g:RibbonGeometry,q:Query,from:SurfacePosition,to:SurfacePosition,tolerance:number,maxBoxes:number):Edge{
 let lower=Infinity,upper=Infinity,best:{a:SurfacePosition;b:SurfacePosition;routes:Routes}|undefined;
 for(const a of g.aliases(from))for(const b of g.aliases(to)){
  const p=prepared(g,q,a,b),e=p.at(b);let hi=e.upper;
  if(!Number.isFinite(hi)&&e.surviving.length){try{hi=polyhedronRouteCertificate(g,a,b,e.surviving,{absoluteToleranceMeters:tolerance,maxBoxes}).upperBoundMeters;}catch(error){if(!(error instanceof RangeError))throw error;}}
  lower=Math.min(lower,e.lower);if(hi<upper){upper=hi;best={a,b,routes:e.surviving};}
 }return{lower,upper,routes:best?.routes??[],a:best?.a,b:best?.b};
}
function shortest(edges:readonly(readonly{lower:number;upper:number}[])[],field:'lower'|'upper'){
 const distances=edges.map(()=>Infinity),previous=edges.map(()=>-1),done=new Set<number>();distances[0]=0;
 for(let k=0;k<edges.length;k++){let at=-1;for(let i=0;i<edges.length;i++)if(!done.has(i)&&(at<0||distances[i]!<distances[at]!))at=i;if(at<0||!Number.isFinite(distances[at]!))break;done.add(at);for(let j=0;j<edges.length;j++){if(done.has(j))continue;const w=edges[at]![j]![field];if(!Number.isFinite(w))continue;const bounds=I.add(I.exact(distances[at]!),I.exact(w)),v=Math.max(0,bounds[field==='lower'?0:1]);if(v<distances[j]!){distances[j]=v;previous[j]=at;}}}
 const path:number[]=[];if(Number.isFinite(distances.at(-1)!)){let at=edges.length-1;while(at>=0){path.unshift(at);at=previous[at]!;}}
 return{length:distances.at(-1)!,path};
}
/** A shortest polyhedral route is straight between material vertices. All
 * vertex-free unfoldings in the complete ball domain, plus propagation through
 * every reachable vertex, cover both ordinary routes and saddle-vertex routes.
 * Graph edges are certified continuous surface paths, not lattice edges. */
function solve(g:RibbonGeometry,a:SurfacePosition,b:SurfacePosition,options:{absoluteToleranceMeters?:number;maxBoxes?:number;reachMeters?:number}={}){
 const start=g.normalize(a),end=g.normalize(b),reach=options.reachMeters??g.minimumDimensionMeters*.24,tolerance=options.absoluteToleranceMeters??g.scaleMeters*1e-6,maxBoxes=options.maxBoxes??32768;
 if(!Number.isFinite(reach)||reach<=0||reach>g.minimumDimensionMeters*.24||!Number.isFinite(tolerance)||tolerance<g.scaleMeters*Number.EPSILON*65536||!Number.isInteger(maxBoxes)||maxBoxes<1||maxBoxes>32768)throw RangeError('Unsupported Ribbon distance range, precision or budget.');
 const direct=polyhedronPhysicalLength(polyhedronPositionBounds(g,start),polyhedronPositionBounds(g,end));
 const common=sharedConvexFace(g,start,end);
 if(common)return{certificate:{scope:'global-reference-surface' as const,lowerBoundMeters:Math.max(0,direct[0]),upperBoundMeters:direct[1],evaluatedBoxes:0},start,end,legs:[{a:common.a,b:common.b,routes:undefined}]};
 const {state:q,boxes}=query(g,start,reach,maxBoxes),nodes=[start,...q.vertices,end];
 const edges=nodes.map((from,i)=>nodes.map((to,j)=>{
  if(i===j)return{lower:0,upper:0,routes:[] as Routes};if(i===nodes.length-1||j===0||!q.faces.includes(from.patchId)||!q.faces.includes(to.patchId))return{lower:Infinity,upper:Infinity,routes:[] as Routes};
  const key=i+','+j,cached=j<nodes.length-1?q.fixed.get(key):undefined;if(cached)return cached;
  const common=sharedConvexFace(g,from,to);if(common){const d=polyhedronPhysicalLength(polyhedronPositionBounds(g,from),polyhedronPositionBounds(g,to)),edge={lower:Math.max(0,d[0]),upper:d[1],routes:[] as Routes,a:common.a,b:common.b};if(j<nodes.length-1)q.fixed.set(key,edge);return edge;}
  const edge=edgeBounds(g,q,from,to,tolerance,maxBoxes);if(j<nodes.length-1)q.fixed.set(key,edge);return edge;
 }));
 const lo=shortest(edges,'lower'),hi=shortest(edges,'upper'),guard=65536*Number.EPSILON*g.scaleMeters;
 const lower=Math.max(0,Math.min(reach,lo.length-guard)),upper=hi.length+guard;
 // Connected boundary edge walks supply a conservative finite upper witness
 // when no route inside this qualified ball is relevant to the brush.
 if(lower>=reach-guard&&(!Number.isFinite(upper)||upper>=reach))return{certificate:{scope:'global-reference-surface' as const,lowerBoundMeters:Math.max(0,reach-guard),upperBoundMeters:edgeWalkUpper(g),evaluatedBoxes:boxes},start,end,legs:undefined};
 if(!Number.isFinite(upper)||upper<lower||upper-lower>tolerance)throw new RangeError(`Ribbon route certificate remains unresolved (${upper-lower} m; ${q.faces.length} faces, ${q.vertices.length} vertices).`,{cause:{start,end,reach,lower,upper,nodes,lowerPath:lo.path,upperPath:hi.path,edges:edges.map(row=>row.map(e=>({lower:e.lower,upper:e.upper,routes:e.routes.length})))}});
 const legs=hi.path.slice(1).map((j,k)=>{const i=hi.path[k]!,e=edges[i]![j]!;return{a:e.a??nodes[i]!,b:e.b??nodes[j]!,routes:e.routes};});
 return{certificate:{scope:'global-reference-surface' as const,lowerBoundMeters:lower,upperBoundMeters:upper,evaluatedBoxes:boxes},start,end,legs};
}
export function ribbonDistance(g:RibbonGeometry,a:SurfacePosition,b:SurfacePosition,options:{absoluteToleranceMeters?:number;maxBoxes?:number;reachMeters?:number}={}):Certificate{return solve(g,a,b,options).certificate;}
export function ribbonPath(g:RibbonGeometry,a:SurfacePosition,b:SurfacePosition,options:{version:1;absoluteToleranceMeters?:number;maxBoxes?:number;reachMeters?:number}){
 const result=solve(g,a,b,options);if(!result.legs)throw RangeError('Ribbon pointer interval exceeds the qualified surface route.');
 const paths=result.legs.map(leg=>{let routes=leg.routes;if(!routes?.length){const domain=g.faces.filter(f=>g.aliases(leg.a).some(p=>p.patchId===f)||g.aliases(leg.b).some(p=>p.patchId===f)||g.physicalFaceId(f)===g.physicalFaceId(leg.a.patchId)||g.region(leg.a.patchId).endsWith('end')&&g.region(leg.a.patchId)===g.region(leg.b.patchId)&&g.region(f)===g.region(leg.a.patchId));routes=polyhedronUnfoldings(g,leg.a.patchId,leg.b.patchId,domain,preparationBudget);}return reconstructPolyhedronPath(g,leg.a,leg.b,options,routes);});
 if(paths.length===1)return paths[0]!;
 // Reuse the existing path representation and per-leg reconstruction. Zero
 // length vertex portals are retained in the route proof, not as new terrain.
 const lengths=paths.map(p=>p.lengthMeters),total=lengths.reduce((s,x)=>s+x,0);
 return Object.freeze({end:result.end,pieces:paths.flatMap(p=>p.pieces),lengthMeters:total,lengthUpperBoundMeters:result.certificate.upperBoundMeters,lengthErrorBoundMeters:result.certificate.upperBoundMeters-result.certificate.lowerBoundMeters,distance:{evaluatedBoxes:result.certificate.evaluatedBoxes},atDistance(meters:number,boundary:'incoming'|'outgoing'='outgoing'){if(!Number.isFinite(meters)||meters<0||meters>total)throw RangeError('Ribbon path position is outside its length.');let offset=0;for(let i=0;i<paths.length;i++){if(meters<offset+lengths[i]!||i===paths.length-1||meters===offset+lengths[i]!&&boundary==='incoming')return paths[i]!.atDistance(Math.max(0,Math.min(lengths[i]!,meters-offset)),boundary);offset+=lengths[i]!;}throw Error('Ribbon path has no leg.');}});
}
