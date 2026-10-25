import {type Vec3} from '../surfaces/cube-sphere.ts';
import {unitArcAngle,greatCircleArc} from '../surfaces/great-circle.ts';
import {roundedPoint,roundedDifferential,type RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
import {roundedBrushRoute} from '../surfaces/rounded-crescent-distance.ts';
import type {SphericalTerrain,SphericalSampleKey} from './spherical.ts';
import type {SphericalBrushSettings} from './spherical-brush.ts';
export function roundedBrushPolicy(g:RoundedCrescentGeometry){const feature=Math.min(g.bodyRadius,g.bodyDepth)*(1-g.tipTaper)*g.scaleMeters;return{maximum:Math.min(.2*feature,.45*g.minimumStretch*g.scaleMeters),defaultRadius:Math.min(.14*feature,.3*g.minimumStretch*g.scaleMeters),minimum:g.scaleMeters*1e-9};}
export function validateRoundedBrush(g:RoundedCrescentGeometry,s:SphericalBrushSettings){const p=roundedBrushPolicy(g);if(s.radiusMeters<p.minimum||s.radiusMeters>p.maximum)throw RangeError('Rounded Crescent brush radius exceeds its qualified curved-surface footprint.');if((s.tool==='raise'||s.tool==='lower')&&s.strengthMeters>g.elevationLimitMeters*2||s.tool==='flatten'&&Math.abs(s.targetElevation)>g.elevationLimitMeters)throw RangeError('Rounded Crescent brush values exceed the supported terrain range.');}
export function roundedBrushMetric(g:RoundedCrescentGeometry,terrain:SphericalTerrain){
 const scale=g.scaleMeters,stretch=g.minimumStretch*scale,cache=new Map<number,{indices:number[];weights:number[];total:number}>();
 return{
  angularRadius:(radius:number)=>Math.min(.75,radius/stretch),
  lowerBound:(a:Vec3,b:Vec3)=>{const x=roundedPoint(g,a),y=roundedPoint(g,b);return Math.max(stretch*unitArcAngle(a,b),scale*Math.hypot(...x.map((v,i)=>v-y[i]!)));},
  distance:(a:Vec3,b:Vec3)=>roundedBrushRoute(g,a,b).lengthMeters,
  path:(a:Vec3,b:Vec3)=>roundedInputPath(g,a,b),
  smooth:(key:SphericalSampleKey,current:number)=>{let s=cache.get(key.index);if(!s){const center=terrain.directionAt(key),neighbors=terrain.neighbors(key,'edges'),distances=neighbors.map(k=>roundedBrushRoute(g,center,terrain.directionAt(k)).lengthMeters),minimum=Math.min(...distances),weights=distances.map(d=>(minimum/d)**2);s={indices:neighbors.map(k=>k.index),weights,total:weights.reduce((a,b)=>a+b,0)};if(cache.size>=8192)cache.delete(cache.keys().next().value!);cache.set(key.index,s);}let delta=0;for(let i=0;i<s.indices.length;i++)delta+=s.weights[i]!*(terrain.read(terrain.keyAt(s.indices[i]!))-current);return delta/(2*s.total);},
 };
}
/** Widely separated pointer samples follow a real mapped surface arc. They
 * never interpolate through material or empty space. Ordinary local input uses
 * the optimized curved route; both paths are spaced by actual physical length. */
export function roundedInputPath(g:RoundedCrescentGeometry,a:Vec3,b:Vec3){
 const arc=greatCircleArc(a,b);if(arc.angle<.3){const table=roundedBrushRoute(g,a,b).arcTable();return{lengthMeters:table.distances.at(-1)!,at:table.at};}
 const N=Math.ceil(arc.angle/.015),lengths=[0],points=[a];
 for(let i=1;i<=N;i++){const lo=arc.at((i-1)/N),mid=arc.at((i-.5)/N),hi=arc.at(i/N),epsilon=1e-5,tangent=(t:number)=>{const left=arc.at(Math.max(0,t-epsilon)),right=arc.at(Math.min(1,t+epsilon)),span=Math.min(1,t+epsilon)-Math.max(0,t-epsilon);return right.map((v,k)=>(v-left[k]!)/span) as unknown as Vec3;},speed=(p:Vec3,t:number)=>Math.hypot(...roundedDifferential(g,p).apply(tangent(t)))*g.scaleMeters,L=(speed(lo,(i-1)/N)+4*speed(mid,(i-.5)/N)+speed(hi,i/N))/(6*N);lengths.push(lengths.at(-1)!+L);points.push(hi);}
 return{lengthMeters:lengths.at(-1)!,at:(fraction:number)=>{const d=fraction*lengths.at(-1)!;let i=0;while(i<N-1&&lengths[i+1]!<d)i++;return arc.at(Math.min(1,Math.max(0,(i+(d-lengths[i]!)/(lengths[i+1]!-lengths[i]!||1))/N)));}};
}
