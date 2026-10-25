import {test} from 'node:test';import assert from 'node:assert/strict';
import {crescentCutGlobeGeometry as geometry,CRESCENT_CUT_GLOBE_DEFAULTS as defaults,cutGlobePosition as position,cutGlobeNormal as normal,cutGlobeGradient as gradient,cutGlobeRegion as region,cutGlobeDistance as distance,cutGlobeRim as rim,cutGlobeMeasures as measures,traceCutGlobe as trace,cutGlobeVisible as visible} from './crescent-cut-globe.ts';
import {cross3,dot3,unitDirection,type Vec3} from './cube-sphere.ts';import {greatCircleArc} from './great-circle.ts';
const near=(a:number,b:number,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
let seed=57821;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}const vector=():Vec3=>unitDirection([random()*2-1,random()*2-1,random()*2-1]);
for(const separationRatio of [.25,.6,1,1.5])for(const [longitudeDegrees,latitudeDegrees] of [[0,0],[71,-39],[-180,90]])test(`true boundary, normals, seam and metric d=${separationRatio} orientation=${longitudeDegrees},${latitudeDegrees}`,()=>{
 const g=geometry({...defaults,separationRatio,longitudeDegrees:longitudeDegrees!,latitudeDegrees:latitudeDegrees!}),a=g.axis,d=separationRatio;
 for(let i=0;i<800;i++){const p=vector(),q=position(g,p),n=normal(g,p),cut=region(g,p)==='cut',b=q.map((v,j)=>v-d*a[j]!) as unknown as Vec3;
  if(cut){near(Math.hypot(...b),1);assert.ok(Math.hypot(...q)<=1+1e-12);near(dot3(n,b),-1);}else{near(Math.hypot(...q),1);assert.ok(Math.hypot(...b)>=1-1e-12);near(dot3(n,q),1);}
  const inv=cut?q.map((v,j)=>v+(d-2*dot3(q,a))*a[j]!) as unknown as Vec3:q;for(let j=0;j<3;j++)near(inv[j]!,p[j]!);
  const tangent=unitDirection(cross3(p,Math.abs(p[2])<.9?[0,0,1]:[0,1,0])),t=gradient(g,p,tangent);near(dot3(n,t),0);near(Math.hypot(...t),1);
  // A material-normal epsilon step always leaves A\B; its opposite enters it.
  const free=q.map((v,j)=>v+n[j]!*1e-6),solid=q.map((v,j)=>v-n[j]!*1e-6);assert.ok(Math.hypot(...free)>1||Math.hypot(...free.map((v,j)=>v-d*a[j]!))<1);assert.ok(Math.hypot(...solid)<1&&Math.hypot(...solid.map((v,j)=>v-d*a[j]!))>1);
 }
 for(let i=0;i<100;i++){const p=rim(g,i*Math.PI/50);near(dot3(p,a),d/2);near(Math.hypot(...p),1);near(Math.hypot(...p.map((v,j)=>v-d*a[j]!)),1);for(let j=0;j<3;j++)near(position(g,p)[j]!,p[j]!);}
 const m=measures(g);near(m.retainedAreaMeters2+m.cutAreaMeters2,4*Math.PI*g.radiusMeters**2);assert.ok(m.volumeMeters3>0&&m.remainingVolumeFraction<1);near(m.axialMaterialMeters,d*g.radiusMeters);
});
test('folded great circles preserve length on the real exterior including repeated seam crossings',()=>{
 for(const d of [.25,.6,1.5]){const g=geometry({...defaults,separationRatio:d});for(let k=0;k<15;k++){const a=vector(),b=vector(),arc=greatCircleArc(a,b);let length=0,previous=position(g,a);const steps=20000,tangent=unitDirection(cross3(cross3(a,b),a)),aa=dot3(a,g.axis),bb=dot3(tangent,g.axis),phase=Math.atan2(bb,aa),alpha=Math.acos(Math.min(1,(d/2)/Math.hypot(aa,bb))),splits=Array.from({length:steps},(_,i)=>(i+1)/steps);if(Math.hypot(aa,bb)>=d/2)for(const k of [-1,0,1])for(const t of [phase-alpha+k*2*Math.PI,phase+alpha+k*2*Math.PI])if(t>0&&t<arc.angle)splits.push(t/arc.angle);splits.sort((x,y)=>x-y);for(const t of splits){const q=position(g,arc.at(t));length+=Math.hypot(...q.map((v,j)=>v-previous[j]!));previous=q;}near(length*g.radiusMeters,distance(g,a,b),1e-8);}}
});
test('near opposing material banks do not become a chord shortcut',()=>{const g=geometry({...defaults,separationRatio:.25}),a:Vec3=[-1,0,0],b:Vec3=[1,0,0];near(Math.hypot(...position(g,a).map((v,i)=>v-position(g,b)[i]!)),.25);near(distance(g,a,b),Math.PI*g.radiusMeters);});
test('a shortest route between retained-bank points can enter and leave the actual concave cap',()=>{const g=geometry(defaults),x=.29,r=Math.sqrt(1-x*x),a:Vec3=[x,r*Math.sin(.5),r*Math.cos(.5)],b:Vec3=[x,-r*Math.sin(.5),r*Math.cos(.5)],arc=greatCircleArc(a,b);assert.equal(region(g,a),'retained');assert.equal(region(g,b),'retained');assert.equal(region(g,arc.at(.5)),'cut');let crossings=0,previous=region(g,a);for(let i=1;i<=1000;i++){const p=arc.at(i/1000),bank=region(g,p),q=position(g,p);if(bank!==previous)crossings++;if(bank==='cut')near(Math.hypot(...q.map((v,j)=>v-g.separationRatio*g.axis[j]!)),1);previous=bank;}assert.equal(crossings,2);near(distance(g,a,b),arc.angle*g.radiusMeters);});
test('orthographic first intersections agree with an independent quadratic/volume oracle',()=>{
 for(const d of [.25,.6,1.5]){const g=geometry({...defaults,separationRatio:d,longitudeDegrees:62,latitudeDegrees:-21});for(let i=0;i<3000;i++){const f=vector(),u=unitDirection(cross3(f,Math.abs(f[2])<.9?[0,0,1]:[0,1,0])),v=cross3(f,u),x=random()*2.5-1.25,y=random()*2.5-1.25,o=f.map((z,j)=>z*4+u[j]!*x+v[j]!*y) as unknown as Vec3,ray=f.map(z=>-z) as unknown as Vec3,roots:number[]=[];
  for(const c of [[0,0,0],g.axis.map(z=>z*d)]){const w=o.map((z,j)=>z-c[j]!),b=dot3(w as unknown as Vec3,ray),disc=b*b-dot3(w as unknown as Vec3,w as unknown as Vec3)+1;if(disc<0)continue;for(const t of [-b-Math.sqrt(disc),-b+Math.sqrt(disc)]){const q=o.map((z,j)=>z+t*ray[j]!);if(Math.hypot(...q)<=1+1e-10&&Math.hypot(...q.map((z,j)=>z-d*g.axis[j]!))>=1-1e-10)roots.push(t);}}
  const h=trace(g,o,ray);assert.equal(!!h,roots.length>0);if(h){near(h.t,Math.min(...roots));assert.ok(visible(g,h.direction,f));}
 }}
});
test('qualified creator limits reject degeneracy, enclosed cavities and invalid orientations',()=>{for(const patch of [{radiusMeters:0},{radiusMeters:9999},{radiusMeters:1e10},{separationRatio:0},{separationRatio:.249},{separationRatio:2},{latitudeDegrees:91},{longitudeDegrees:NaN}])assert.throws(()=>geometry({...defaults,...patch}));});
