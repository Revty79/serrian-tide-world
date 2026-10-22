import {paintingStage} from '../editor/painting-metrics.ts';
import type {SurfacePosition} from './contracts.ts';
import {cylinderAngle,type CylinderVector} from './cylinder.ts';
import {CylinderDistanceUnsupportedError,type CylinderDistanceOptions} from './cylinder-distance.ts';
import {pathAngle,pathNorm,pathTrig} from './cylinder-path-math.ts';
import {openCylinderDistance} from './open-cylinder-distance.ts';
import type {AnnularPlanarWitness} from './open-cylinder-annular-distance.ts';
import type {OpenCylinderGeometry,OpenCylinderPosition,OpenCylinderPatch} from './open-cylinder.ts';

export interface OpenCylinderPathOptions extends Omit<CylinderDistanceOptions,'includeFeasibleRoutes'>{readonly version:1;readonly continuity?:{readonly patchId:OpenCylinderPatch;readonly direction:CylinderVector}}
interface Base {readonly start:OpenCylinderPosition;readonly end:OpenCylinderPosition;readonly lengthMeters:number}
type Unplaced=Base&(
 |{readonly kind:'wall-helix'|'rim-arc';readonly radius:number;readonly startAngle:number;readonly angleDelta:number;readonly startZ:number;readonly endZ:number;readonly patchId:OpenCylinderPatch}
 |{readonly kind:'annular-chord';readonly startXY:readonly[number,number];readonly endXY:readonly[number,number];readonly z:number;readonly patchId:'rim-start'|'rim-end'});
export type OpenCylinderPathPiece=Unplaced&{readonly fromMeters:number;readonly toMeters:number};
const fail=(message:string):never=>{throw new CylinderDistanceUnsupportedError('precision',message);};
const vec=(v:readonly number[]):CylinderVector=>Object.freeze([v[0]!,v[1]!,v[2]!]);
const xy=(angle:number,radius:number):readonly[number,number]=>{const[s,c]=pathTrig(angle);return Object.freeze([radius*c,radius*s]);};

/** Feasible continuous paths with independently certified global excess. No
 * graph edges, straight-through-disk interpolation or claimed exact geodesic. */
