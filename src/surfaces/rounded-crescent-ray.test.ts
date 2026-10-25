import {roundedIntervalRayTracer} from './rounded-crescent-ray-interval.ts';
import {roundedParallelWindows} from './rounded-crescent-parallel.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {ROUNDED_CRESCENT_DEFAULTS as defaults,ROUNDED_CRESCENT_PRESETS as presets,roundedCrescentGeometry,roundedPoint,roundedNormal,type RoundedCrescentGeometry} from './rounded-crescent-globe.ts';
import {traceRoundedCrescent,roundedRayDomain} from './rounded-crescent-ray.ts';
import {roundedPatchBounds} from './rounded-crescent-bounds.ts';
import {roundedOracle} from '../../tests/helpers/rounded-crescent-oracle.ts';
import {CUBE_FACES,QUARTER_PI,createCubeSphereGeometry} from './cube-sphere.ts';
import {unitDirection,dot3,type Vec3} from './cube-sphere.ts';
/** Independent monotone angular inversion and volume inequalities. No product
 * trace, inverse, membership, normals or field code determines oracle roots. */
function material(g:RoundedCrescentGeometry,p:Vec3){const phi=Math.atan2(p[1],p[0]);if(Math.abs(phi)>g.halfSpan)return false;let lo=-1,hi=1;for(let j=0;j<45;j++){const m=(lo+hi)/2,a=g.halfSpan*(m+g.tipRoundness*(m*m*m-m));if(a<phi)lo=m;else hi=m;}const u=(lo+hi)/2,f=1-g.tipTaper*u*u,v=(Math.hypot(p[0],p[1])-g.bendRadius)/(g.bodyRadius*f),w=p[2]/(g.bodyDepth*f);return u*u+v*v+w*w<=1;}
test('smooth first-hit rays agree with independent sampled-volume brackets across rounded profiles and cameras',()=>{
 let checked=0;
 for(const dimensions of Object.values(presets)){const g=roundedCrescentGeometry({...defaults,...dimensions}),E=g.bendRadius+g.bodyRadius;for(let i=0;i<70;i++){const p=unitDirection([Math.sin(i*2.4),Math.cos(i*2.4),Math.sin(i*1.7)]),q=roundedPoint(g,p),forward=unitDirection(roundedNormal(g,p).map((v,k)=>v+[.4*Math.sin(i*.7),.4*Math.cos(i*.3),.2][k]!) as unknown as Vec3),origin=q.map((v,k)=>v+forward[k]!*3*E) as unknown as Vec3,ray=forward.map(v=>-v) as unknown as Vec3,hit=traceRoundedCrescent(g,origin,ray);assert.ok(hit,`visible material ray missing in ${JSON.stringify(dimensions)} at ${i}`);assert.ok(Math.abs(Math.hypot(...hit.direction)-1)<1e-12);
   let previous=0,first:readonly[number,number]|undefined;for(let j=1;j<=1400;j++){const t=6*E*j/1400,point=origin.map((v,k)=>v+ray[k]!*t) as unknown as Vec3;if(material(g,point)){first=[previous,t];break;}previous=t;}
   if(first){let[lo,hi]=first;for(let j=0;j<36;j++){const m=(lo+hi)/2,point=origin.map((v,k)=>v+ray[k]!*m) as unknown as Vec3;if(material(g,point))hi=m;else lo=m;}assert.ok(Math.abs(hit.distance-(lo+hi)/2)<1e-7,`wrong nearest material root ${hit.distance} versus ${(lo+hi)/2}`);checked++;}
   assert.ok(dot3(roundedNormal(g,hit.direction),ray)<1e-5);
  }}assert.ok(checked>450);
});
test('a near-miss foreground lobe cannot exhaust the search before a later real material hit',()=>{
 const g=roundedCrescentGeometry(defaults),o:Vec3=[-4.35,.7336309523809523,-.02223124098124098],ray:Vec3=[1,0,0],actual=traceRoundedCrescent(g,o,ray),reference=roundedOracle(g).trace(o,ray);assert.ok(actual&&reference);assert.ok(Math.hypot(...actual.direction.map((v,i)=>v-reference[i]!))<1e-7);assert.ok(actual.distance>4.1);
});
test('continuous curved patch bounds and annular ray domains contain independently mapped material points',()=>{
 const geometry=createCubeSphereGeometry({worldId:'bounds-world',surfaceId:'bounds-surface'},1);
 for(const dimensions of Object.values(presets)){const g=roundedCrescentGeometry({...defaults,...dimensions}),oracle=roundedOracle(g),E=g.bendRadius+g.bodyRadius;for(let i=0;i<80;i++){const face=CUBE_FACES[i%6]!,u0=-QUARTER_PI+(i*13%30)*2*QUARTER_PI/32,v0=-QUARTER_PI+(i*17%30)*2*QUARTER_PI/32,u1=u0+2*QUARTER_PI/32,v1=v0+2*QUARTER_PI/32,b=roundedPatchBounds(g,face,[u0,u1],[v0,v1]);for(const s of[0,.23,.71,1])for(const t of[0,.31,.83,1]){const p=geometry.direction({worldId:'bounds-world',surfaceId:'bounds-surface',patchId:face,u:u0+(u1-u0)*s,v:v0+(v1-v0)*t}),q=oracle.position(p);for(let k=0;k<3;k++)assert.ok(q[k]!>=b.low[k]!-1e-12&&q[k]!<=b.high[k]!+1e-12);const d=unitDirection([Math.sin(i+.4),Math.cos(i*.7),Math.sin(i*1.1)]),o=q.map((v,k)=>v-4*E*d[k]!) as unknown as Vec3;assert.ok(roundedRayDomain(g,o,d).some(([lo,hi])=>lo!<=4*E+1e-10&&hi!>=4*E-1e-10));}}}
});

test('parallel interval roots retain the independent nearest surface across profiles, cameras and empty openings',()=>{
 let checked=0;
 for(const dimensions of Object.values(presets)){const g=roundedCrescentGeometry({...defaults,...dimensions}),oracle=roundedOracle(g),E=g.bendRadius+g.bodyRadius;
  for(const forward of [[1,0,0],[0,1,0],[0,0,1],unitDirection([1,.7,.35])] as Vec3[]){const right=unitDirection(Math.abs(forward[2])<.9?[-forward[1],forward[0],0]:[1,0,0]),up:Vec3=[forward[1]*right[2]-forward[2]*right[1],forward[2]*right[0]-forward[0]*right[2],forward[0]*right[1]-forward[1]*right[0]],windows=roundedParallelWindows(g,right,up,forward),trace=roundedIntervalRayTracer(g,windows),out=new Float64Array(5),ray=forward.map(v=>-v) as unknown as Vec3;
   for(let y=0;y<16;y++)for(let x=0;x<20;x++){const sx=(2*(x+.37)/20-1)*E,sy=(2*(y+.61)/16-1)*E,o=forward.map((v,k)=>3*E*v+right[k]!*sx+up[k]!*sy) as unknown as Vec3,hit=trace(...o,...ray,out),reference=oracle.trace(o,ray,128);assert.equal(hit,!!reference,`coverage mismatch ${JSON.stringify(dimensions)} camera ${forward} pixel ${x},${y}`);if(reference){assert.ok(Math.hypot(out[0]!-reference[0],out[1]!-reference[1],out[2]!-reference[2])<1e-7);const q=oracle.position(reference),time=3*E-dot3(q,forward);assert.ok(windows(o,ray).some(([lo,hi])=>lo<=time+1e-9&&hi>=time-1e-9));checked++;}}
  }
 }assert.ok(checked>1000);
});
