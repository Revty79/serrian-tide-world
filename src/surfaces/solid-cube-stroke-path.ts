import type { SurfacePosition } from './contracts.ts';
import { createSolidCubeRouter, type CertifiedCubeRoute, type CubeRouteSegment, type SolidCubeRouteResult } from './solid-cube-routing.ts';
import { CUBE_ROUTE_MAX_WORK, cubeFraction,cubeFractionCompare,type CubeExactBudget, type CubeFraction } from './cube-route-exact.ts';
import {CUBE_PHASE_UNIT,cubePhaseLength} from './cube-stroke-phase.ts';
import { createSolidCubeGeometry, type SolidCubeConfiguration, type SolidCubePosition } from './solid-cube.ts';
import { cubeArcAdd, cubeArcBudget, cubeArcDivideLength, cubeArcLength, cubeArcRational, cubeArcRound, cubeArcScale, cubeArcSign, cubeNumberRational, cubeRational, cubeRationalAdd, cubeRationalMultiply, type CubeArc, type CubeArcBounds } from './cube-stroke-exact.ts';

export const CUBE_STROKE_PATH_LIMITS=Object.freeze({maxPendingInputs:8,maxAcceptedInputs:256,maxDabs:4096,maxOutputEvents:8,
  maxStepWork:CUBE_ROUTE_MAX_WORK,maxTotalWork:16_000_000});
/** Same bounded input/dab lifetime as the mature cylinder. Each step retains the
 * original exact-work ceiling; the lifetime total follows from those finite counts. */
export const CUBE_INTERACTIVE_PATH_LIMITS=Object.freeze({...CUBE_STROKE_PATH_LIMITS,maxAcceptedInputs:65536,maxDabs:16384,
 maxTotalWork:CUBE_ROUTE_MAX_WORK*(2*65536+16384+2)});
export type CubeStrokePathLimits={readonly [K in keyof typeof CUBE_STROKE_PATH_LIMITS]?:number};
export type CubeStrokePathStatus='accepting'|'draining'|'complete'|'cancelled'|'failed';
export type CubeStrokeRoutePolicy='unique'|'exact-backtrack'|'continuation'|'canonical-no-context'|'canonical-context-tie'|'corner-reset';
export interface CubeStrokeDab {
  readonly kind:'dab'; readonly ordinal:number; readonly inputSequence:number;
  readonly center:SolidCubePosition;
  /** Exact mode rounds the ideal ordinal*spacing arc. Interactive phase mode
   * carries its explicit accumulated arc-error bound plus chart rounding bounds. */
  readonly rounding:'initial-input'|'nearest-even-chart-coordinates'|'certified-phase-chart-coordinates';
  readonly spacingErrorBoundMeters?:number;
  readonly idealFace?:string; readonly coordinateBounds?:Readonly<{u:CubeArcBounds;v:CubeArcBounds}>;
}
export interface CubeStrokePathSegment {
  readonly kind:'path'; readonly inputSequence:number; readonly from:SolidCubePosition; readonly to:SolidCubePosition;
  readonly route:CertifiedCubeRoute; readonly ambiguity:number; readonly policy:CubeStrokeRoutePolicy;
  readonly certificate:SolidCubeRouteResult['certificate'];
}
export type CubeStrokePathEvent=CubeStrokeDab|CubeStrokePathSegment;
type Direction=Readonly<{point:SolidCubePosition;du:CubeFraction;dv:CubeFraction}>;
const negate=(b:CubeExactBudget,x:CubeArc)=>cubeArcScale(b,x,{n:-1n,d:1n});
const eq=(a:readonly number[],b:readonly number[])=>a.every((x,i)=>x===b[i]);

/** Numerical ordered-input provider only. It never owns terrain, a clock, workers or history.
 * Each pump performs ONE bounded route query, spacing decision/dab, or state transition.
 * Hosts must drain output and retain/retry any input rejected by queue backpressure. */