function reconstructOpenCylinderPathImpl(g:OpenCylinderGeometry,first:SurfacePosition,last:SurfacePosition,options:OpenCylinderPathOptions){
 if(options.version!==1)throw RangeError('Only open-cylinder physical path version 1 is supported.');
 const start=g.normalize(first),end=g.normalize(last),p=g.physical(start),q=g.physical(end),{outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=g.metadata;
 const samePoint=g.aliases(start).some(alias=>alias.patchId===end.patchId&&alias.u===end.u&&alias.v===end.v);
 const guard=32768*Number.EPSILON*Math.max(ro,L),tolerance=options.absoluteToleranceMeters??Math.max(ro*1e-6,128*guard);
 if(!Number.isFinite(tolerance)||tolerance<=0)throw RangeError('Positive finite open-cylinder path tolerance required.');
 let preference:{patchId:OpenCylinderPatch;direction:CylinderVector}|undefined;
 if(options.continuity){const c=options.continuity,alias=g.aliases(start).find(a=>a.patchId===c.patchId);if(!alias||!Array.isArray(c.direction)||c.direction.length!==3||!c.direction.every(Number.isFinite))throw RangeError('Continuity must name a physical initial sheet and finite tangent.');const norm=pathNorm(...c.direction);if(norm===0)throw RangeError('A nonzero continuity tangent is required.');const direction=vec(c.direction.map(x=>x/norm)),normal=g.normal(alias);if(Math.abs(direction.reduce((s,x,i)=>s+x*normal[i]!,0))>4096*Number.EPSILON)throw RangeError('Continuity direction is not tangent to its initial sheet.');preference={patchId:c.patchId,direction};}
 const distance=openCylinderDistance(g,start,end,{absoluteToleranceMeters:tolerance/4,maxBoxes:options.maxBoxes});
 let delta=cylinderAngle(q.theta-p.theta);if(Math.abs(delta)===Math.PI)delta=Math.PI;
 const angle=Math.abs(delta),signs=distance.axis?(distance.axis.directions.length?distance.axis.directions:distance.axis.upper<=8*guard?[1,-1]:[]):angle===Math.PI?[1,-1]:[delta<0?-1:1];
 const onRim=(z:number,radius:number,theta:number):OpenCylinderPosition=>g.normalize({...g.identity,patchId:z===0?'rim-start':'rim-end',u:theta,v:z===0?radius-ri:ro-radius});
 const onWall=(radius:number,z:number,theta:number):OpenCylinderPosition=>g.normalize({...g.identity,patchId:radius===ri?'inner-wall':'outer-wall',u:theta,v:radius===ri?L-z:z});
 const helix=(radius:number,z0:number,z1:number,theta:number,turn:number):Unplaced=>({kind:'wall-helix',radius,startAngle:theta,angleDelta:turn,startZ:z0,endZ:z1,patchId:radius===ri?'inner-wall':'outer-wall',start:onWall(radius,z0,theta),end:onWall(radius,z1,theta+turn),lengthMeters:pathNorm(radius*turn,z1-z0)});
 const chord=(z:number,r0:number,r1:number,theta0:number,theta1:number):Unplaced=>{const startXY=xy(theta0,r0),endXY=xy(theta1,r1);return{kind:'annular-chord',startXY,endXY,z,patchId:z===0?'rim-start':'rim-end',start:onRim(z,r0,theta0),end:onRim(z,r1,theta1),lengthMeters:pathNorm(endXY[0]-startXY[0],endXY[1]-startXY[1])};};
 const annulus=(z:number,r0:number,r1:number,theta:number,turn:number,witness:AnnularPlanarWitness|undefined):Unplaced[]=>{
  if(r0===r1&&turn===0)return[];if(!witness)fail('Missing certified annular path parameters.');const sign=turn<0?-1:1;
  if(witness!.direct)return[chord(z,r0,r1,theta,theta+turn)];
  const entry=theta+sign*witness!.firstTurn,arcTurn=sign*witness!.arcAngle,exit=entry+arcTurn;
  return[chord(z,r0,ri,theta,entry),{kind:'rim-arc',radius:ri,startAngle:entry,angleDelta:arcTurn,startZ:z,endZ:z,patchId:z===0?'rim-start':'rim-end',start:onRim(z,ri,entry),end:onRim(z,ri,exit),lengthMeters:ri*Math.abs(arcTurn)},chord(z,ri,r1,exit,theta+turn)];
 };
 const reverse=(piece:Unplaced):Unplaced=>piece.kind==='annular-chord'?{...piece,start:piece.end,end:piece.start,startXY:piece.endXY,endXY:piece.startXY}:{...piece,start:piece.end,end:piece.start,startAngle:piece.startAngle+piece.angleDelta,angleDelta:-piece.angleDelta,startZ:piece.endZ,endZ:piece.startZ};
 const meridian=(direction:number):Unplaced[]=>{
  const pieces:Unplaced[]=[];let current=start;
  for(let step=0;step<6;step++){
   const limit=current.patchId.endsWith('wall')?L:g.thicknessMeters;
   if(direction>0&&current.v===limit||direction<0&&current.v===0)current=g.crossRim(current).position;
   const target=g.aliases(end).find(p=>p.patchId===current.patchId&&(p.v-current.v)*direction>=0),next=target??g.normalize({...current,v:direction>0?(current.patchId.endsWith('wall')?L:g.thicknessMeters):0}),from=g.physical(current),to=g.physical(next);
   pieces.push(current.patchId.endsWith('wall')?helix(from.radius,from.z,to.z,p.theta,0):chord(from.z,from.radius,to.radius,p.theta,p.theta));if(target)return pieces;current=g.crossRim(next).position;
  }
  return fail('Cyclic meridian path exceeded its finite physical crease count.');
 };
 const tangent=(piece:Unplaced,t:number):CylinderVector=>{if(piece.kind==='annular-chord')return vec([(piece.endXY[0]-piece.startXY[0])/piece.lengthMeters,(piece.endXY[1]-piece.startXY[1])/piece.lengthMeters,0]);const[s,c]=pathTrig(piece.startAngle+t*piece.angleDelta),speed=piece.radius*piece.angleDelta/piece.lengthMeters;return vec([-s*speed,c*speed,(piece.endZ-piece.startZ)/piece.lengthMeters]);};
 const alignment=(piece:Unplaced|undefined)=>{
  if(!piece||!preference)return 0;let prior=preference.direction;
  if(preference.patchId!==piece.patchId){const sheet=g.aliases(start).find(a=>a.patchId===preference!.patchId)!,s=Math.sin(p.theta),c=Math.cos(p.theta),angular=-s*prior[0]+c*prior[1],basis=g.tangentVector(sheet,{du:0,dv:1}),meridian=prior.reduce((sum,x,i)=>sum+x*basis[i]!,0);prior=g.tangentVector(piece.start,{du:angular/p.radius,dv:meridian});}
  return tangent(piece,0).reduce((sum,x,i)=>sum+x*prior[i]!,0);
 };
 const candidates=signs.map(sign=>{
  let pieces:Unplaced[];
  switch(distance.bestRoute){
   case'coincident':pieces=[];break;
   case'cyclic-meridian':pieces=distance.axis!.upper===0?[]:meridian(sign);break;
   case'annular-chord':case'annular-tangent-arc':pieces=annulus(p.z,p.radius,q.radius,p.theta,sign*angle,distance.bounds.planar);break;
   case'inner-helix':pieces=[helix(ri,p.z,q.z,p.theta,sign*angle)];break;
   case'inner-wall-rim-calibration':{
    const reversed=p.radius!==ri,wall=reversed?q:p,rim=reversed?p:q,turn=reversed?-sign*angle:sign*angle,wallSign=turn<0?-1:1,phi=distance.bounds.phi!;
    pieces=[helix(ri,wall.z,rim.z,wall.theta,wallSign*phi),...annulus(rim.z,ri,rim.radius,wall.theta+wallSign*phi,wallSign*(angle-phi),distance.bounds.planar)];if(reversed)pieces=pieces.reverse().map(reverse);break;
   }
   case'validated-outer-side':pieces=[helix(ro,p.z,q.z,p.theta,sign*angle)];break;
   case'validated-outer-relaxation':{
    const witness=distance.relaxationWitness!,mirror=angle===Math.PI&&sign<0,theta=(a:number)=>mirror?2*p.theta-a:a;
    pieces=witness.pieces.map(piece=>piece.kind==='side-geodesic'?helix(ro,piece.start.v,piece.end.v,theta(piece.startAngle),mirror?-piece.angleDelta:piece.angleDelta):chord(piece.patchId==='cap-start'?0:L,piece.start.v,piece.end.v,theta(piece.patchId==='cap-end'?-piece.start.u:piece.start.u),theta(piece.patchId==='cap-end'?-piece.end.u:piece.end.u)));break;
   }
   default:throw RangeError('Unsupported certified open-cylinder path class.');
  }
  // As in the accepted cylinder path, distinct endpoints retain reconstruction
  // error even when their rounded Cartesian chord collapses to zero. Otherwise
  // an ordinary pointer-up a few chart ULPs away incorrectly fails the global
  // lower bound. Input is retained, with the same explicit position/length
  // certificate; no coordinate snapping or uncertified route is substituted.
  pieces=pieces.filter(piece=>piece.lengthMeters!==0);const length=pieces.reduce((sum,piece)=>sum+piece.lengthMeters,0),error=samePoint?0:guard*(pieces.length+2);
  if(!Number.isFinite(length)||length+error<distance.lowerBoundMeters||length+error-distance.lowerBoundMeters>tolerance)return undefined;
  return{pieces,length,error,alignment:alignment(pieces[0])};
 }).filter(candidate=>candidate!==undefined);
 if(!candidates.length)fail('Reconstructed open-cylinder path does not meet its global length certificate.');
 candidates.sort((a,b)=>preference?b.alignment-a.alignment||a.length-b.length:a.length-b.length);const selected=candidates[0]!;let cumulative=0;
 const pieces:readonly OpenCylinderPathPiece[]=Object.freeze(selected.pieces.map(piece=>{const fromMeters=cumulative;cumulative+=piece.lengthMeters;if(!(cumulative>fromMeters))fail('Open-cylinder path piece is below cumulative-distance resolution.');return Object.freeze({...piece,fromMeters,toMeters:cumulative});}));
 return Object.freeze({provider:'physical-open-cylinder-path' as const,version:1 as const,geometry:g.metadata,start,end,routeClass:distance.bestRoute,pieces,lengthMeters:selected.length,lengthErrorBoundMeters:selected.error,positionErrorBoundMeters:8*guard,lengthLowerBoundMeters:Math.max(0,selected.length-selected.error),lengthUpperBoundMeters:selected.length+selected.error,shortestExcessUpperBoundMeters:Math.max(0,selected.length+selected.error-distance.lowerBoundMeters),requestedToleranceMeters:tolerance,validity:'certified-feasible-approximate-shortest' as const,uniqueness:'not-certified' as const,selection:preference?'best-incoming-alignment-among-certified-candidates' as const:'minimum-measured-length-stable-order' as const,candidateCount:candidates.length,continuityAlignment:preference?selected.alignment:null,distance,
  atDistance(meters:number,boundary:'incoming'|'outgoing'='outgoing'){
   if(!Number.isFinite(meters)||meters<0||meters>selected.length||!['incoming','outgoing'].includes(boundary))throw RangeError('Open-cylinder path distance must lie in its closed interval.');
   if(!pieces.length)return Object.freeze({position:start,referencePosition:g.referencePosition(start),tangent:null,pieceIndex:-1,distanceMeters:0,atEnd:true,oneSidedPatchId:null});
   let index=pieces.findIndex(piece=>boundary==='incoming'?meters<=piece.toMeters:meters<piece.toMeters);if(index<0)index=pieces.length-1;
   const piece=pieces[index]!,t=Math.max(0,Math.min(1,(meters-piece.fromMeters)/piece.lengthMeters));let position:OpenCylinderPosition;
   if(t===0)position=piece.start;else if(t===1)position=piece.end;else if(piece.kind==='annular-chord'){
    const x=(1-t)*piece.startXY[0]+t*piece.endXY[0],y=(1-t)*piece.startXY[1]+t*piece.endXY[1],radius=pathNorm(x,y);if(radius<ri-8*guard||radius>ro+8*guard)fail('Annular path interpolation left actual rim material.');position=onRim(piece.z,Math.max(ri,Math.min(ro,radius)),pathAngle(x,y));
   }else position=piece.kind==='wall-helix'?onWall(piece.radius,Math.max(0,Math.min(L,(1-t)*piece.startZ+t*piece.endZ)),piece.startAngle+t*piece.angleDelta):onRim(piece.startZ,piece.radius,piece.startAngle+t*piece.angleDelta);
   if(meters===0)position=start;if(meters===selected.length)position=end;
   return Object.freeze({position,referencePosition:g.referencePosition(position),tangent:tangent(piece,t),pieceIndex:index,distanceMeters:meters,atEnd:meters===selected.length,oneSidedPatchId:piece.patchId});
  },
 });
}
export function reconstructOpenCylinderPath(...args:Parameters<typeof reconstructOpenCylinderPathImpl>){return paintingStage('path',()=>reconstructOpenCylinderPathImpl(...args));}
export type OpenCylinderPhysicalPath=ReturnType<typeof reconstructOpenCylinderPath>;
