import {cross3,dot3,unitDirection,geodesicDistanceMeters,type Vec3} from './cube-sphere.ts';

/** Version 1 deliberately links the two curvature radii. No arbitrary Boolean cutter. */
export interface CrescentCutGlobeDimensions {readonly radiusMeters:number;readonly separationRatio:number;readonly longitudeDegrees:number;readonly latitudeDegrees:number}
export interface CrescentCutGlobeGeometry extends CrescentCutGlobeDimensions {readonly provider:'physical-crescent-cut-globe';readonly version:1;readonly construction:'equal-radius-sphere-difference';readonly cutterRadiusMeters:number;readonly axis:Vec3}
export type CrescentCutGlobeRegion='all'|'retained'|'cut';
export const CRESCENT_CUT_GLOBE_DEFAULTS:CrescentCutGlobeDimensions=Object.freeze({radiusMeters:1e6,separationRatio:.6,longitudeDegrees:0,latitudeDegrees:0});
export function crescentCutGlobeGeometry(input:CrescentCutGlobeDimensions):CrescentCutGlobeGeometry {
 const {radiusMeters:r,separationRatio:d,longitudeDegrees:lon,latitudeDegrees:lat}=input;
 if(!Number.isFinite(r)||r<10000||r>1e9||!Number.isFinite(d)||d<.25||d>1.5||!Number.isFinite(lon)||lon< -180||lon>180||!Number.isFinite(lat)||lat< -90||lat>90)throw RangeError('Crescent-Cut Globe needs radius 10,000–1,000,000,000 m, cut offset 0.25–1.5 radii, longitude −180–180° and latitude −90–90°.');
 const a=lon*Math.PI/180,b=lat*Math.PI/180,axis=Object.freeze([Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)]) as Vec3;
 return Object.freeze({provider:'physical-crescent-cut-globe',version:1,construction:'equal-radius-sphere-difference',radiusMeters:r,separationRatio:d,longitudeDegrees:lon,latitudeDegrees:lat,cutterRadiusMeters:r,axis});
}
export const cutGlobeRegion=(g:CrescentCutGlobeGeometry,p:Vec3):'retained'|'cut'=>dot3(p,g.axis)>g.separationRatio/2?'cut':'retained';
/** Input is the unit intrinsic point, output the physical point in globe-radius units. */
export function cutGlobePosition(g:CrescentCutGlobeGeometry,p:Vec3):Vec3 {const t=Math.min(0,g.separationRatio-2*dot3(p,g.axis));return[p[0]+t*g.axis[0],p[1]+t*g.axis[1],p[2]+t*g.axis[2]];}
export function cutGlobeReflect(g:CrescentCutGlobeGeometry,v:Vec3):Vec3 {const t=2*dot3(v,g.axis);return[v[0]-t*g.axis[0],v[1]-t*g.axis[1],v[2]-t*g.axis[2]];}
/** Outward from remaining material, into the removed volume on the concave bank. */
export function cutGlobeNormal(g:CrescentCutGlobeGeometry,p:Vec3):Vec3 {return cutGlobeRegion(g,p)==='retained'?p:cutGlobeReflect(g,p).map(v=>-v) as unknown as Vec3;}
export function cutGlobeGradient(g:CrescentCutGlobeGeometry,p:Vec3,gradient:Vec3):Vec3 {return cutGlobeRegion(g,p)==='cut'?cutGlobeReflect(g,gradient):gradient;}
export interface CutGlobeHit {readonly t:number;readonly point:Vec3;readonly direction:Vec3;readonly normal:Vec3;readonly region:'retained'|'cut'}
/** Closest-approach roots in normalized units avoid large-scale squared subtraction. */
export function traceCutGlobe(g:CrescentCutGlobeGeometry,origin:Vec3,rayInput:Vec3):CutGlobeHit|null {
 const ray=unitDirection(rayInput),a=g.axis,d=g.separationRatio,h=d/2;let nearest:CutGlobeHit|null=null;
 for(const region of ['retained','cut'] as const){const offset=region==='cut'?d:0,oc=origin.map((v,i)=>v-offset*a[i]!) as unknown as Vec3,b=-dot3(oc,ray),closest=oc.map((v,i)=>v+b*ray[i]!) as unknown as Vec3,disc=1-dot3(closest,closest);if(disc< -1e-13)continue;
  const root=Math.sqrt(Math.max(0,disc));for(const t of [b-root,b+root]){if(t<0||nearest&&t>=nearest.t)continue;const q=origin.map((v,i)=>v+t*ray[i]!) as unknown as Vec3;if(dot3(q,a)>h+2e-12)continue;
   const p=region==='retained'?q:q.map((v,i)=>v+(d-2*dot3(q,a))*a[i]!) as unknown as Vec3,direction=unitDirection(p),normal=region==='retained'?direction:q.map((v,i)=>offset*a[i]!-v) as unknown as Vec3;
   nearest={t,point:q,direction,normal,region};
  }
 }return nearest;
}
/** Visibility uses the actual first material boundary, including bowl self-occlusion. */
export function cutGlobeVisible(g:CrescentCutGlobeGeometry,p:Vec3,forward:Vec3):boolean {const q=cutGlobePosition(g,p),o=q.map((v,i)=>v+4*forward[i]!) as unknown as Vec3,hit=traceCutGlobe(g,o,forward.map(v=>-v) as unknown as Vec3);return !!hit&&Math.hypot(...hit.point.map((v,i)=>v-q[i]!))<2e-8;}
/** The two patches are the image of the whole sphere under one cap reflection.
 * Reflection is orthogonal on each open patch and identity on the seam. For any
 * absolutely continuous curve its metric speed is preserved almost everywhere;
 * on a seam interval the axial derivative is zero. The inverse has the same
 * property. Thus infima of all path lengths agree, including paths crossing the
 * seam repeatedly. This is a global length isometry, not a chord approximation. */
export const cutGlobeDistance=(g:CrescentCutGlobeGeometry,a:Vec3,b:Vec3)=>geodesicDistanceMeters(a,b,g.radiusMeters);
export function cutGlobeMeasures(g:CrescentCutGlobeGeometry){const r=g.radiusMeters,d=g.separationRatio;return{rimPlaneMeters:r*d/2,rimRadiusMeters:r*Math.sqrt(1-d*d/4),cutDepthMeters:r*(2-d),axialMaterialMeters:r*d,retainedAreaMeters2:2*Math.PI*r*r*(1+d/2),cutAreaMeters2:2*Math.PI*r*r*(1-d/2),volumeMeters3:Math.PI*r*r*r*(d-d*d*d/12),remainingVolumeFraction:.75*d-d*d*d/16};}
export function cutGlobeRim(g:CrescentCutGlobeGeometry,angle:number):Vec3 {const a=g.axis,u=unitDirection(cross3(Math.abs(a[2])<.9?[0,0,1]:[0,1,0],a)),v=cross3(a,u),h=g.separationRatio/2,s=Math.sqrt(1-h*h);return a.map((x,i)=>x*h+s*(u[i]!*Math.cos(angle)+v[i]!*Math.sin(angle))) as unknown as Vec3;}
