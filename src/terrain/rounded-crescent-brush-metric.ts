import {type Vec3} from '../surfaces/cube-sphere.ts';
import {greatCircleArc} from '../surfaces/great-circle.ts';
import {roundedAngle,roundedProfile,roundedDifferential,type RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
import {roundedBrushRoute,roundedBrushRoutes} from '../surfaces/rounded-crescent-distance.ts';
import type {SphericalTerrain,SphericalSampleKey} from './spherical.ts';
import type {SphericalBrushSettings} from './spherical-brush.ts';
const directionCaches=new Map<number,Map<number,Vec3>>();
/** Only native immutable coordinate directions are cached. The two qualified
 * details each retain at most 16384 three-component directions; no heights,
 * identities, worker epochs or terrain objects survive through this cache. */
export function roundedCanonicalDirection(terrain:SphericalTerrain,key:SphericalSampleKey):Vec3{
 const n=terrain.metadata.representation.cellsPerEdge;if(n!==128&&n!==256)return terrain.directionAt(key);let cache=directionCaches.get(n);if(!cache){cache=new Map();directionCaches.set(n,cache);}const found=cache.get(key.index);if(found)return found;const p=terrain.directionAt(key);if(cache.size===16384)cache.delete(cache.keys().next().value!);cache.set(key.index,p);return p;
}
export function roundedBrushPolicy(g:RoundedCrescentGeometry){const feature=Math.min(g.bodyRadius,g.bodyDepth)*(1-g.tipTaper)*g.scaleMeters;return{maximum:Math.min(.2*feature,.45*g.minimumStretch*g.scaleMeters),defaultRadius:Math.min(.1*feature,.3*g.minimumStretch*g.scaleMeters),minimum:g.scaleMeters*1e-9};}
export function validateRoundedBrush(g:RoundedCrescentGeometry,s:SphericalBrushSettings){const p=roundedBrushPolicy(g);if(s.radiusMeters<p.minimum||s.radiusMeters>p.maximum)throw RangeError('Rounded Crescent brush radius exceeds its qualified curved-surface footprint.');if((s.tool==='raise'||s.tool==='lower')&&s.strengthMeters>g.elevationLimitMeters*2||s.tool==='flatten'&&Math.abs(s.targetElevation)>g.elevationLimitMeters)throw RangeError('Rounded Crescent brush values exceed the supported terrain range.');}
export function roundedBrushMetric(g:RoundedCrescentGeometry,terrain:SphericalTerrain){
 const scale=g.scaleMeters,stretch=g.minimumStretch*scale,cache=new Map<number,{indices:number[];weights:number[];total:number}>();
 let lastCenter:Vec3|undefined,centerAngle=0,centerRadius=0,centerZ=0;
 let routeCenter:Vec3|undefined,routes:ReturnType<typeof roundedBrushRoutes>;
 return{
  directionAt:(key:SphericalSampleKey)=>roundedCanonicalDirection(terrain,key),
  angularRadius:(radius:number)=>Math.min(.75,radius/stretch),
  coordinateBounds:(center:Vec3,radius:number)=>{const reach=radius/(scale*(g.bendRadius-g.bodyRadius)*g.halfSpan*(1-2*Math.abs(g.tipRoundness)));return{x:[Math.max(-1,center[0]-reach),Math.min(1,center[0]+reach)] as const};},
  lowerBound:(a:Vec3,b:Vec3)=>{if(a!==lastCenter){lastCenter=a;const f=roundedProfile(g,a[0]);centerAngle=roundedAngle(g,a[0]);centerRadius=g.bendRadius+g.bodyRadius*f*a[1];centerZ=g.bodyDepth*f*a[2];}const f=roundedProfile(g,b[0]),r=g.bendRadius+g.bodyRadius*f*b[1],z=g.bodyDepth*f*b[2],angle=roundedAngle(g,b[0])-centerAngle,dr=r-centerRadius,dz=z-centerZ,transverse=2*Math.sqrt(r*centerRadius)*Math.sin(angle/2);return Math.max(stretch*Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),scale*Math.hypot(dr,dz,transverse),scale*Math.hypot(dr,dz,(g.bendRadius-g.bodyRadius)*angle));},
  distance:(a:Vec3,b:Vec3)=>{if(a!==routeCenter){routeCenter=a;routes=roundedBrushRoutes(g,a);}return routes(b).lengthMeters;},
  path:(a:Vec3,b:Vec3)=>roundedInputPath(g,a,b),
  smooth:(key:SphericalSampleKey,current:number)=>{let s=cache.get(key.index);if(!s){const center=roundedCanonicalDirection(terrain,key),neighbors=terrain.neighbors(key,'edges'),distances=neighbors.map(k=>roundedBrushRoute(g,center,roundedCanonicalDirection(terrain,k),0).lengthMeters),minimum=Math.min(...distances),weights=distances.map(d=>(minimum/d)**2);s={indices:neighbors.map(k=>k.index),weights,total:weights.reduce((a,b)=>a+b,0)};if(cache.size>=8192)cache.delete(cache.keys().next().value!);cache.set(key.index,s);}let delta=0;for(let i=0;i<s.indices.length;i++)delta+=s.weights[i]!*(terrain.read(terrain.keyAt(s.indices[i]!))-current);return delta/(2*s.total);},
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
