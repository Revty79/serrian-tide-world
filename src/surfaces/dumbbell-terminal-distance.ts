import type {SurfacePosition} from './contracts.ts';import type {DumbbellGeometry} from './dumbbell.ts';
import {prismAngle,prismTrigBounds} from './prismatic-distance.ts';import * as I from './pyramid-interval.ts';
type Linear={u:number;v:number;error:number};type XY=readonly[Linear,Linear];
type Face={id:string;offset:I.Interval;angularBounds:I.Interval;native:XY;copies:readonly{shift:number;xy:XY}[]};
type Model={faces:Map<string,Face>;period:I.Interval;first:boolean;radiusLower:number};
const models=new WeakMap<DumbbellGeometry,Map<string,Model>>(),pi:I.Interval=[I.adjacentFloat(Math.PI,false),I.adjacentFloat(Math.PI,true)],zero=I.exact(0);
function linear(u:I.Interval,v:I.Interval):Linear{const a=u[0]+(u[1]-u[0])/2,b=v[0]+(v[1]-v[0])/2,magnitude=Math.max(Math.abs(u[0]),Math.abs(u[1]))+Math.max(Math.abs(v[0]),Math.abs(v[1]));return{u:a,v:b,error:Math.max(a-u[0],u[1]-a)+Math.max(b-v[0],v[1]-b)+512*Number.EPSILON*magnitude+512*Number.MIN_VALUE};}
const at=(m:Linear,p:SurfacePosition):I.Interval=>{const x=m.u*p.u+m.v*p.v;const error=m.error*(Math.abs(p.u)+Math.abs(p.v))+512*Number.MIN_VALUE;return[x-error,x+error];};
const xy=(m:XY,p:SurfacePosition):I.IntervalPoint=>[at(m[0],p),at(m[1],p)];
function model(g:DumbbellGeometry,first:boolean){let cache=models.get(g);if(!cache){cache=new Map();models.set(g,cache);}const name=first?'first':'second';let found=cache.get(name);if(found)return found;
 const ids=Array.from({length:16},(_,j)=>`${name}-terminal-${j}:0`),angles=ids.map(id=>{const v=g.chartVertexBounds(id)[2]!;return prismAngle(v[1],v[0]);}),offsets:I.Interval[]=[zero];for(const a of angles)offsets.push(I.add(offsets.at(-1)!,a));const period=offsets.at(-1)!;if(period[0]<=pi[1]||period[1]>=2*pi[0])throw RangeError('Dumbbell terminal cone is outside its qualified angle range.');
 const faces=new Map<string,Face>();let minimumRadius=Infinity,maximumEdge=0;
 for(let j=0;j<16;j++){const id=ids[j]!,native=g.chartVertexBounds(id),U=native[1]!,V=native[2]!,offset=offsets[first?j+1:j]!,sign=first?-1:1,copies=[-1,0,1].map(shift=>{const theta=I.add(offset,I.multiply(period,I.exact(shift))),c=prismTrigBounds(theta,true),s=prismTrigBounds(theta,false),transform=(p:I.IntervalPoint):I.IntervalPoint=>[I.subtract(I.multiply(c,p[0]),I.multiply(I.exact(sign),I.multiply(s,p[1]))),I.add(I.multiply(s,p[0]),I.multiply(I.exact(sign),I.multiply(c,p[1])))],A=transform(U),B=transform(V);return{shift,xy:[linear(A[0],B[0]),linear(A[1],B[1])] as XY};});faces.set(id,{id,offset,angularBounds:[offsets[j]![0],offsets[j+1]![1]],native:[linear(U[0],V[0]),linear(U[1],V[1])],copies});minimumRadius=Math.min(minimumRadius,I.pointLength(U)[0],I.pointLength(V)[0]);maximumEdge=Math.max(maximumEdge,I.pointLength(I.pointSubtract(U,V))[1]);}
 found={faces,period,first,radiusLower:I.subtract(I.exact(minimumRadius),I.exact(maximumEdge/2))[0]};cache.set(name,found);return found;
}
type Source={p:SurfacePosition;model:Model;face:Face;point:I.IntervalPoint;radius:I.Interval;angle?:I.Interval;plans:Map<string,{copy:Face['copies'][number];full:boolean}[]>};
const sources=new WeakMap<DumbbellGeometry,Source>();
function angle(m:Model,f:Face,p:SurfacePosition){const native=xy(f.native,p),local=prismAngle(native[1],native[0]);return m.first?I.subtract(f.offset,local):I.add(f.offset,local);}
/** The sixteen real terminal triangles form a Euclidean cone. Sum their
 * certified corner angles once, then use direct interval rotations rather
 * than recursively unfolding a long fan. The nearest winding is exhaustive
 * because pi < cone angle < 2*pi. A source-to-rim escape certificate establishes
 * GLOBAL optimality on the closed World. Near-apex bounds use the intrinsic
 * triangle inequality; they do not snap or rewrite any sample or brush center. */
export function dumbbellTerminalDistance(g:DumbbellGeometry,input:SurfacePosition,last:SurfacePosition,tolerance:number){const a=g.normalize(input),b=g.normalize(last),first=a.patchId.startsWith('first-terminal-');if(!first&&!a.patchId.startsWith('second-terminal-')||!b.patchId.startsWith(first?'first-terminal-':'second-terminal-'))return;
 let source=sources.get(g);if(!source||source.p.patchId!==a.patchId||source.p.u!==a.u||source.p.v!==a.v){const m=model(g,first),f=m.faces.get(a.patchId)!;source={p:a,model:m,face:f,point:xy(f.copies[1]!.xy,a),radius:I.pointLength(xy(f.native,a)),plans:new Map()};sources.set(g,source);}const m=source.model,f=m.faces.get(b.patchId)!,r=I.pointLength(xy(f.native,b)),pad=32768*Number.EPSILON*g.scaleMeters,escape=m.radiusLower-source.radius[1]-pad;
 let lower:number,upper:number;
 if(source.radius[1]<=tolerance/32){lower=Math.max(0,I.subtract(r,source.radius)[0]);upper=I.add(r,source.radius)[1];}
 else if(r[1]<=tolerance/32){lower=Math.max(0,I.subtract(source.radius,r)[0]);upper=I.add(r,source.radius)[1];}
 else{source.angle??=angle(m,source.face,a);let plan=source.plans.get(b.patchId);if(!plan){plan=[];for(const copy of f.copies){const range=I.subtract(I.add(f.angularBounds,I.multiply(m.period,I.exact(copy.shift))),source.angle);if(range[1]< -pi[1]||range[0]>pi[1])continue;plan.push({copy,full:range[0]>=-pi[0]&&range[1]<=pi[0]});}source.plans.set(b.patchId,plan);}
  lower=Infinity;upper=I.add(source.radius,r)[1];let targetAngle:I.Interval|undefined;for(const p of plan){let full=p.full;if(!full){targetAngle??=angle(m,f,b);const range=I.subtract(I.add(targetAngle,I.multiply(m.period,I.exact(p.copy.shift))),source.angle);if(range[1]< -pi[1]||range[0]>pi[1])continue;full=range[0]>=-pi[0]&&range[1]<=pi[0];}const d=I.pointLength(I.pointSubtract(xy(p.copy.xy,b),source.point));lower=Math.min(lower,d[0]);if(full)upper=Math.min(upper,d[1]);}
 }
 if(!Number.isFinite(lower)||upper>=escape||upper-lower+2*pad>tolerance)return;return{scope:'global-reference-surface' as const,lowerBoundMeters:Math.max(0,lower-pad),upperBoundMeters:upper+pad,evaluatedBoxes:0};
}
