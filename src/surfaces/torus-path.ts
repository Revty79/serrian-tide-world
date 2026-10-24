import * as I from './pyramid-interval.ts';
import {torusTrigBounds} from './torus-distance.ts';
import {torusDelta,type TorusGeometry} from './torus.ts';
import type {SurfacePosition} from './contracts.ts';
import type {Vec3} from './cube-sphere.ts';
import type {ConnectedPathOptions,ConnectedPhysicalPath} from '../terrain/connected-stroke.ts';
/** A real surface curve joining consecutive pointer locations, with its actual
 * metric arc length. Pointer interpolation need not be a shortest geodesic;
 * brush influence separately uses the certified shortest-surface distance. */
export function torusPointerPath(g:TorusGeometry,first:SurfacePosition,last:SurfacePosition,options:ConnectedPathOptions):ConnectedPhysicalPath{
 const a=g.normalize(first),end=g.normalize(last),u=torusDelta(end.u-a.u),v=torusDelta(end.v-a.v),r=g.metadata.minorRadiusMeters,q=g.metadata.majorRadiusMeters/r,from=torusDelta(a.v),tol=options.absoluteToleranceMeters??r*1e-9;
 if(!(tol>0)||!Number.isFinite(tol)||options.version!==1||options.continuity&&options.continuity.patchId!=='tube')throw RangeError('Invalid torus pointer path.');
 if(u===0&&v===0)return{end,pieces:[],lengthMeters:0,lengthUpperBoundMeters:0,lengthErrorBoundMeters:0,distance:{evaluatedBoxes:0},atDistance:()=>({position:end,referencePosition:g.referencePosition(end),tangent:null,pieceIndex:0,distanceMeters:0,atEnd:true,oneSidedPatchId:null})};
 const minimum=Math.hypot((q-1)*u,v),D=(k:number)=>u*u*(2*q+2**(k-1))*Math.abs(v)**k,d1=D(1),d2=D(2),d3=D(3),d4=D(4),fourth=d4/(2*minimum)+(d1*d3+.75*d2*d2)/minimum**3+2.25*d1*d1*d2/minimum**5+.9375*d1**4/minimum**7;
 let boxes=0,n=8;
 const integrate=(t:number,certified:boolean)=>{let sum=I.exact(0),numeric=0;for(let i=0;i<=n;i++){const at=t*i/n,weight=i===0||i===n?1:i%2?4:2;if(certified){const angle=I.add(I.exact(from),I.multiply(I.exact(v),I.exact(at))),c=torusTrigBounds(angle,true),major=I.add(I.exact(q),c),f=I.root(I.add(I.multiply(I.square(major),I.exact(u*u)),I.exact(v*v)));sum=I.add(sum,I.multiply(f,I.exact(weight)));}else numeric+=weight*Math.hypot((q+Math.cos(from+v*at))*u,v);}if(!certified)return[numeric*t/(3*n),numeric*t/(3*n)] as const;const value=I.multiply(sum,I.exact(t/(3*n))),error=fourth*t**5/(180*n**4)+2e-12*Math.max(minimum,t);return I.add(value,[-error,error]);};
 let length=integrate(1,true);while((length[1]-length[0])*r>tol/8){n*=2;if(n>512||++boxes>(options.maxBoxes??32768))throw RangeError('Torus pointer arc integration budget exceeded.');length=integrate(1,true);}
 boxes+=n;const meters=(length[0]+length[1])/2*r,error=(length[1]-length[0])*r*4+tol/4;
 return{end,pieces:[Object.freeze({kind:'torus-angular-curve',u,v})],lengthMeters:meters,lengthUpperBoundMeters:length[1]*r,lengthErrorBoundMeters:error,distance:{evaluatedBoxes:boxes},atDistance(metersAlong:number){if(!Number.isFinite(metersAlong)||metersAlong<0||metersAlong>meters)throw RangeError('Torus path address outside its arc.');let left=0,right=1,t=metersAlong/meters;if(metersAlong>0&&metersAlong<meters){for(let k=0;k<38;k++){const value=integrate(t,false)[0]*r;if(value<metersAlong)left=t;else right=t;t=(left+right)/2;}const checked=integrate(t,true);if(Math.max(Math.abs(checked[0]*r-metersAlong),Math.abs(checked[1]*r-metersAlong))>error)throw RangeError('Torus path inversion could not certify its physical spacing.');}const atEnd=metersAlong===meters,position=atEnd?end:g.normalize({...a,u:a.u+u*t,v:a.v+v*t}),frame=g.frame(position),raw=frame.major.map((x,k)=>x*frame.majorMetersPerRadian*u+frame.minor[k]!*r*v),norm=Math.hypot(...raw);return{position,referencePosition:g.referencePosition(position),tangent:raw.map(x=>x/norm) as unknown as Vec3,pieceIndex:0,distanceMeters:metersAlong,atEnd,oneSidedPatchId:null};}};
}
