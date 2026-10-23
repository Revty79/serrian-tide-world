// Read-only, bounded architecture probe. These Float64 vertices are diagnostic;
// this is not an interval-certified surface provider or a terrain implementation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createOctahedronGeometry} from '../src/surfaces/octahedron.ts';
import {polyhedronUnfoldings} from '../src/surfaces/polyhedron-path.ts';
import {preparedPolyhedronDistance} from '../src/surfaces/polyhedron-distance-prepared.ts';
import {triangularPolyhedronSampleCount} from '../src/terrain/triangular-polyhedron.ts';

const add=(a,b)=>a.map((x,k)=>x+b[k]);
const sub=(a,b)=>a.map((x,k)=>x-b[k]);
const mul=(a,s)=>a.map(x=>x*s);
const dot=(a,b)=>a.reduce((s,x,k)=>s+x*b[k],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const unit=a=>mul(a,1/norm(a));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);
const phi=(1+Math.sqrt(5))/2,vertices=[];
for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])vertices.push([x,y,z]);
for(const a of[-1,1])for(const b of[-1,1])vertices.push([0,a/phi,b*phi],[a/phi,b*phi,0],[a*phi,0,b/phi]);
assert.equal(vertices.length,20);
const supports=new Map();
for(let a=0;a<18;a++)for(let b=a+1;b<19;b++)for(let c=b+1;c<20;c++){
 const raw=cross(sub(vertices[b],vertices[a]),sub(vertices[c],vertices[a]));
 if(norm(raw)<1e-10)continue;
 let normal=unit(raw),offset=dot(normal,vertices[a]);
 if(offset<0){normal=mul(normal,-1);offset=-offset;}
 const distances=vertices.map(p=>dot(normal,p)-offset);
 if(distances.some(x=>x>1e-9))continue;
 const ids=distances.flatMap((x,i)=>Math.abs(x)<1e-9?[i]:[]);
 if(ids.length===5)supports.set(ids.join(','),{ids,normal,offset});
}
const faces=[...supports.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([_,f])=>{
 const center=mul(f.ids.map(i=>vertices[i]).reduce(add,[0,0,0]),1/5),e1=unit(sub(vertices[f.ids[0]],center)),e2=cross(f.normal,e1);
 const ids=f.ids.toSorted((a,b)=>Math.atan2(dot(sub(vertices[a],center),e2),dot(sub(vertices[a],center),e1))-Math.atan2(dot(sub(vertices[b],center),e2),dot(sub(vertices[b],center),e1)));
 const first=ids.indexOf(Math.min(...ids));
 return{...f,ids:[...ids.slice(first),...ids.slice(0,first)],center};
});
assert.equal(faces.length,12);
const edgeFaces=new Map(),adjacency=faces.map(()=>[]),edgeLength=2/phi;
let maximumEdgeError=0,maximumPlaneError=0,maximumAngleError=0;
for(const[f,face]of faces.entries()){
 assert.equal(face.ids.length,5);
 assert.ok(dot(cross(sub(vertices[face.ids[1]],vertices[face.ids[0]]),sub(vertices[face.ids[2]],vertices[face.ids[1]])),face.normal)>0);
 for(let k=0;k<5;k++){
  const current=vertices[face.ids[k]],next=vertices[face.ids[(k+1)%5]],prior=vertices[face.ids[(k+4)%5]];
  maximumEdgeError=Math.max(maximumEdgeError,Math.abs(norm(sub(next,current))-edgeLength));
  maximumPlaneError=Math.max(maximumPlaneError,Math.abs(dot(face.normal,current)-face.offset));
  const angle=Math.acos(dot(unit(sub(next,current)),unit(sub(prior,current))))*180/Math.PI;
  maximumAngleError=Math.max(maximumAngleError,Math.abs(angle-108));
  const key=[face.ids[k],face.ids[(k+1)%5]].sort((a,b)=>a-b).join(',');
  if(!edgeFaces.has(key))edgeFaces.set(key,[]);
  edgeFaces.get(key).push(f);
 }
 for(const p of vertices)assert.ok(dot(face.normal,p)<=face.offset+1e-9);
}
assert.equal(edgeFaces.size,30);assert.equal(20-30+12,2);
near(maximumEdgeError,0);near(maximumPlaneError,0);near(maximumAngleError,0);
const vertexDegrees=vertices.map((_,i)=>[...edgeFaces.keys()].filter(k=>k.split(',').map(Number).includes(i)).length);
assert.ok(vertexDegrees.every(x=>x===3));
const internalDihedralDegrees=[];
for(const owners of edgeFaces.values()){
 assert.equal(owners.length,2);const[a,b]=owners;
 adjacency[a].push(b);adjacency[b].push(a);
 internalDihedralDegrees.push(180-Math.acos(Math.max(-1,Math.min(1,dot(faces[a].normal,faces[b].normal))))*180/Math.PI);
}
for(const list of adjacency){list.sort((a,b)=>a-b);assert.equal(new Set(list).size,5);}
for(const angle of internalDihedralDegrees)near(angle,internalDihedralDegrees[0]);

