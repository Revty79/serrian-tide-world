import {test} from 'node:test';import assert from 'node:assert/strict';
import {roundedBrushChart} from './rounded-crescent-local-frame.ts';
import {roundedLocalChart,roundedBrushRoute,roundedGeodesic} from './rounded-crescent-distance.ts';
import {ROUNDED_CRESCENT_DEFAULTS as defaults,ROUNDED_CRESCENT_PRESETS,roundedCrescentGeometry} from './rounded-crescent-globe.ts';
import {unitDirection,dot3,type Vec3} from './cube-sphere.ts';
test('allocation-free rotating frames preserve every physical derivative inner product, including pole charts',()=>{
 for(const profile of Object.values(ROUNDED_CRESCENT_PRESETS)){const g=roundedCrescentGeometry({...defaults,...profile});for(let i=0;i<18;i++){const p=unitDirection(i===0?[1,0,0]:i===1?[-1,0,0]:[Math.sin(i*1.3),Math.cos(i*.7),Math.sin(i*.9)]),a=roundedLocalChart(g,p),b=roundedBrushChart(g,p),x=.03*Math.sin(i),y=.025*Math.cos(i),r=a.frame(x,y),v=[r.Jx,r.Jy,r.Hxx,r.Hxy,r.Hyy],out=new Float64Array(15);b.frame(x,y,out);for(let j=0;j<5;j++)for(let k=0;k<5;k++){const fast=out[j*3]!*out[k*3]!+out[j*3+1]!*out[k*3+1]!+out[j*3+2]!*out[k*3+2]!,slow=dot3(v[j]!,v[k]!);assert.ok(Math.abs(fast-slow)<2e-12*Math.max(1,Math.abs(slow)));}}}
});
test('tiny smoothing neighbor curves retain physical geodesic lengths without iterative optimization',()=>{
 for(const profile of Object.values(ROUNDED_CRESCENT_PRESETS)){const g=roundedCrescentGeometry({...defaults,...profile});for(const p of [[1,0,0],[-1,0,0],[0,-1,0],[0,1,0],[0,0,1],[.71,.71,.01]] as Vec3[]){const a=unitDirection(p),chart=roundedLocalChart(g,a),b=chart.direction(.012,-.009),fast=roundedBrushRoute(g,a,b,0).lengthMeters,reference=roundedGeodesic(g,a,b).lengthMeters;assert.ok(Math.abs(fast-reference)/reference<.0001,`neighbor distance ${fast} versus ${reference}`);}}
});
