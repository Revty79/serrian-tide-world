import type {SurfacePosition} from './contracts.ts';
import {createCylinderGeometry,cylinderAngle} from './cylinder.ts';
import {reconstructCylinderPath} from './cylinder-path.ts';
import {CylinderDistanceUnsupportedError,type CylinderDistanceOptions} from './cylinder-distance.ts';
import {createAnnularDistance,type AnnularBounds} from './open-cylinder-annular-distance.ts';
import type {OpenCylinderGeometry} from './open-cylinder.ts';
import {openCylinderMeridianDistance} from './open-cylinder-meridian.ts';
import {pathNorm} from './cylinder-path-math.ts';

/** Certified queries needed by a bounded local brush. An unsupported far route
 * throws; it is never replaced by a disk shortcut or a sampled graph metric. */
export function openCylinderDistance(g:OpenCylinderGeometry,first:SurfacePosition,last:SurfacePosition,options:CylinderDistanceOptions={}){
 const a=g.normalize(first),b=g.normalize(last),p=g.physical(a),q=g.physical(b),{outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=g.metadata;
 const metric=createAnnularDistance(ri,ro,L),guard=metric.guard,requested=options.absoluteToleranceMeters??Math.max(ro*1e-6,guard*16),angle=Math.abs(cylinderAngle(q.theta-p.theta)),D=Math.abs(q.z-p.z);
 if(!Number.isFinite(requested)||requested<=0||!Number.isInteger(options.maxBoxes??32768)||(options.maxBoxes??32768)<1||(options.maxBoxes??32768)>32768)throw RangeError('Invalid open-cylinder tolerance or work budget.');
 if(angle===0){const axis=openCylinderMeridianDistance(g,a,b,requested),bounds:AnnularBounds={lower:axis.lower,upper:axis.upper,value:axis.upper,guard,iterations:0,route:'cyclic-meridian'};return Object.freeze({value:axis.upper,units:'meters' as const,scope:'global-reference-surface' as const,method:'exact-meridian-sums-v1' as const,lowerBoundMeters:axis.lower,upperBoundMeters:axis.upper,absoluteErrorBoundMeters:axis.upper-axis.lower,requestedToleranceMeters:requested,bestRoute:bounds.route,evaluatedBoxes:0,objectiveEvaluations:0,peakQueuedBoxes:0,bounds,relaxationWitness:undefined,axis});}
 if(requested<16*guard)throw new CylinderDistanceUnsupportedError('precision','Requested open-cylinder enclosure is below the supported arithmetic floor.');
 let bounds:AnnularBounds,relaxationWitness:ReturnType<typeof reconstructCylinderPath>|undefined,evaluatedBoxes=0,objectiveEvaluations=0,peakQueuedBoxes=0;
 if(p.radius===q.radius&&p.z===q.z&&angle===0)bounds={lower:0,upper:0,value:0,guard,iterations:0,route:'coincident'};
 else if(p.z===q.z&&(p.z===0||p.z===L))bounds=metric.annulus(p.radius,q.radius,angle,requested);
 else if(p.radius===ri&&q.radius===ri)bounds=metric.innerHelix(angle,D,requested);
 else if((p.radius===ri&&(q.z===0||q.z===L))||(q.radius===ri&&(p.z===0||p.z===L))){const wall=p.radius===ri?p:q,rim=p.radius===ri?q:p;bounds=metric.innerToRim(rim.radius,angle,Math.abs(rim.z-wall.z),requested);}
 else if((p.radius===ro&&(q.radius===ro||q.z===0||q.z===L))||(q.radius===ro&&(p.z===0||p.z===L))){
  // The closed cylinder is used ONLY as a relaxation. Paths that visit the
  // actual inner wall pay at least both endpoint radial distances. All other
  // physical paths are subsets of the closed boundary. min() is a global LB.
  const closed=createCylinderGeometry({identity:g.identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:ro,lengthMeters:L});
  const endpoint=(r:typeof p)=>({...g.identity,patchId:r.radius===ro?'side':r.z===0?'cap-start':'cap-end',u:r.radius===ro||r.z===0?r.theta:-r.theta,v:r.radius===ro?r.z:r.radius});
  const first=endpoint(p),last=endpoint(q),direct=p.radius===ro&&q.radius===ro?closed.globalDistance(first,last,{absoluteToleranceMeters:requested,maxBoxes:options.maxBoxes}):undefined;
  if(direct?.bestRoute==='side'){
   // The accepted side helix is physically feasible on the actual outer wall.
   // Preserve its exact enclosure arithmetic when the inner-wall visit bound
   // cannot lower it. This is the ordinary accepted cylinder brush metric.
   const lower=Math.max(0,Math.min(direct.lowerBoundMeters,(p.radius-ri)+(q.radius-ri)-guard)),upper=direct.upperBoundMeters;
   if(upper-lower>requested)throw new CylinderDistanceUnsupportedError('range','An inner-wall alternative prevents certification of this far open-cylinder route.');
   bounds={lower,upper,value:upper,guard,iterations:0,route:'validated-outer-side'};evaluatedBoxes=direct.evaluatedBoxes;
   return Object.freeze({value:upper,units:'meters' as const,scope:'global-reference-surface' as const,method:'annular-calibration-and-validated-relaxation-v1' as const,lowerBoundMeters:lower,upperBoundMeters:upper,absoluteErrorBoundMeters:upper-lower,requestedToleranceMeters:requested,bestRoute:bounds.route,evaluatedBoxes,objectiveEvaluations:direct.objectiveEvaluations,peakQueuedBoxes:direct.peakQueuedBoxes,bounds,relaxationWitness:undefined,axis:undefined});
  }
  const remaining=(options.maxBoxes??32768)-(direct?.evaluatedBoxes??0);if(remaining<1)throw new CylinderDistanceUnsupportedError('work-budget','Open-cylinder relaxation exhausted its query budget.');
  const witness=reconstructCylinderPath(closed,first,last,{version:1,absoluteToleranceMeters:requested/2,maxBoxes:remaining});
  evaluatedBoxes=(direct?.evaluatedBoxes??0)+witness.distance.evaluatedBoxes;
  objectiveEvaluations=(direct?.objectiveEvaluations??0)+witness.distance.objectiveEvaluations;peakQueuedBoxes=Math.max(direct?.peakQueuedBoxes??0,witness.distance.peakQueuedBoxes);
  for(const piece of witness.pieces)if(piece.kind==='disk-chord'){
   const x=piece.endXY[0]-piece.startXY[0],y=piece.endXY[1]-piece.startXY[1],den=x*x+y*y,t=den===0?0:Math.max(0,Math.min(1,-(piece.startXY[0]*x+piece.startXY[1]*y)/den));
   const minimum=pathNorm(piece.startXY[0]+t*x,piece.startXY[1]+t*y)-guard;
   if(minimum<ri)throw new CylinderDistanceUnsupportedError('range','The closed relaxation crosses nonexistent end-disk material; this open-cylinder route is unsupported.');
  }
  const lower=Math.max(0,Math.min(witness.distance.lowerBoundMeters,(p.radius-ri)+(q.radius-ri))-guard),upper=witness.lengthUpperBoundMeters+guard;
  if(upper-lower>requested)throw new CylinderDistanceUnsupportedError('range','An inner-wall alternative prevents certification of this far open-cylinder route.');
  bounds={lower,upper,value:upper,guard,iterations:0,route:'validated-outer-relaxation'};relaxationWitness=witness;
 }else throw new CylinderDistanceUnsupportedError('range','This nonlocal wall/rim route is outside the certified open-cylinder query set. Use intermediate physical points.');
 return Object.freeze({value:bounds.upper,units:'meters' as const,scope:'global-reference-surface' as const,method:'annular-calibration-and-validated-relaxation-v1' as const,lowerBoundMeters:bounds.lower,upperBoundMeters:bounds.upper,absoluteErrorBoundMeters:bounds.upper-bounds.lower,requestedToleranceMeters:requested,bestRoute:bounds.route,evaluatedBoxes,objectiveEvaluations:objectiveEvaluations+bounds.iterations,peakQueuedBoxes,bounds,relaxationWitness,axis:undefined});
}
