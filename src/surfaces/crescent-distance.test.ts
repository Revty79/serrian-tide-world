import{test}from'node:test';import assert from'node:assert/strict';
import{createCrescentGeometry}from'./crescent.ts';import{CRESCENT_DEFAULT_DIMENSIONS}from'../terrain/crescent.ts';
import{crescentDistance,crescentPath,crescentCapPosition,crescentWallPosition,crescentPlanarRoute,crescentProjectionLowerBound,crescentPointerInputs}from'./crescent-distance.ts';
import type{SurfacePosition}from'./contracts.ts';
const g=createCrescentGeometry({...CRESCENT_DEFAULT_DIMENSIONS,identity:{worldId:'crescent',surfaceId:'boundary'},provider:'physical-prismatic-crescent',version:1,role:'exterior'});
const middle=(v:readonly[number,number])=>(v[0]+v[1])/2;
function verify(a:SurfacePosition,b:SurfacePosition,expected?:number){const c=crescentDistance(g,a,b,{absoluteToleranceMeters:.1});assert.ok(c.upperBoundMeters-c.lowerBoundMeters<=.1);if(expected!==undefined)assert.ok(c.lowerBoundMeters<=expected&&c.upperBoundMeters>=expected,JSON.stringify({c,expected}));const reverse=crescentDistance(g,b,a,{absoluteToleranceMeters:.1});assert.ok(Math.max(c.lowerBoundMeters,reverse.lowerBoundMeters)<=Math.min(c.upperBoundMeters,reverse.upperBoundMeters));const path=crescentPath(g,a,b);assert.ok(path.lengthUpperBoundMeters>=path.lengthMeters);assert.deepEqual(path.atDistance(0).position,g.normalize(a));assert.deepEqual(path.atDistance(path.lengthMeters).position,g.normalize(b));let prior=g.referencePosition(a),sum=0;for(let i=1;i<=100;i++){const p=path.atDistance(path.lengthMeters*i/100),q=g.referencePosition(p.position);sum+=Math.hypot(...q.map((v,k)=>v-prior[k]!));prior=q;}assert.ok(sum<=path.lengthUpperBoundMeters+.01);assert.ok(sum>=path.lengthMeters*.98);return c;}
test('Crescent coplanar cap distance is the true polygon-domain geodesic, never a chord through the opening',()=>{
 const a=g.outline[g.outer[1]!]!,b=g.outline[g.outer[31]!]!,route=crescentPlanarRoute(g,a,b),chord=Math.hypot(a[0]-b[0],a[1]-b[1]);assert.ok(route.bounds[0]>chord*1.5);assert.ok(route.points.length>2);
 const first=crescentCapPosition(g,a,1),last=crescentCapPosition(g,b,1);verify(first,last,middle(route.bounds));assert.ok(crescentProjectionLowerBound(g,first,last)>chord*1.5);
 const p=crescentCapPosition(g,[1000000,0],1),q=crescentCapPosition(g,[1000000,10000],1);verify(p,q,10000);
});
test('Crescent wall metric unfolds actual perimeter and axial length, including wall strip joins',()=>{
 const n=g.outline.length,a=crescentWallPosition(g,15,.9,0),b=crescentWallPosition(g,16,.1,5000),ds=(g.perimeterOffsets[16]!-g.perimeterOffsets[15]!)*.1+(g.perimeterOffsets[17]!-g.perimeterOffsets[16]!)*.1;assert.equal(verify(a,b,Math.hypot(ds,5000)).method,'developed-wall');
 verify(crescentWallPosition(g,n-1,.9,0),crescentWallPosition(g,0,.1,0));
});
test('Crescent cap/wall hinge uses physical unfolded distance on both upper and underside',()=>{
 const i=16,a=g.outline[i]!,b=g.outline[i+1]!,v=[b[0]-a[0],b[1]-a[1]] as const,l=Math.hypot(...v),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
 for(const sign of[1,-1]as const){const cap=crescentCapPosition(g,[x-v[1]/l*5000,z+v[0]/l*5000],sign),wall=crescentWallPosition(g,i,.5,sign*95000);assert.equal(verify(cap,wall,10000).method,'certified-hinge');}
});
test('Crescent concave and tip cones handle valid physical cross-surface routes without global face enumeration',()=>{
 for(const vertex of[0,1,16,32,48,63]){const previous=(vertex+63)%64;for(const sign of[1,-1]as const){const a=crescentWallPosition(g,previous,.99,sign*99000),b=crescentWallPosition(g,vertex,.01,sign*99000),c=verify(a,b);assert.match(c.method,/certified-vertex-cone|certified-saddle-apex/);}}
});
test('Crescent routing rejects unsupported nonlocal through-material transitions explicitly',()=>{
 const a=crescentCapPosition(g,[1000000,0],1),b=crescentCapPosition(g,[1000000,0],-1);assert.throws(()=>crescentDistance(g,a,b),/certified local/);
});
test('Crescent cached source locations still reject a foreign World or surface',()=>{const a=crescentCapPosition(g,[1000000,0],1),b=crescentCapPosition(g,[1000000,10000],1);crescentDistance(g,a,b);assert.throws(()=>crescentDistance(g,{...a,worldId:'foreign'},b),/Foreign/);assert.throws(()=>crescentDistance(g,{...a,surfaceId:'foreign'},b),/Foreign/);});
test('Crescent compressed pointer input follows actual material before unchanged local guards',()=>{for(const[a,b]of[[crescentCapPosition(g,[1000000,-200000],1),crescentCapPosition(g,[1000000,200000],1)],[crescentWallPosition(g,15,.1,0),crescentWallPosition(g,17,.9,0)],[crescentCapPosition(g,[1000000,0],1),crescentWallPosition(g,16,.5,0)]]){const points=crescentPointerInputs(g,a!,b!,50000);assert.ok(points.length>1&&points.length<=256);assert.deepEqual(points.at(-1),g.normalize(b!));let prior=a!;for(const p of points){const c=crescentDistance(g,prior,p);assert.ok(c.upperBoundMeters<50000);prior=p;}}assert.throws(()=>crescentPointerInputs(g,crescentCapPosition(g,[1000000,-200000],1),crescentCapPosition(g,[1000000,200000],1),1),/budget/);});
test('Crescent bounded prism search includes the feasible wall-only class near a cap',()=>{const a=crescentWallPosition(g,30,.8,95000),b=crescentWallPosition(g,31,.2,95000),feasible=.2*(g.perimeterOffsets[31]!-g.perimeterOffsets[30]!)+.2*(g.perimeterOffsets[32]!-g.perimeterOffsets[31]!),c=verify(a,b);assert.ok(c.upperBoundMeters<=feasible+.01);});
test('Crescent concave saddle paths may genuinely pass through the material-boundary vertex',()=>{const i=48,a=g.outline[i]!,next=g.outline[(i+1)%64]!,previous=g.outline[(i+63)%64]!,out=[next[0]-a[0],next[1]-a[1]]as const,back=[previous[0]-a[0],previous[1]-a[1]]as const;let beta=Math.atan2(out[0]*back[1]-out[1]*back[0],out[0]*back[0]+out[1]*back[1]);if(beta<0)beta+=2*Math.PI;assert.ok(beta>Math.PI);const theta=Math.atan2(out[1],out[0])+beta/2,p=crescentCapPosition(g,[a[0]+500*Math.cos(theta),a[1]+500*Math.sin(theta)],1),q=crescentWallPosition(g,i,0,99500),c=verify(p,q,1000);assert.equal(c.method,'certified-saddle-apex');});