// Dynamic programming counts routes without allocating a route, unfolding,
// interval placement or brush candidate. At most V*2^V states per endpoint;
// all additions use exact BigInt. Reaching the destination terminates a path,
// exactly like polyhedronUnfoldings.walk. This includes geometrically impossible
// routes because the accepted solver allocates them before portal exclusion.
function countRoutes(graph,start,end){
 const memo=new Map(),began=performance.now();
 function visit(current,mask){
  if(current===end)return{routes:1n,placements:1n,portals:0n};
  const key=mask*graph.length+current;if(memo.has(key))return memo.get(key);
  let routes=0n,placements=0n,portals=0n;
  for(const next of graph[current])if(!(mask&(1<<next))){
   const child=visit(next,mask|(1<<next));routes+=child.routes;
   placements+=child.placements+child.routes;portals+=child.portals+child.routes;
  }
  const result={routes,placements,portals};memo.set(key,result);return result;
 }
 const result=visit(start,1<<start);
 return{from:start,to:end,adjacent:graph[start].includes(end),...Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v.toString()])),memoStates:memo.size,elapsedMs:performance.now()-began};
}
const octa=createOctahedronGeometry({provider:'physical-regular-octahedron',version:1,identity:{worldId:'probe',surfaceId:'octa'},role:'exterior',edgeLengthMeters:1e6});
const octaAdjacency=octa.faces.map(from=>octa.faces.flatMap((to,i)=>from!==to&&octa.vertexIds(from).filter(v=>octa.vertexIds(to).includes(v)).length===2?[i]:[]));
const dodecaRoutes=adjacency.flatMap((_,to)=>to===0?[]:[countRoutes(adjacency,0,to)]),octaRoutes=octa.faces.flatMap((_,to)=>to===0?[]:[countRoutes(octaAdjacency,0,to)]);
const sourceFiles=['src/surfaces/polyhedron-path.ts','src/surfaces/polyhedron-distance-prepared.ts','src/surfaces/polyhedron-contract.ts','src/terrain/triangular-polyhedron.ts','src/rendering/pyramid-field.ts','src/rendering/polyhedron-presentation.ts','src/rendering/polyhedron-perspective-atlas.ts','src/rendering/triangular-polyhedron-view.ts'];
const sha=s=>createHash('sha256').update(s).digest('hex');
const pathSource=readFileSync(sourceFiles[0],'utf8');
assert.ok(pathSource.includes('options.maxBoxes??32768'));
assert.ok(pathSource.indexOf('all=filtered??polyhedronUnfoldings')<pathSource.indexOf("if(all.length>"));
const preparedSource=readFileSync(sourceFiles[1],'utf8');
assert.ok(preparedSource.indexOf('polyhedronUnfoldings(g,start.patchId,end.patchId).map')<preparedSource.indexOf('if(prepared.length>'));
const report={diagnosticOnly:true,certifiedGeometryProvider:false,vertexConstruction:'(+-1,+-1,+-1), (0,+-1/phi,+-phi), (+-1/phi,+-phi,0), (+-phi,0,+-1/phi)',geometry:{vertices,faces,edges:[...edgeFaces.keys()].map(s=>s.split(',').map(Number)),adjacency,vertexDegrees,edgeLength,maximumEdgeError,maximumPlaneError,maximumAngleError,internalDihedralDegrees},routePolicy:{currentDefaultMaxBoxes:32768,counting:'Exact BigInt dynamic programming over simple physical face paths; no interval route allocation',maximumMemoStatesPerEndpoint:12*2**12,productionAllocationAvoided:true},dodecaRoutes,octaReference:{faces:octa.faces,adjacency:octaAdjacency,routes:octaRoutes},sourceSha256:Object.fromEntries(sourceFiles.map(p=>[p,sha(readFileSync(p).toString().replaceAll('\r\n','\n'))]))};
const rejectedDetails=[];
for(const n of[128,256]){
 assert.throws(()=>triangularPolyhedronSampleCount({faces:faces.map((_,i)=>String(i)),vertices,edges:[...edgeFaces.keys()],isTriangle:()=>false},n),/actual triangular faces/);
 rejectedDetails.push(n);
}
report.samplingContract={existingTriangularAuthorityRejectsPentagonalFacesAt:rejectedDetails,noAuthorityAllocated:true};
if(process.argv.includes('--benchmark')){
 // Only the chart/incidence subset consumed by polyhedronUnfoldings is supplied.
 // Float64 chart vertices are enclosed as exact rounded inputs for timing, not
 // certified as the irrational regular solid. No distance/terrain/path is issued.
 const scale=1e6/edgeLength;
 const pairIds=faces[0].ids.filter(i=>faces[adjacency[0][0]].ids.includes(i));
 const ordered=faces.map((face,index)=>{
  if(index!==0&&index!==adjacency[0][0])return face;
  const at=face.ids.findIndex((id,k)=>pairIds.includes(id)&&pairIds.includes(face.ids[(k+1)%5]));assert.ok(at>=0);
  return{...face,ids:[...face.ids.slice(at),...face.ids.slice(0,at)]};
 });
 const frames=ordered.map(face=>{
  const origin=mul(vertices[face.ids[0]],scale),e1=unit(sub(vertices[face.ids[1]],vertices[face.ids[0]])),e2=cross(face.normal,e1);
  const chartVertices=face.ids.map(i=>{const d=sub(mul(vertices[i],scale),origin);return[dot(d,e1),dot(d,e2)];});
  chartVertices[0]=[0,0];chartVertices[1][1]=0;
  return{chartVertices,origin,e1,e2};
 });
 const model={faces:faces.map((_,i)=>String(i)),scaleMeters:1e6,identity:{worldId:'probe',surfaceId:'dodeca'},vertexIds:f=>ordered[Number(f)].ids,frame:f=>frames[Number(f)],chartVertexBounds:f=>frames[Number(f)].chartVertices.map(([x,y])=>[[x,x],[y,y]]),isTriangle:()=>false,normalize:p=>{assert.ok(p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1);return p;},aliases:p=>[p]};
 const f=frames[0],basis=f.chartVertices,vertexUv=basis.map(([x,y])=>{const v=y/basis[3][1];return[(x-v*basis[3][0])/basis[1][0],v];});
 assert.ok(vertexUv.some(([u,v])=>u<0||u>1||v<0||v>1));
 const u=.5,v=.25,ids=ordered[0].ids,affine=add(mul(vertices[ids[0]],scale),add(mul(sub(vertices[ids[1]],vertices[ids[0]]),scale*u),mul(sub(vertices[ids[3]],vertices[ids[0]]),scale*v))),weights=[(1-u)*(1-v),u*(1-v),u*v,(1-u)*v],bilinear=weights.map((w,k)=>mul(vertices[ids[k]],scale*w)).reduce(add,[0,0,0]),mismatch=norm(sub(affine,bilinear));
 assert.ok(mismatch>1000);
 report.chartContract={diagnosticBasis:'origin vertex0; u toward vertex1; v toward vertex3, as existing non-triangle nativePoint',representativeVertexUv:vertexUv,completePentagonFitsExistingUnitSquare:false,affineVersusFourVertexBilinearAt:{u,v,errorMeters:mismatch,edgeMeters:1e6},note:'This demonstrates incompatibility of the current triangle/quad interpretation, not impossibility of a correct future pentagonal provider.'};
 const measure=(g,from,to,expected)=>{
  global.gc?.();const before=process.memoryUsage(),started=performance.now();
  const routes=polyhedronUnfoldings(g,from,to),elapsedMs=performance.now()-started;
  assert.equal(BigInt(routes.length),BigInt(expected));
  global.gc?.();const after=process.memoryUsage();
  const warm=performance.now();assert.equal(polyhedronUnfoldings(g,from,to),routes);
  return{from,to,routeCount:routes.length,coldUnfoldingsMs:elapsedMs,warmCacheLookupMs:performance.now()-warm,retainedHeapDeltaBytes:after.heapUsed-before.heapUsed,rssDeltaBytes:after.rss-before.rss,retainedPlacementReferences:routes.reduce((n,r)=>n+r.placements.length,0),interpretation:'One geometry/directed-face-pair cache only. GC heap delta is process-local retained heap, not a browser memory measurement.'};
 };
 const octaPair=octaRoutes.find(r=>r.adjacent),dodecaPair=dodecaRoutes.find(r=>r.adjacent);
 report.unfoldingBenchmark={runtime:process.version,heapLimitFlag:process.execArgv,octa:measure(octa,octa.faces[0],octa.faces[octaPair.to],octaPair.routes),dodeca:measure(model,'0',String(dodecaPair.to),dodecaPair.routes)};
 const pentPosition=(face,t,inset)=>{
  const ids=model.vertexIds(face),shared=ids.slice(0,2),weights=ids.map(i=>shared.includes(i)?(1-inset)*(i===shared[0]?1-t:t):inset/3),physical=ids.map((id,k)=>mul(vertices[id],scale*weights[k])).reduce(add,[0,0,0]),f=model.frame(face),d=sub(physical,f.origin),point=[dot(d,f.e1),dot(d,f.e2)],a=f.chartVertices[1],b=f.chartVertices[3],v=point[1]/b[1],u=(point[0]-v*b[0])/a[0];
  return model.normalize({...model.identity,patchId:face,u,v});
 };
 const octaShared=octa.vertexIds(octa.faces[0]).filter(i=>octa.vertexIds(octa.faces[octaPair.to]).includes(i));
 const octaPosition=(face,t,inset)=>octa.fromWeights(face,new Map(octa.vertexIds(face).map(i=>[i,octaShared.includes(i)?(1-inset)*(i===octaShared[0]?1-t:t):inset])));
 const kernel=(g,from,to,position)=>{
  const first=position(from,.5,.02),targets=Array.from({length:64},(_,i)=>position(to,.45+.1*i/63,.01+.01*(i%4)/3));
  global.gc?.();const heapBefore=process.memoryUsage().heapUsed,began=performance.now();
  const firstResult=preparedPolyhedronDistance(g,first,targets[0],{}),coldPreparedMs=performance.now()-began;
  global.gc?.();const retainedHeapDeltaBytes=process.memoryUsage().heapUsed-heapBefore;
  const times=[],sourceChanges=[];let evaluatedRoutes=null;
  for(const p of targets){const at=performance.now(),result=preparedPolyhedronDistance(g,first,p,{});times.push(performance.now()-at);evaluatedRoutes=result?.evaluatedRoutes??result?.consideredRoutes??null;}
  for(let i=0;i<8;i++){const start=position(from,.48+i*.005,.02),at=performance.now();preparedPolyhedronDistance(g,start,targets[i],{});sourceChanges.push(performance.now()-at);}
  const summary=values=>{const sorted=values.toSorted((a,b)=>a-b);return{min:sorted[0],median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),sum:values.reduce((a,b)=>a+b,0)};};
  return{coldPreparedMs,retainedHeapDeltaBytes,warmEndpointQueries:64,warmEndpointMs:summary(times),warmEndpointSamplesMs:times,movingSourceQueries:8,movingSourceMs:summary(sourceChanges),movingSourceSamplesMs:sourceChanges,evaluatedRoutes,initialResultKind:firstResult&&'onlyRoutes'in firstResult?'requires full witness solver':'prepared result',note:'Kernel timing only on strictly interior near-join points. Diagnostic rounded pentagon chart; no certified distance, stroke, browser latency or terrain correctness is claimed.'};
 };
 report.preparedKernelBenchmark={octa:kernel(octa,octa.faces[0],octa.faces[octaPair.to],octaPosition),dodeca:kernel(model,'0',String(dodecaPair.to),pentPosition)};
 report.routePolicy.productionAllocationAvoided=false;
 report.routePolicy.benchmarkAllocationScope='One bounded adjacent-face-pair unfolding cache and one source prepared-distance cache; no full-face cache allocation';
}
const output=process.argv.slice(2).find(x=>!x.startsWith('--'))??'.local/dodecahedron-architecture.json';mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,geometry:{faces:faces.length,vertices:vertices.length,edges:edgeFaces.size},dodecaRouteCounts:dodecaRoutes.map(r=>r.routes),octaRouteCounts:octaRoutes.map(r=>r.routes),unfoldingBenchmark:report.unfoldingBenchmark,preparedKernelBenchmark:report.preparedKernelBenchmark},null,2));