export function createSolidCubeStrokePath(configuration:SolidCubeConfiguration,radiusMeters:number,inputLimits:CubeStrokePathLimits={},placement:'exact'|'bounded-phase'='exact') {
  if(placement!=='exact'&&placement!=='bounded-phase')throw RangeError('Invalid cube spacing policy.');
  const bounded=placement==='bounded-phase',hard=bounded?CUBE_INTERACTIVE_PATH_LIMITS:CUBE_STROKE_PATH_LIMITS;
  const geometry=createSolidCubeGeometry(configuration),router=createSolidCubeRouter(geometry.metadata),spacingMeters=radiusMeters/4;
  if (!Number.isFinite(radiusMeters)||radiusMeters<=0||!Number.isFinite(spacingMeters)||spacingMeters<=0||spacingMeters*4!==radiusMeters) throw new RangeError('Exactly representable positive radius/4 required.');
  if (!inputLimits || typeof inputLimits!=='object' || Array.isArray(inputLimits)) throw new RangeError('Cube path limits required.');
  const limits=Object.freeze(Object.fromEntries(Object.entries(hard).map(([k,max])=>{
    const n=inputLimits[k as keyof CubeStrokePathLimits]??max;
    if (!Number.isSafeInteger(n)||n<1||n>max) throw new RangeError('Cube path limits may only lower hard bounds.'); return [k,n];
  })) as Record<keyof typeof CUBE_STROKE_PATH_LIMITS,number>);
  const queue:{point:SolidCubePosition;sequence:number}[]=[],output:CubeStrokePathEvent[]=[];
  let status:CubeStrokePathStatus='accepting',failure:Readonly<{name:string;message:string}>|undefined;
  let previous:SolidCubePosition|undefined,total:CubeArc=Object.freeze([]),direction:Direction|undefined;
  let phase=0n;
  let backtrack:Readonly<{from:readonly number[];to:readonly number[];index:number}>|undefined;
  let active:Readonly<{route:CertifiedCubeRoute;length:CubeArc;after:CubeArc;to:SolidCubePosition;sequence:number;phaseLength:bigint;phaseAfter:bigint}>|undefined;
  const stats={acceptedInputs:0,processedInputs:0,discardedInputs:0,pumps:0,dabs:0,routeQueries:0,duplicateInputs:0,workUnits:0,
    routeWorkUnits:0,arcWorkUnits:0,failedRouteWorkAllowance:0,peakPendingInputs:0,peakOutputEvents:0,peakArcTerms:0,peakStepWork:0};
  const clear=()=>{queue.length=0;output.length=0;active=undefined;direction=undefined;backtrack=undefined;previous=undefined;total=Object.freeze([]);phase=0n;};
  const fail=(error:unknown):never=>{failure=Object.freeze({name:error instanceof Error?error.name:'Error',message:String(error instanceof Error?error.message:error)});
    stats.discardedInputs=stats.acceptedInputs-stats.processedInputs;clear();status='failed';throw error;};
  const push=(event:CubeStrokePathEvent)=>{output.push(Object.freeze(event));stats.peakOutputEvents=Math.max(stats.peakOutputEvents,output.length);};
  const position=(p:SurfacePosition)=>Object.freeze(geometry.canonicalPosition(p));
  // At an observed endpoint the exact segment chart is an existing Cube-A alias.
  const tangent=(b:CubeExactBudget,s:CubeRouteSegment,p:SolidCubePosition):Direction=>Object.freeze({
    point:Object.freeze(geometry.aliases(p).find(a=>a.patchId===s.face)!),
    du:cubeRational(b,s.direction.du),dv:cubeRational(b,s.direction.dv)});
  const choose=(b:CubeExactBudget,result:SolidCubeRouteResult,from:SolidCubePosition,to:SolidCubePosition):{route:CertifiedCubeRoute;policy:CubeStrokeRoutePolicy}=>{
    if (result.unique) return {route:result.selected,policy:'unique'};
    const a=geometry.referencePosition(from),c=geometry.referencePosition(to);
    if (backtrack&&eq(a,backtrack.to)&&eq(c,backtrack.from)) return {route:result.routes[backtrack.index]!,policy:'exact-backtrack'};
    if (geometry.aliases(from).length===3) return {route:result.selected,policy:'corner-reset'};
    if (!direction) return {route:result.selected,policy:'canonical-no-context'};
    const dot=(route:CertifiedCubeRoute)=>{
      const first=route.segments[0]!,candidate=tangent(b,first,from),t=geometry.tangentTransform(direction!.point,candidate.point);
      const u=cubeRationalAdd(b,cubeRationalMultiply(b,direction!.du,{n:BigInt(t.uu),d:1n}),cubeRationalMultiply(b,direction!.dv,{n:BigInt(t.uv),d:1n}));
      const v=cubeRationalAdd(b,cubeRationalMultiply(b,direction!.du,{n:BigInt(t.vu),d:1n}),cubeRationalMultiply(b,direction!.dv,{n:BigInt(t.vv),d:1n}));
      const scalar=cubeRationalAdd(b,cubeRationalMultiply(b,u,candidate.du),cubeRationalMultiply(b,v,candidate.dv));
      const norm=cubeRationalAdd(b,cubeRationalMultiply(b,candidate.du,candidate.du),cubeRationalMultiply(b,candidate.dv,candidate.dv));
      return {scalar,norm};
    };
    const better=(a:ReturnType<typeof dot>,c:ReturnType<typeof dot>)=>{
      const sa=a.scalar.n<0n?-1:a.scalar.n>0n?1:0,sc=c.scalar.n<0n?-1:c.scalar.n>0n?1:0;if(sa!==sc)return sa-sc;if(!sa)return 0;
      const left=cubeRationalMultiply(b,cubeRationalMultiply(b,a.scalar,a.scalar),c.norm),right=cubeRationalMultiply(b,cubeRationalMultiply(b,c.scalar,c.scalar),a.norm);
      const d=left.n*right.d-right.n*left.d;b.check(d);return (d<0n?-1:d>0n?1:0)*sa;
    };
    let route=result.selected,score=dot(route),ties=1;
    for(const candidate of result.routes.slice(1)){const next=dot(candidate),c=better(next,score);if(c>0){route=candidate;score=next;ties=1;}else if(!c)ties++;}
    return {route,policy:ties===1?'continuation':'canonical-context-tie'};
  };
  const dab=(b:CubeExactBudget):CubeStrokeDab=>{
    if(bounded){
      const a=active!,parameter=cubeFraction(b,BigInt(stats.dabs)*CUBE_PHASE_UNIT-phase,a.phaseLength);
      let segment=a.route.segments.at(-1)!;for(const s of a.route.segments)if(cubeFractionCompare(b,parameter,s.endParameter)<=0){segment=s;break;}
      const offset=cubeRationalAdd(b,parameter,{n:-segment.startParameter.n,d:segment.startParameter.d});
      const coordinate=(axis:'u'|'v')=>cubeArcRound(b,cubeArcRational(cubeRationalAdd(b,
        cubeRationalMultiply(b,offset,cubeRational(b,axis==='u'?segment.direction.du:segment.direction.dv)),cubeRational(b,segment.from[axis]))));
      const u=coordinate('u'),v=coordinate('v');
      return Object.freeze({kind:'dab',ordinal:stats.dabs,inputSequence:a.sequence,center:position({...geometry.identity,patchId:segment.face,u:u.value,v:v.value}),
        rounding:'certified-phase-chart-coordinates',idealFace:segment.face,coordinateBounds:Object.freeze({u:u.bounds,v:v.bounds}),spacingErrorBoundMeters:stats.routeQueries*spacingMeters*2**-65*(1+4*Number.EPSILON)});
    }
    const a=active!,target=cubeArcRational(cubeRationalMultiply(b,cubeNumberRational(b,spacingMeters),{n:BigInt(stats.dabs),d:1n}));
    const parameter=cubeArcDivideLength(b,cubeArcAdd(b,negate(b,total),target),a.length);
    let segment=a.route.segments.at(-1)!;
    for(const s of a.route.segments){if(cubeArcSign(b,cubeArcAdd(b,parameter,negate(b,cubeArcRational(s.endParameter))))<=0){segment=s;break;}}
    const offset=cubeArcAdd(b,parameter,negate(b,cubeArcRational(segment.startParameter)));
    const coordinate=(axis:'u'|'v')=>cubeArcRound(b,cubeArcAdd(b,
      cubeArcScale(b,offset,cubeRational(b,axis==='u'?segment.direction.du:segment.direction.dv)),cubeArcRational(cubeRational(b,segment.from[axis]))));
    const u=coordinate('u'),v=coordinate('v');
    return Object.freeze({kind:'dab',ordinal:stats.dabs,inputSequence:a.sequence,center:position({...geometry.identity,patchId:segment.face,u:u.value,v:v.value}),
      rounding:'nearest-even-chart-coordinates',idealFace:segment.face,coordinateBounds:Object.freeze({u:u.bounds,v:v.bounds})});
  };
  return Object.freeze({geometry:geometry.metadata,spacingMeters,limits,
    get status(){return status;},get failure(){return failure;},
    get statistics(){return Object.freeze({...stats,pendingInputs:queue.length,outputEvents:output.length,activeRoute:Boolean(active),
      activeInputSequence:active?.sequence,retainedArcTerms:total.length+(active?.after.length??0),
      ...(bounded?{phaseBits:phase.toString(2).length,spacingErrorBoundMeters:stats.routeQueries*spacingMeters*2**-65*(1+4*Number.EPSILON)}:{})});},
    /** false = no acceptance; caller keeps the input. Never coalesces accepted points. */
    accept(p:SurfacePosition):boolean {
      if(status!=='accepting')throw new Error('Cube path is no longer accepting input.');
      try{const point=position(p);if(queue.length>=limits.maxPendingInputs)return false;
        if(stats.acceptedInputs>=limits.maxAcceptedInputs)throw new RangeError('Cube accepted-input limit exhausted.');
        queue.push({point,sequence:stats.acceptedInputs++});stats.peakPendingInputs=Math.max(stats.peakPendingInputs,queue.length);return true;
      }catch(error){return fail(error);}
    },
    release(){if(status==='accepting')status='draining';return status;},
    cancel(){if(status==='accepting'||status==='draining'){stats.discardedInputs=stats.acceptedInputs-stats.processedInputs;clear();status='cancelled';}return status;},
    take():CubeStrokePathEvent|undefined{return output.shift();},
    pump(){
      if(status!=='accepting'&&status!=='draining')return status;
      if(output.length>=limits.maxOutputEvents)return status;
      stats.pumps++;let b:CubeExactBudget|undefined,routeWork=0,routeAllowance=0,routePending=false,arcAllowance=0;
      const remaining=limits.maxTotalWork-stats.workUnits;
      try{
        if(remaining<1)throw new RangeError('Cube aggregate path work exhausted.');
        arcAllowance=Math.min(limits.maxStepWork,remaining);b=cubeArcBudget(arcAllowance);
        if(active){
          const target=bounded?undefined:cubeArcRational(cubeRationalMultiply(b,cubeNumberRational(b,spacingMeters),{n:BigInt(stats.dabs),d:1n}));
          if(bounded?active.phaseAfter>=BigInt(stats.dabs)*CUBE_PHASE_UNIT:cubeArcSign(b,cubeArcAdd(b,active.after,negate(b,target!)))>=0){
            if(stats.dabs>=limits.maxDabs)throw new RangeError('Cube path dab-count limit exhausted.');
            push(dab(b));stats.dabs++;
          }else{
            const old=previous!;previous=active.to;total=active.after;phase=active.phaseAfter;
            direction=geometry.aliases(previous).length===3?undefined:tangent(b,active.route.segments.at(-1)!,previous);
            backtrack=Object.freeze({from:geometry.referencePosition(old),to:geometry.referencePosition(previous),index:active.route.index});
            active=undefined;stats.processedInputs++;
          }
        }else if(queue.length){
          const next=queue.shift()!;
          if(!previous){previous=next.point;push({kind:'dab',ordinal:0,inputSequence:next.sequence,center:previous,rounding:'initial-input'});stats.dabs++;stats.processedInputs++;}
          else if(eq(geometry.referencePosition(previous),geometry.referencePosition(next.point))){stats.duplicateInputs++;stats.processedInputs++;}
          else{
            // Reserve the route's actual certificate work from this same step budget.
            routeAllowance=Math.min(limits.maxStepWork,remaining);routePending=true;stats.routeQueries++;
            const result=router.route(previous,next.point,{maxWorkUnits:routeAllowance,...(bounded?{pruneDominated:true}:{})});routePending=false;routeWork=result.certificate.workUnits;
            if(routeWork>=Math.min(limits.maxStepWork,remaining))throw new RangeError('No step work remains after cube certification.');
            arcAllowance=Math.min(limits.maxStepWork,remaining)-routeWork;b=cubeArcBudget(arcAllowance);
            const selection=choose(b,result,previous,next.point),length=bounded?Object.freeze([]):cubeArcLength(b,result.distanceSquared),after=bounded?length:cubeArcAdd(b,total,length);
            const phaseLength=bounded?cubePhaseLength(b,result.distanceSquared,spacingMeters):0n;
            active=Object.freeze({route:selection.route,length,after,to:next.point,sequence:next.sequence,phaseLength,phaseAfter:phase+phaseLength});stats.peakArcTerms=Math.max(stats.peakArcTerms,after.length);
            push({kind:'path',inputSequence:next.sequence,from:previous,to:next.point,route:selection.route,ambiguity:result.routes.length,policy:selection.policy,certificate:result.certificate});
          }
        }else if(status==='draining') {status='complete';direction=undefined;backtrack=undefined;total=Object.freeze([]);previous=undefined;}
      }catch(error){
        if(routePending){routeWork=routeAllowance;arcAllowance=0;stats.failedRouteWorkAllowance+=routeAllowance;}
        return fail(error);
      }
      finally{
        // The failing helper's rejected next tick is not additional admitted work.
        const arcWork=Math.min(b?.snapshot().workUnits??0,arcAllowance),work=routeWork+arcWork;
        stats.routeWorkUnits+=routeWork;stats.arcWorkUnits+=arcWork;stats.workUnits+=work;stats.peakStepWork=Math.max(stats.peakStepWork,work);
      }
      return status;
    },
  });
}
export type SolidCubeStrokePath=ReturnType<typeof createSolidCubeStrokePath>;
