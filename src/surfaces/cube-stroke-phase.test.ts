import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cubePhaseLength,CUBE_PHASE_UNIT} from './cube-stroke-phase.ts';
import {cubeArcBudget,cubeNumberRational,cubeRational} from './cube-stroke-exact.ts';
import {createSolidCubeStrokePath,type CubeStrokePathEvent} from './solid-cube-stroke-path.ts';
import {SOLID_CUBE_CORNERS,SOLID_CUBE_PHYSICAL_EDGES,createSolidCubeGeometry,type SolidCubeConfiguration,type SolidCubePosition} from './solid-cube.ts';
import {createSolidCubeRouter} from './solid-cube-routing.ts';
const config:SolidCubeConfiguration={identity:{worldId:'phase',surfaceId:'exterior'},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:10};
const geometry=createSolidCubeGeometry(config),p=(u:number,v=0,patchId='pz')=>({...config.identity,patchId,u,v}) as SolidCubePosition;
function collect(points:readonly SolidCubePosition[],radius=4,placement:'exact'|'bounded-phase'='bounded-phase'){
 const path=createSolidCubeStrokePath(config,radius,{},placement),events:CubeStrokePathEvent[]=[];
 const drain=()=>{let e;while((e=path.take()))events.push(e);};
 for(const point of points){while(!path.accept(point)){path.pump();drain();}while(path.statistics.pendingInputs||path.statistics.activeRoute){path.pump();drain();}}
 path.release();while(path.status==='draining'){path.pump();drain();}assert.equal(path.status,'complete');
 return{path,dabs:events.filter(e=>e.kind==='dab'),routes:events.filter(e=>e.kind==='path')};
}
test('integer phase quantization satisfies independent nearest/even squared-midpoint inequalities',()=>{
 for(const exponent of[-2000,-200,-1,0,1,200,1000])for(const denominator of[1n,3n,31n]){
  const squared={n:1234567891234567n,d:denominator,exponent},spacing=exponent< -1000?1e-290:exponent>500?1e140:1.25;
  const k=cubePhaseLength(cubeArcBudget(),squared,spacing),b=cubeArcBudget(),q=cubeRational(b,squared),s=cubeNumberRational(b,spacing);
  const n=q.n*s.d*s.d*CUBE_PHASE_UNIT*CUBE_PHASE_UNIT,d=q.d*s.n*s.n;
  if(k>0n){const low=d*(2n*k-1n)**2n;assert.ok(4n*n>=low);if(4n*n===low)assert.equal(k%2n,0n);}
  const high=d*(2n*k+1n)**2n;assert.ok(4n*n<=high);if(4n*n===high)assert.equal(k%2n,0n);
 }
 for(const k of[0n,1n,2n,123456789n]){const n=2n*k+1n;assert.equal(cubePhaseLength(cubeArcBudget(),{n:n*n,d:1n,exponent:-130},1),k+(k%2n));}
});
test('3-4-5, edges, all corners, backtracking and collinear subdivisions retain physical routes and agree with exact centers within the disclosed bound',()=>{
 const cases:SolidCubePosition[][]=[[p(0),p(3,4)],[p(-3,-2),p(1,1),p(-1,2),p(0)],
  ...SOLID_CUBE_PHYSICAL_EDGES.map(e=>[p(0,0,e.face),p(0,0,e.toFace),p(0,0,e.face)]),
  ...SOLID_CUBE_CORNERS.map(c=>{const a=geometry.positionsForReference(c.signs.map(s=>s*5) as [number,number,number]);return[p(0,0,a[0]!.patchId),a[0]!,a[2]!,p(0,0,a[1]!.patchId)];})];
 for(const points of cases){const a=collect(points),b=collect(points,4,'exact');assert.equal(a.dabs.length,b.dabs.length);assert.deepEqual(a.routes.map(e=>e.route),b.routes.map(e=>e.route));
  a.dabs.forEach((dab,i)=>{const x=geometry.referencePosition(dab.center),y=geometry.referencePosition(b.dabs[i]!.center);assert.ok(Math.hypot(...x.map((v,j)=>v-y[j]!))<=(dab.spacingErrorBoundMeters??0)+2e-14);});
 }
 const sparse=collect([p(-4),p(4)],1),dense=collect(Array.from({length:257},(_,i)=>p(-4+i/32)),1);assert.deepEqual(sparse.dabs.map(d=>d.center),dense.dabs.map(d=>d.center));
});
test('owner-style independent circular bends exhaust legacy radical work but constant phase completes over 256 observations',()=>{
 const points=Array.from({length:1201},(_,i)=>p(3*Math.cos(i*Math.PI/100),3*Math.sin(i*Math.PI/100)));
 let failure:unknown;try{collect(points,1,'exact');}catch(error){failure=error;}
 assert.ok(failure instanceof Error);assert.match(failure.message,/work|limit/);
 const a=collect(points,1),b=collect(points,1);assert.equal(a.path.statistics.acceptedInputs,points.length);assert.equal(a.path.statistics.processedInputs,points.length);
 assert.equal(a.path.statistics.peakArcTerms,0);assert.ok(a.path.statistics.phaseBits!<90);assert.ok(a.path.statistics.spacingErrorBoundMeters!<1e-14);assert.deepEqual(a.dabs,b.dabs);
 // Independent analytic arc-count oracle: every identical angular step is a
 // chord of length 6*sin(pi/200); ordinary double error dominates the tick bound.
 const distance=1200*6*Math.sin(Math.PI/200);assert.equal(a.dabs.length,1+Math.floor(distance/.25));
 assert.ok(a.path.statistics.peakStepWork<200000);
});
test('exact lower-bound pruning preserves the complete canonical route set, including shared aliases, ties and reversals',()=>{
 const router=createSolidCubeRouter(config);let savedWork=0;
 const points=[p(0),p(0,0,'nx'),...SOLID_CUBE_CORNERS.flatMap(c=>geometry.positionsForReference(c.signs.map(s=>s*5) as [number,number,number])),
  ...SOLID_CUBE_PHYSICAL_EDGES.flatMap(e=>[p(1.234,-2.345,e.face),p(-3.12,4.01,e.toFace)])];
 for(let i=0;i<points.length;i++){const a=points[i]!,b=points[(i*13+17)%points.length]!,full=router.route(a,b),pruned=router.route(a,b,{pruneDominated:true});assert.deepEqual(pruned.routes,full.routes);assert.deepEqual(pruned.distanceSquared,full.distanceSquared);savedWork+=full.certificate.workUnits-pruned.certificate.workUnits;}
 assert.ok(savedWork>0);
});
