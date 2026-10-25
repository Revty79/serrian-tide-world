import {test} from 'node:test';import assert from 'node:assert/strict';
import {ROUNDED_CRESCENT_DEFAULTS as defaults,ROUNDED_CRESCENT_PRESETS,roundedCrescentGeometry,roundedDifferential,roundedPoint} from './rounded-crescent-globe.ts';
import {roundedLocalChart,roundedBrushRoute} from './rounded-crescent-distance.ts';
import {roundedBrushPolicy} from '../terrain/rounded-crescent-brush-metric.ts';
import {dot3,unitDirection,type Vec3} from './cube-sphere.ts';
const profiles={...ROUNDED_CRESCENT_PRESETS,stiffEllipse:{curvatureRatio:1.25,bodyRadiusRatio:.2,depthRatio:.65,spanDegrees:300,tipTaper:.35,tipRoundness:.2},stiffCircle:{curvatureRatio:1.25,bodyRadiusRatio:.2,depthRatio:1,spanDegrees:300,tipTaper:.35,tipRoundness:.2},narrow:{curvatureRatio:.75,bodyRadiusRatio:.2,depthRatio:.65,spanDegrees:300,tipTaper:.35,tipRoundness:.2},broad:{curvatureRatio:1.25,bodyRadiusRatio:.6,depthRatio:1.25,spanDegrees:160,tipTaper:0,tipRoundness:-.2}};
/** Verification-only RK4 shooting. Reuse the actual metric integrator, with
 * further bounded refinement for stiff elliptical tips. It is separate from
 * the quadratic variational route used by the editor. */
function referenceGeodesic(g:ReturnType<typeof roundedCrescentGeometry>,a:Vec3,b:Vec3){
 const chart=roundedLocalChart(g,a),target=chart.coordinates(b),frame=chart.frame(0,0);let velocity:readonly[number,number]=target,previous=NaN;
 for(let steps=32;steps<=1024;steps*=2){let residual=Infinity;
  for(let iteration=0;iteration<9;iteration++){const q=chart.integrate(velocity,steps),rx=q[0]-target[0],ry=q[1]-target[1];residual=Math.hypot(rx,ry);if(residual<2e-12)break;const h=Math.max(1e-7,Math.hypot(...velocity)*1e-4),qx=chart.integrate([velocity[0]+h,velocity[1]],steps),qy=chart.integrate([velocity[0],velocity[1]+h],steps),A=(qx[0]-q[0])/h,B=(qy[0]-q[0])/h,C=(qx[1]-q[1])/h,D=(qy[1]-q[1])/h,det=A*D-B*C;assert.ok(Math.abs(det)>1e-10);velocity=[velocity[0]-(D*rx-B*ry)/det,velocity[1]-(A*ry-C*rx)/det];}
  assert.ok(residual<1e-9);const lengthMeters=Math.hypot(...frame.Jx.map((v,i)=>v*velocity[0]+frame.Jy[i]!*velocity[1]))*g.scaleMeters,errorEstimateMeters=Math.abs(lengthMeters-previous);if(Number.isFinite(previous)&&errorEstimateMeters<1e-8*lengthMeters)return{lengthMeters,errorEstimateMeters,steps};previous=lengthMeters;
 }throw Error('Combined-corner reference integration did not converge.');
}
test('combined dimensional corners retain the physical differential and local brush-distance qualification at maximum footprints',t=>{
 const measured=[];let checked=0;
 for(const[name,dimensions]of Object.entries(profiles)){const g=roundedCrescentGeometry({...defaults,...dimensions}),maximum=roundedBrushPolicy(g).maximum;let worst=0,at:unknown;
  for(const raw of [[0,-1,0],[0,1,0],[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[.98,.15,.08],[-.98,.15,-.08]] as Vec3[]){const a=unitDirection(raw),chart=roundedLocalChart(g,a),F=chart.frame(0,0),aa=dot3(F.Jx,F.Jx),ab=dot3(F.Jx,F.Jy),bb=dot3(F.Jy,F.Jy),L=Math.sqrt(aa),M=Math.sqrt(bb-ab*ab/aa);
   for(const fraction of [.1,.5,1])for(let angle=0;angle<8;angle++){const theta=angle*Math.PI/4,r=fraction*maximum/g.scaleMeters,x=r*(Math.cos(theta)/L-Math.sin(theta)*ab/(aa*M)),y=r*Math.sin(theta)/M;let lo=0,hi=1;while(roundedBrushRoute(g,a,chart.direction(x*hi,y*hi)).lengthMeters<fraction*maximum)hi*=2;for(let j=0;j<24;j++){const m=(lo+hi)/2;if(roundedBrushRoute(g,a,chart.direction(x*m,y*m)).lengthMeters<fraction*maximum)lo=m;else hi=m;}const b=chart.direction(x*(lo+hi)/2,y*(lo+hi)/2);const fast=roundedBrushRoute(g,a,b),reference=referenceGeodesic(g,a,b),error=Math.abs(fast.lengthMeters-reference.lengthMeters)/reference.lengthMeters;if(error>worst){worst=error;at={a,b,fraction,angle,length:fast.lengthMeters,reference:reference.lengthMeters};}checked++;}
   const p:Vec3=[a[0]*.7,a[1]*.7,a[2]*.7],D=roundedDifferential(g,p),h=1e-5;for(let j=0;j<3;j++){const plus=p.map((v,k)=>v+(j===k?h:0)) as unknown as Vec3,minus=p.map((v,k)=>v-(j===k?h:0)) as unknown as Vec3,x=roundedPoint(g,plus),y=roundedPoint(g,minus),expected=[D.x,D.y,D.z][j]!;for(let k=0;k<3;k++)assert.ok(Math.abs((x[k]!-y[k]!)/(2*h)-expected[k]!)<1e-8);}
  }
  measured.push({name,checked,worst,at});
 }t.diagnostic(JSON.stringify(measured));for(const result of measured)assert.ok(result.worst<.0001,`${result.name}: ${JSON.stringify(result.at)} relative error ${result.worst}`);assert.equal(checked,192*Object.keys(profiles).length);
});
test('tiny unchanged smoothing-neighbor routes preserve physical distances at every preset and stiff corner',t=>{
 let checked=0,worst=0,at:unknown;
 for(const[name,dimensions]of Object.entries(profiles)){const g=roundedCrescentGeometry({...defaults,...dimensions});for(const raw of [[0,-1,0],[0,1,0],[0,0,1],[1,0,0],[-1,0,0],[.98,.15,.08]] as Vec3[]){const a=unitDirection(raw),chart=roundedLocalChart(g,a);for(let angle=0;angle<8;angle++){const b=chart.direction(.013*Math.cos(angle*Math.PI/4),.013*Math.sin(angle*Math.PI/4)),fast=roundedBrushRoute(g,a,b,0),reference=referenceGeodesic(g,a,b),error=Math.abs(fast.lengthMeters-reference.lengthMeters)/reference.lengthMeters;if(error>worst){worst=error;at={name,a,b,error};}checked++;}}}
 t.diagnostic(JSON.stringify({checked,worst,at}));assert.ok(worst<.0001,JSON.stringify(at));
});
