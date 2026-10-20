import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSolidCubeStrokePath,CUBE_STROKE_PATH_LIMITS,type CubeStrokePathEvent,type CubeStrokePathLimits} from './solid-cube-stroke-path.ts';
import {createSolidCubeGeometry,SOLID_CUBE_PROVIDER,SOLID_CUBE_FACES,SOLID_CUBE_PHYSICAL_EDGES,SOLID_CUBE_CORNERS,type SolidCubeConfiguration,type SolidCubeFace,type SolidCubePosition} from './solid-cube.ts';
import {createSolidCubeRouter} from './solid-cube-routing.ts';
import {cubeArcAdd,cubeArcBudget,cubeArcLength,cubeArcRational,cubeArcRound,cubeArcScale,cubeArcSign,cubeIntegerRoot} from './cube-stroke-exact.ts';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {prepareSolidCubeDab,type CubeBrushSettings} from '../terrain/solid-cube-brush.ts';

const identity={worldId:'cube-stroke-test',surfaceId:'exterior'};
const config:SolidCubeConfiguration={identity,provider:SOLID_CUBE_PROVIDER,version:1,configuration:'solid',role:'exterior',sideLengthMeters:10};
const geometry=createSolidCubeGeometry(config),router=createSolidCubeRouter(config);
const p=(patchId:SolidCubeFace,u=0,v=0):SolidCubePosition=>({...identity,patchId,u,v});
function collect(points:readonly SolidCubePosition[],radius=4,limits:CubeStrokePathLimits={}){
  const path=createSolidCubeStrokePath(config,radius,limits),events:CubeStrokePathEvent[]=[];
  const drain=()=>{for(;;){const event=path.take();if(!event)break;events.push(event);}};
  for(const point of points){while(!path.accept(point)){path.pump();drain();}}
  path.release();let pumps=0;
  while(path.status==='draining'){assert.ok(++pumps<50000);path.pump();drain();}
  assert.equal(path.status,'complete');assert.equal(path.statistics.acceptedInputs,points.length);assert.equal(path.statistics.processedInputs,points.length);
  assert.ok(path.statistics.peakStepWork<=CUBE_STROKE_PATH_LIMITS.maxStepWork);return {path,events,dabs:events.filter(e=>e.kind==='dab'),paths:events.filter(e=>e.kind==='path')};
}
test('exact radicals combine rational square classes without factorization; interval decisions and nearest/even',()=>{
  const b=cubeArcBudget(),a=cubeArcLength(b,{n:2n,d:1n,exponent:0}),half=cubeArcLength(b,{n:1n,d:2n,exponent:0});
  assert.equal(cubeArcSign(b,cubeArcAdd(b,a,cubeArcScale(b,half,{n:-2n,d:1n}))),0);
  assert.equal(cubeIntegerRoot(b,((1n<<300n)+17n)**2n+1n),(1n<<300n)+17n);
  assert.equal(cubeArcRound(b,cubeArcRational({n:(1n<<53n)+1n,d:1n<<53n})).value,1);
  assert.equal(cubeArcRound(b,cubeArcRational({n:(1n<<53n)+3n,d:1n<<53n})).value,1+2**-51);
  assert.equal(cubeArcRound(b,a).value,Math.SQRT2);
});
for(const face of SOLID_CUBE_FACES)test(`${face}: 3-4-5 physical stroke and exact endpoints`,()=>{
  const r=collect([p(face),p(face,3,4)],1);assert.equal(r.dabs.length,21);
  r.dabs.forEach((d,k)=>{assert.equal(d.ordinal,k);assert.equal(d.center.u,Number(BigInt(3*k))/20);assert.equal(d.center.v,Number(BigInt(4*k))/20);geometry.normalize(d.center);});
  assert.equal(r.paths[0]!.route.lengthMeters.lower,5);assert.deepEqual(r.dabs.at(-1)!.center,p(face,3,4));
});
for(const edge of SOLID_CUBE_PHYSICAL_EDGES)test(`${edge.edgeId}: spacing crosses real edge without extra seam dab`,()=>{
  const a=p(edge.face),b=p(edge.toFace),r=collect([a,b],4);assert.equal(r.dabs.length,11);
  const midpoint=r.dabs[5]!.center;assert.equal(geometry.aliases(midpoint).length,2);assert.equal(r.paths[0]!.route.crossings.length,1);
  assert.deepEqual(collect([a,midpoint,b],4).dabs.map(d=>d.center),r.dabs.map(d=>d.center));
  for(const d of r.dabs)geometry.normalize(d.center);
});
for(const corner of SOLID_CUBE_CORNERS)test(`${corner.cornerId}: exact singular corner input, aliases and explicit reset`,()=>{
  const aliases=geometry.positionsForReference(corner.signs.map(s=>s*5) as [number,number,number]);
  const a=aliases[0]!,opposite=geometry.positionsForReference(corner.signs.map(s=>-s*5) as [number,number,number])[0]!;
  const r=collect([p(a.patchId),a,aliases[2]!,opposite],8);
  assert.equal(r.path.statistics.duplicateInputs,1);assert.equal(r.paths.at(-1)!.policy,'corner-reset');assert.equal(r.paths.at(-1)!.ambiguity,6);
  assert.equal(new Set(r.dabs.map(d=>d.ordinal)).size,r.dabs.length);for(const d of r.dabs)geometry.normalize(d.center);
});
test('literal four-face 20m route retains all three certified crossings and reversed curve',()=>{
  const a=p('px',-4,-3),b=p('nx',-3,4),r=collect([a,b,a],4);
  assert.deepEqual(r.paths[0]!.route.faces,['px','ny','pz','nx']);assert.equal(r.paths[0]!.route.crossings.length,3);
  assert.equal(r.paths[0]!.route.lengthMeters.lower,20);assert.equal(r.dabs.length,41);
  assert.deepEqual(r.dabs.slice(0,21).map(d=>d.center),r.dabs.slice(20).reverse().map(d=>d.center));
});
test('continuation chooses an exactly aligned opposite-face route before canonical ordering; backtrack retraces',()=>{
  const r=collect([p('px',1,0),p('px'),p('nx'),p('px')],8),middle=r.paths[1]!;
  assert.equal(middle.ambiguity,4);assert.equal(middle.policy,'continuation');assert.equal(middle.route.faces[1],'ny');
  assert.equal(r.paths[2]!.policy,'exact-backtrack');assert.equal(r.paths[2]!.route.index,middle.route.index);
  assert.deepEqual(r.paths[2]!.route.faces,[...middle.route.faces].reverse());
});
test('unknown opposite-face intent has a visible deterministic policy and alias/reversal invariance',()=>{
  const a=collect([p('px'),p('nx')],8),b=collect([p('nx'),p('px')],8);
  assert.equal(a.paths[0]!.policy,'canonical-no-context');assert.equal(a.paths[0]!.route.index,b.paths[0]!.route.index);
  assert.deepEqual(a.dabs.map(d=>d.center),b.dabs.toReversed().map(d=>d.center));
});
test('irrational residuals remain exact across collinear input density changes and bends',()=>{
  const sparse=collect([p('px'),p('px',3,3),p('px',4,1)],1);
  const dense=collect([p('px'),p('px',.75,.75),p('px',1.5,1.5),p('px',3,3),p('px',3.5,2),p('px',4,1)],1);
  assert.deepEqual(dense.dabs.map(d=>d.center),sparse.dabs.map(d=>d.center));assert.equal(sparse.dabs.length,26);
  // Actual observed bend is different geography, not an event-density alias.
  assert.notDeepEqual(collect([p('px'),p('px',3,0),p('px',3,3)],1).dabs.map(d=>d.center),collect([p('px'),p('px',3,3)],1).dabs.map(d=>d.center));
});
test('many independent irrational bends retain the same rounded centers under exact midpoint subdivision',()=>{
  const points=Array.from({length:25},(_,i)=>p('px',-4+i/4,(i*i%31)/8-2));
  const dense=points.flatMap((q,i)=>i?[p('px',(q.u+points[i-1]!.u)/2,(q.v+points[i-1]!.v)/2),q]:[q]);
  assert.deepEqual(collect(points,4).dabs.map(d=>d.center),collect(dense,4).dabs.map(d=>d.center));
  assert.equal(collect([p('px',-1,-1),p('px'),p('nx')],8).paths.at(-1)!.policy,'canonical-context-tie');
});
test('radical class and integer budgets terminate explicitly, without guessed arithmetic',()=>{
  let arc=cubeArcRational({n:0n,d:1n}),count=0;
  assert.throws(()=>{for(let n=2;count<129;n++){
    let prime=true;for(let d=2;d*d<=n;d++)if(n%d===0){prime=false;break;}if(!prime)continue;
    const b=cubeArcBudget();arc=cubeArcAdd(b,arc,cubeArcLength(b,{n:BigInt(n),d:1n,exponent:0}));count++;
  }},/radical-term limit/);assert.equal(arc.length,128);
  assert.throws(()=>cubeIntegerRoot(cubeArcBudget(),1n<<16384n),/integer range/);
  for(const side of [1e-140,5e153]){
    const s=createSolidCubeStrokePath({...config,sideLengthMeters:side},side),events:CubeStrokePathEvent[]=[];
    s.accept(p('px'));s.accept(p('py'));s.release();while(s.status==='draining'){s.pump();for(;;){const e=s.take();if(!e)break;events.push(e);}}
    assert.equal(s.status,'complete');assert.equal(events.filter(e=>e.kind==='dab').length,5);
  }
});
test('residual crosses many short segments, duplicate observations and exact endpoint without a terminal stamp',()=>{
  const points=Array.from({length:81},(_,i)=>p('px',i/32,0)),r=collect(points,1);
  assert.equal(r.dabs.length,11);assert.equal(r.paths.length,80);assert.deepEqual(r.dabs.map(d=>d.center.u),Array.from({length:11},(_,i)=>i/4));
  const short=collect([p('px'),p('px',Number.MIN_VALUE),p('px',.125)],1);assert.equal(short.dabs.length,1);
  assert.equal(collect([p('px'),p('py',-5,0),p('py',0,0)],4).dabs.length,11);
});
test('near corners, near boundary ULPs, subnormal and long ambiguous paths remain physical',()=>{
  for(const points of [[p('px',5-2**-49,5-2**-49),p('nx',-5+2**-49,-5+2**-49)],
    [p('px',Number.MIN_VALUE),p('nx')],[p('px',5,-3),p('py',-5,4)],[p('px',-5,-5),p('px',5,5)]]){
    const r=collect(points,8);for(const d of r.dabs)geometry.normalize(d.center);
    for(const event of r.paths){const reference=router.route(event.from,event.to);assert.deepEqual(event.route,reference.routes[event.route.index]);}
  }
});
test('queue/output backpressure never thins accepted inputs; snapshots are immutable and cancellation releases state',()=>{
  const s=createSolidCubeStrokePath(config,4,{maxPendingInputs:2,maxOutputEvents:1});
  const point={...p('px')};assert.equal(s.accept(point),true);point.u=3;
  assert.equal(s.accept(p('py')),true);assert.equal(s.accept(p('pz')),false);assert.equal(s.statistics.acceptedInputs,2);
  s.pump();const before=s.statistics;s.pump();assert.deepEqual(s.statistics,before);assert.equal(s.take()!.kind,'dab');
  s.pump();assert.equal(s.statistics.activeRoute,true);s.cancel();assert.equal(s.status,'cancelled');assert.equal(s.take(),undefined);
  assert.equal(s.statistics.pendingInputs,0);assert.equal(s.statistics.activeRoute,false);assert.equal(s.statistics.retainedArcTerms,0);
  const cancelled=s.statistics;s.pump();assert.deepEqual(s.statistics,cancelled);assert.throws(()=>s.accept(p('px')));
});
test('input, route work, aggregate work, output and dab limits fail explicitly without partially complete path claims',()=>{
  for(const limits of [{maxAcceptedInputs:1},{maxStepWork:1},{maxTotalWork:1},{maxDabs:1}]){
    const s=createSolidCubeStrokePath(config,1,limits);assert.equal(s.accept(p('px')),true);
    if(limits.maxAcceptedInputs){assert.throws(()=>s.accept(p('nx')));}else{
      assert.equal(s.accept(p('nx')),true);s.release();assert.throws(()=>{for(let i=0;i<1000&&s.status==='draining';i++){s.pump();while(s.take());}});
    }
    assert.equal(s.status,'failed');assert.ok(s.failure);assert.equal(s.statistics.pendingInputs,0);assert.equal(s.statistics.retainedArcTerms,0);
  }
  for(const radius of [0,-1,Infinity,Number.MIN_VALUE,5*Number.MIN_VALUE])assert.throws(()=>createSolidCubeStrokePath(config,radius));
  for(const limits of [{maxStepWork:200001},{maxPendingInputs:0},{maxDabs:4097}])assert.throws(()=>createSolidCubeStrokePath(config,1,limits));
  const s=createSolidCubeStrokePath(config,1);assert.throws(()=>s.accept({...p('px'),worldId:'foreign'}));assert.equal(s.status,'failed');
  const empty=createSolidCubeStrokePath(config,1);empty.release();empty.pump();assert.equal(empty.status,'complete');assert.equal(empty.statistics.dabs,0);
});
for(const n of [128,256])test(`N${n}: all four C1 tools prepare exactly at emitted centers without writes or history`,()=>{
  const t=createSolidCubeTerrain({terrainId:`stroke-${n}`,geometry:config,cellsPerEdge:n});
  // Constant background plus physical neighbor variation exercises Smooth too.
  for(const index of [0,1,2,Math.floor(t.sampleCount/2)])t.write(t.keyAt(index),100+index%31);
  const source=new Uint32Array(t.copyElevations().buffer),revision=t.revision;
  const r=collect([p('px',4.9,0),p('py',-4.9,0)],.4);
  const tools:CubeBrushSettings[]=[{version:1,tool:'raise',radiusMeters:.4,strengthMeters:20},{version:1,tool:'lower',radiusMeters:.4,strengthMeters:20},
    {version:1,tool:'smooth',radiusMeters:.4,intensity:.8},{version:1,tool:'flatten',radiusMeters:.4,intensity:.7,targetElevation:43}];
  for(const d of r.dabs)for(const tool of tools){
    const a=prepareSolidCubeDab(t,d.center,tool),b=prepareSolidCubeDab(t,geometry.aliases(d.center).at(-1)!,tool);
    while(a.status==='preparing')a.pump(17);while(b.status==='preparing')b.pump(256);
    assert.equal(a.status,'ready');assert.equal(b.status,'ready');assert.deepEqual([...a.preparedChanges(t)],[...b.preparedChanges(t)]);
    assert.equal(a.sourceRevision,revision);assert.equal(a.statistics.writes,0);a.cancel();b.cancel();
  }
  assert.equal(t.revision,revision);assert.deepEqual(new Uint32Array(t.copyElevations().buffer),source);
});
