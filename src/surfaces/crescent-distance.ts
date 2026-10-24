import type {SurfacePosition} from './contracts.ts';
import type {CrescentGeometry} from './crescent.ts';
import type {PolyhedronVector} from './polyhedron-contract.ts';
import {polyhedronPositionBounds} from './polyhedron-physical-bounds.ts';
import * as I from './pyramid-interval.ts';

type B=I.Interval;type P=readonly[number,number];type BP=readonly[B,B];
const pi:B=[I.adjacentFloat(Math.PI,false),I.adjacentFloat(Math.PI,true)],twoPi=I.multiply(pi,I.exact(2));
const mid=(b:B)=>b[0]+(b[1]-b[0])/2,sub=(a:P,b:P):P=>[a[0]-b[0],a[1]-b[1]],dot=(a:P,b:P)=>a[0]*b[0]+a[1]*b[1];
const point=(p:P):BP=>[I.exact(p[0]),I.exact(p[1])];
const length=(p:BP)=>I.pointLength(p),minus=I.pointSubtract;
const minB=(a:B,b:B):B=>[Math.min(a[0],b[0]),Math.min(a[1],b[1])];
const absB=(a:B):B=>a[0]<=0&&a[1]>=0?[0,Math.max(-a[0],a[1])]:[Math.min(Math.abs(a[0]),Math.abs(a[1])),Math.max(Math.abs(a[0]),Math.abs(a[1]))];
/** Certified quadrant reduction keeps Taylor evaluation in [-0.8,0.8].
 * Eight terms leave cosine remainder <0.8^18/18! <2e-17 (sine smaller).
 * All polynomial operations and the PI reduction are outward intervals. */
function trig(x:B,cos:boolean):B{const k=Math.round(mid(x)/(Math.PI/2)),z=I.subtract(x,I.multiply(pi,I.exact(k/2))),quadrant=(k%4+4)%4,swap=quadrant%2===1,kind=swap?!cos:cos,negative=cos?quadrant===1||quadrant===2:quadrant===2||quadrant===3;if(Math.max(Math.abs(z[0]),Math.abs(z[1]))>.8)throw RangeError('Crescent trigonometric reduction failed.');let term=kind?I.exact(1):z,sum=term;const zz=I.square(z);for(let j=1;j<=8;j++){term=I.divide(I.neg(I.multiply(term,zz)),I.exact((2*j-(kind?1:0))*(2*j+(kind?0:1))));sum=I.add(sum,term);}const value=I.add(sum,[-2e-17,2e-17]);return negative?I.neg(value):value;}
function segmentDistance(p:P,a:P,b:P){const v=sub(b,a),q=sub(p,a),t=Math.max(0,Math.min(1,dot(q,v)/dot(v,v)));return Math.hypot(q[0]-t*v[0],q[1]-t*v[1]);}
const guard=(g:CrescentGeometry)=>32768*Number.EPSILON*g.scaleMeters;

/** atan2 is only a trial. Outward Taylor sine/cosine verifies that the entire
 * input vector lies between the two proposed rays, in their positive half-plane.
 * No host libm error assumption is used by the returned angle enclosure. */
export function crescentAngle(y:B,x:B):B{
 const trial=Math.atan2(mid(y),mid(x));
 for(const pad of[2e-13,2e-12,2e-11,2e-10,2e-9]){
  const lo=trial-pad,hi=trial+pad,lower=I.subtract(I.multiply(trig(I.exact(lo),true),y),I.multiply(trig(I.exact(lo),false),x)),upper=I.subtract(I.multiply(trig(I.exact(hi),true),y),I.multiply(trig(I.exact(hi),false),x)),forward=I.add(I.multiply(trig(I.exact(trial),true),x),I.multiply(trig(I.exact(trial),false),y));
  if(lower[0]>=0&&upper[1]<=0&&forward[0]>0)return[lo,hi];
 }
 throw RangeError('Crescent angular enclosure cannot be certified.');
}
function positiveAngle(y:B,x:B){let a=crescentAngle(y,x);if(mid(a)<0)a=I.add(a,twoPi);return a;}

// Adaptive exact sign for the orientation of binary64 outline coordinates.
// The BigInt fallback is used only when the standard floating error bound is
// ambiguous; it cannot turn a tiny opening crossing into an accepted chord.
const bits=new DataView(new ArrayBuffer(8));
function dyadic(x:number){if(x===0)return{n:0n,e:0};bits.setFloat64(0,x);const hi=bits.getUint32(0),lo=bits.getUint32(4),ex=(hi>>>20)&2047;return{n:(hi>>>31?-1n:1n)*((BigInt(hi&1048575)<<32n)+BigInt(lo)+(ex?1n<<52n:0n)),e:ex?ex-1075:-1074};}
function exactOrient(a:P,b:P,c:P){const q=[...a,...b,...c].map(dyadic),e=Math.min(...q.map(v=>v.e)),v=q.map(v=>v.n<<BigInt(v.e-e)),d=(v[2]!-v[0]!)*(v[5]!-v[1]!)-(v[3]!-v[1]!)*(v[4]!-v[0]!);return d<0n?-1:d>0n?1:0;}
function orient(a:P,b:P,c:P){const x=(b[0]-a[0])*(c[1]-a[1]),y=(b[1]-a[1])*(c[0]-a[0]),d=x-y;return Math.abs(d)>16*Number.EPSILON*(Math.abs(x)+Math.abs(y))?Math.sign(d):exactOrient(a,b,c);}
function contains(g:CrescentGeometry,p:P){let winding=0;for(let i=0;i<g.outline.length;i++){const a=g.outline[i]!,b=g.outline[(i+1)%g.outline.length]!,o=orient(a,b,p);if(segmentDistance(p,a,b)<=guard(g))return true;if(a[1]<=p[1]&&b[1]>p[1]&&o>0)winding++;if(a[1]>p[1]&&b[1]<=p[1]&&o<0)winding--;}return winding!==0;}
const clearances=new WeakMap<CrescentGeometry,{x:number;y:number;value:number}>();
function clearance(g:CrescentGeometry,p:P){let cached=clearances.get(g);if(!cached||cached.x!==p[0]||cached.y!==p[1]){let value=Infinity;for(let i=0;i<g.outline.length;i++)value=Math.min(value,segmentDistance(p,g.outline[i]!,g.outline[(i+1)%g.outline.length]!));cached={x:p[0],y:p[1],value:Math.max(0,value-guard(g))};clearances.set(g,cached);}return cached.value;}
export function crescentPlanarVisible(g:CrescentGeometry,a:P,b:P){
 if(Math.hypot(...sub(b,a))<clearance(g,a))return true;
 const cuts=[0,1],d=sub(b,a),dd=dot(d,d);if(dd===0)return contains(g,a);
 for(let i=0;i<g.outline.length;i++){
  const p=g.outline[i]!,q=g.outline[(i+1)%g.outline.length]!,s1=orient(a,b,p),s2=orient(a,b,q),s3=orient(p,q,a),s4=orient(p,q,b);
  if(s1*s2<0&&s3*s4<0)return false;
  if(s1===0){const t=dot(sub(p,a),d)/dd;if(t>0&&t<1)cuts.push(t);}
 }
 cuts.sort((x,y)=>x-y);for(let i=1;i<cuts.length;i++){const t=(cuts[i-1]!+cuts[i]!)/2;if(!contains(g,[a[0]+t*d[0],a[1]+t*d[1]]))return false;}return true;
}
interface StaticModel{edges:{a:P;b:P;unit:P;inward:P;size:B}[];offsets:B[];perimeter:B;cones:{beta:B;radius:number}[];visibility?:{to:number;length:B}[][]}
const models=new WeakMap<CrescentGeometry,StaticModel>();
function model(g:CrescentGeometry){let m=models.get(g);if(m)return m;const N=g.outline.length,edges=g.outline.map((a,i)=>{const b=g.outline[(i+1)%N]!,v=sub(b,a),size=length(minus(point(b),point(a))),n=mid(size);return{a,b,size,unit:[v[0]/n,v[1]/n] as P,inward:[-v[1]/n,v[0]/n] as P};}),offsets:B[]=[I.exact(0)];for(const e of edges)offsets.push(I.add(offsets.at(-1)!,e.size));
 const cones=edges.map((e,i)=>{const prev=edges[(i+N-1)%N]!,out=sub(e.b,e.a),back=sub(prev.a,e.a),beta=positiveAngle(I.pointCross(point(out),point(back)),I.pointDot(point(out),point(back)));let radius=Math.min(g.metadata.thicknessMeters,mid(e.size),mid(prev.size));for(let j=0;j<N;j++)if(j!==i&&j!==(i+N-1)%N)radius=Math.min(radius,segmentDistance(e.a,edges[j]!.a,edges[j]!.b));return{beta,radius:Math.max(0,radius-guard(g))};});
 m={edges,offsets,perimeter:offsets.at(-1)!,cones};models.set(g,m);return m;
}
function graph(g:CrescentGeometry){const m=model(g);if(m.visibility)return m.visibility;const N=g.outline.length,v:{to:number;length:B}[][]=Array.from({length:N},()=>[]);for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)if(crescentPlanarVisible(g,g.outline[i]!,g.outline[j]!)){const distance=length(minus(point(g.outline[i]!),point(g.outline[j]!)));v[i]!.push({to:j,length:distance});v[j]!.push({to:i,length:distance});}m.visibility=v;return v;}
export function crescentPlanarRoute(g:CrescentGeometry,a:P,b:P){
 if(crescentPlanarVisible(g,a,b))return{bounds:length(minus(point(b),point(a))),points:[a,b]};
 const base=graph(g),N=base.length,adj=base.map(v=>v.slice());adj.push([],[]);for(let i=0;i<N;i++)for(const [p,k]of[[a,N],[b,N+1]]as const)if(crescentPlanarVisible(g,p,g.outline[i]!)){const distance=length(minus(point(p),point(g.outline[i]!)));adj[k]!.push({to:i,length:distance});adj[i]!.push({to:k,length:distance});}
 function run(upper:boolean){const d=Array(adj.length).fill(Infinity) as number[],prior=Array(adj.length).fill(-1)as number[],seen=new Set<number>();d[N]=0;for(let k=0;k<adj.length;k++){let at=-1;for(let i=0;i<d.length;i++)if(!seen.has(i)&&(at<0||d[i]!<d[at]!))at=i;if(at<0||!Number.isFinite(d[at]!))break;if(at===N+1)break;seen.add(at);for(const e of adj[at]!){const x=I.adjacentFloat(d[at]!+e.length[upper?1:0],upper);if(x<d[e.to]!){d[e.to]=Math.max(0,x);prior[e.to]=at;}}}return{value:d[N+1]!,prior};}
 const lo=run(false),hi=run(true);if(!Number.isFinite(hi.value))throw RangeError('Crescent planar route disconnected.');const ids=[N+1];while(ids[0]!==N){const next=hi.prior[ids[0]!]!;if(next<0||ids.length>adj.length)throw RangeError('Invalid Crescent planar witness.');ids.unshift(next);}return{bounds:[lo.value,hi.value]as B,points:ids.map(i=>i===N?a:i===N+1?b:g.outline[i]!)};
}
interface Location{p:SurfacePosition;position:PolyhedronVector;bounds:readonly[B,B,B];cap?:1|-1;wall?:number;t?:B;y:B;physicalFaces?:readonly string[]}
function location(g:CrescentGeometry,p:SurfacePosition):Location{const q=g.normalize(p),id=g.physicalFaceId(q.patchId),position=g.referencePosition(q),bounds=polyhedronPositionBounds(g,q);if(id.startsWith('upper-')||id.startsWith('lower-'))return{p:q,position,bounds,cap:id.startsWith('upper-')?1:-1,y:bounds[1]};
 const wall=Number(id.slice(5)),N=g.outline.length,next=(wall+1)%N,ids=g.vertexIds(q.patchId),w=[I.subtract(I.exact(1),I.add(I.exact(q.u),I.exact(q.v))),I.exact(q.u),I.exact(q.v)],t=ids.reduce((s,v,i)=>v%N===next?I.add(s,w[i]!):s,I.exact(0));return{p:q,position,bounds,wall,t,y:bounds[1]};}
const capPoint=(a:Location):P=>[a.position[0],a.position[2]],capBounds=(a:Location):BP=>[a.bounds[0],a.bounds[2]];
const sourceLocations=new WeakMap<CrescentGeometry,Location>();
function sourceLocation(g:CrescentGeometry,p:SurfacePosition){if(p.worldId!==g.identity.worldId||p.surfaceId!==g.identity.surfaceId)throw RangeError('Foreign Crescent surface.');let cached=sourceLocations.get(g);if(!cached||cached.p.patchId!==p.patchId||cached.p.u!==p.u||cached.p.v!==p.v){cached=location(g,p);sourceLocations.set(g,cached);}return cached;}
function pointOnCap(g:CrescentGeometry,p:P,cap:1|-1):SurfacePosition{let best:{patchId:string;u:number;v:number;error:number}|undefined;for(const patchId of g.faces){if(!patchId.startsWith(cap===1?'upper-':'lower-'))continue;let{u,v}=g.localCoordinates(patchId,[p[0],cap*g.metadata.thicknessMeters/2,p[1]]);const error=Math.max(-u,-v,u+v-1,0);if(!best||error<best.error)best={patchId,u,v,error};if(error===0)break;}if(!best||best.error>1e-8)throw RangeError('Crescent route left its physical cap.');let u=Math.max(0,Math.min(1,best.u)),v=Math.max(0,Math.min(1,best.v));if(u+v>1)v=1-u;return g.normalize({...g.identity,patchId:best.patchId,u,v});}
function pointOnWall(g:CrescentGeometry,i:number,t:number,y:number):SurfacePosition{const e=model(g).edges[i]!,p:PolyhedronVector=[e.a[0]+t*(e.b[0]-e.a[0]),y,e.a[1]+t*(e.b[1]-e.a[1])];for(const patchId of g.faces.filter(f=>g.physicalFaceId(f)===`wall-${i}`)){let{u,v}=g.localCoordinates(patchId,p);if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8){u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1,v));if(u+v>1)v=1-u;return g.normalize({...g.identity,patchId,u,v});}}throw RangeError('Crescent route left its physical wall.');}
export {pointOnCap as crescentCapPosition,pointOnWall as crescentWallPosition};
interface Route{bounds:B;length:number;kind:string;at:(fraction:number)=>SurfacePosition}
function planar(g:CrescentGeometry,a:Location,b:Location):Route{a.physicalFaces??=[...new Set(g.aliases(a.p).map(p=>g.physicalFaceId(p.patchId)))];const direct=a.physicalFaces.includes(g.physicalFaceId(b.p.patchId)),path=direct?{bounds:length(minus(capBounds(b),capBounds(a))),points:[capPoint(a),capPoint(b)]}:crescentPlanarRoute(g,capPoint(a),capPoint(b)),pad=4*guard(g),bounds:B=[Math.max(0,path.bounds[0]-pad),path.bounds[1]+pad],parts=path.points.slice(1).map((p,i)=>Math.hypot(...sub(p,path.points[i]!))),total=parts.reduce((s,x)=>s+x,0);return{kind:'planar-domain',bounds,length:total,at:f=>{let distance=f*total;for(let i=0;i<parts.length;i++){if(distance<=parts[i]!||i===parts.length-1){const t=parts[i]?distance/parts[i]!:0,x=path.points[i]!,y=path.points[i+1]!;return pointOnCap(g,[x[0]+t*(y[0]-x[0]),x[1]+t*(y[1]-x[1])],a.cap!);}distance-=parts[i]!;}return b.p;}};}
function hinge(g:CrescentGeometry,a:Location,b:Location,edge:number,cap:1|-1):Route|undefined{
 const m=model(g),e=m.edges[edge]!,N=m.edges.length,H=g.metadata.thicknessMeters,pad=guard(g),unit:BP=[I.divide(I.subtract(I.exact(e.b[0]),I.exact(e.a[0])),e.size),I.divide(I.subtract(I.exact(e.b[1]),I.exact(e.a[1])),e.size)];
 const map=(p:Location):BP|undefined=>{if(p.cap===cap){const v=minus(capBounds(p),point(e.a)),x=I.pointDot(v,unit),y=I.pointCross(unit,v);if(x[0]<-pad||x[1]>e.size[1]+pad||y[1]<-pad)return;return[x,y];}if(p.wall===edge)return[I.multiply(p.t!,e.size),I.subtract(I.multiply(I.exact(cap),p.y),I.exact(H/2))];};
 const A=map(a),B=map(b);if(!A||!B)return;let escape=Math.min(A[0][0],e.size[0]-A[0][1],A[1][0]+H)-pad;
 const source=capPoint(a);for(let j=0;j<N;j++)if(j!==edge){const other=m.edges[j]!,dy=a.position[1]-cap*H/2;escape=Math.min(escape,Math.hypot(segmentDistance(source,other.a,other.b),dy)-pad);}
 const bounds=length(minus(B,A));if(bounds[1]>=escape)return;
 const av=A.map(mid)as unknown as P,bv=B.map(mid)as unknown as P,total=Math.hypot(...sub(bv,av));return{kind:'certified-hinge',bounds,length:total,at:f=>{const x=av[0]+f*(bv[0]-av[0]),y=av[1]+f*(bv[1]-av[1]);return y>=0?pointOnCap(g,[e.a[0]+e.unit[0]*x+e.inward[0]*y,e.a[1]+e.unit[1]*x+e.inward[1]*y],cap):pointOnWall(g,edge,x/mid(e.size),cap*(H/2+y));}};
}
function cone(g:CrescentGeometry,a:Location,b:Location,vertex:number,cap:1|-1):Route|undefined{
 const m=model(g),N=m.edges.length,next=m.edges[vertex]!,prev=m.edges[(vertex+N-1)%N]!,spec=m.cones[vertex]!,origin=point(next.a),H=g.metadata.thicknessMeters,pad=guard(g);
 const map=(p:Location)=>{
  if(p.cap===cap){const v=minus(capBounds(p),origin),r=length(v);if(r[1]<pad)return{r,angle:I.exact(0)};const d=minus(point(next.b),origin);let angle=positiveAngle(I.pointCross(d,v),I.pointDot(d,v));if(angle[0]>spec.beta[1]+1e-8)return;angle=[Math.max(0,angle[0]),Math.min(spec.beta[1],angle[1])];return{r,angle};}
  const down=I.subtract(I.exact(H/2),I.multiply(I.exact(cap),p.y));let x:B,angle:B;if(p.wall===vertex){x=I.multiply(p.t!,next.size);if(length([x,down])[1]<pad)return{r:length([x,down]),angle:I.exact(0)};angle=I.subtract(I.add(spec.beta,pi),crescentAngle(down,x));}else if(p.wall===(vertex+N-1)%N){x=I.multiply(I.subtract(I.exact(1),p.t!),prev.size);if(length([x,down])[1]<pad)return{r:length([x,down]),angle:spec.beta};angle=I.add(spec.beta,crescentAngle(down,x));}else return;return{r:length([x,down]),angle};
 };
 // Cheap geometric domain rejection precedes angular certificates.
 if(a.cap!==cap&&a.wall!==vertex&&a.wall!==(vertex+N-1)%N||b.cap!==cap&&b.wall!==vertex&&b.wall!==(vertex+N-1)%N)return;
 const sourceRadius=Math.hypot(a.position[0]-next.a[0],a.position[2]-next.a[1],a.position[1]-cap*H/2);if(sourceRadius>=spec.radius)return;
 const A=map(a),B=map(b);if(!A||!B)return;const alpha=I.add(spec.beta,pi),difference=absB(I.subtract(A.angle,B.angle)),delta=minB(difference,I.subtract(alpha,difference)),turn:B=[Math.max(0,Math.min(pi[0],delta[0])),Math.max(0,Math.min(pi[1],delta[1]))];
 let bounds:B;if(delta[0]>=pi[1])bounds=I.add(A.r,B.r);else{const squared=I.subtract(I.add(I.square(A.r),I.square(B.r)),I.multiply(I.multiply(I.exact(2),I.multiply(A.r,B.r)),trig(turn,true)));bounds=I.root([Math.max(0,squared[0]),Math.max(0,squared[1])]);}
 if(bounds[1]>=spec.radius-A.r[1]-pad)return;
 const beta=mid(spec.beta),period=beta+Math.PI,aa=mid(A.angle),bb=mid(B.angle),ra=mid(A.r),rb=mid(B.r);let d=bb-aa;if(d>period/2)d-=period;if(d< -period/2)d+=period;const through=Math.abs(d)>=Math.PI,total=through?ra+rb:Math.sqrt(Math.max(0,ra*ra+rb*rb-2*ra*rb*Math.cos(d)));
 const fromPolar=(radius:number,angle:number)=>{angle=(angle%period+period)%period;if(angle<=beta){const theta=Math.atan2(next.unit[1],next.unit[0])+angle;return pointOnCap(g,[next.a[0]+radius*Math.cos(theta),next.a[1]+radius*Math.sin(theta)],cap);}if(angle<=beta+Math.PI/2){const t=angle-beta;return pointOnWall(g,(vertex+N-1)%N,1-radius*Math.cos(t)/mid(prev.size),cap*(H/2-radius*Math.sin(t)));}const t=period-angle;return pointOnWall(g,vertex,radius*Math.cos(t)/mid(next.size),cap*(H/2-radius*Math.sin(t)));};
 return{kind:through?'certified-saddle-apex':'certified-vertex-cone',bounds,length:total,at:f=>{if(through){const s=f*total;return s<=ra?fromPolar(Math.max(0,ra-s),aa):fromPolar(s-ra,aa+d);}const x=(1-f)*ra*Math.cos(aa)+f*rb*Math.cos(aa+d),y=(1-f)*ra*Math.sin(aa)+f*rb*Math.sin(aa+d);let angle=Math.atan2(y,x);angle+=Math.round((aa+f*d-angle)/(2*Math.PI))*2*Math.PI;return fromPolar(Math.hypot(x,y),angle);}};
}
function wall(g:CrescentGeometry,a:Location,b:Location,feasibleOnly=false):Route|undefined{if(a.wall===undefined||b.wall===undefined)return;const m=model(g),A=I.add(m.offsets[a.wall]!,I.multiply(a.t!,m.edges[a.wall]!.size)),B=I.add(m.offsets[b.wall]!,I.multiply(b.t!,m.edges[b.wall]!.size));let best:{delta:B;bounds:B}|undefined;for(const wrap of[-1,0,1]){const delta=I.add(I.subtract(B,A),I.multiply(I.exact(wrap),m.perimeter)),bounds=length([delta,I.subtract(b.y,a.y)]);if(!best||bounds[1]<best.bounds[1])best={delta,bounds};}const candidate=best!,toCap=Math.min(g.metadata.thicknessMeters/2-a.y[1],g.metadata.thicknessMeters/2+a.y[0]);if(!feasibleOnly&&a.wall!==b.wall&&candidate.bounds[1]>=toCap-guard(g))return;
 const start=mid(A),delta=mid(candidate.delta),y0=a.position[1],dy=b.position[1]-y0;return{kind:'developed-wall',bounds:candidate.bounds,length:Math.hypot(delta,dy),at:f=>{const s=((start+f*delta)%g.perimeterMeters+g.perimeterMeters)%g.perimeterMeters;let edge=m.edges.length-1;for(let i=0;i<m.edges.length;i++)if(s<=g.perimeterOffsets[i+1]!){edge=i;break;}return pointOnWall(g,edge,(s-g.perimeterOffsets[edge]!)/mid(m.edges[edge]!.size),y0+f*dy);}};
}
function joined(parts:readonly Route[],kind:string):Route{const total=parts.reduce((s,p)=>s+p.length,0),bounds=parts.reduce((s,p)=>I.add(s,p.bounds),I.exact(0));return{kind,length:total,bounds,at:f=>{let distance=f*total;for(const p of parts){if(distance<=p.length)return p.at(p.length?distance/p.length:0);distance-=p.length;}return parts.at(-1)!.at(1);}};}
const reversed=(p:Route):Route=>({...p,at:f=>p.at(1-f)});
function numericRoute(g:CrescentGeometry,length:number,at:Route['at']):Route{const pad=64*guard(g);return{kind:'bounded-prism-unfolding',length,bounds:[Math.max(0,length-pad),length+pad],at};}
function edgeChoices(g:CrescentGeometry,p:Location,limit:number){const m=model(g),s=mid(m.offsets[p.wall!]!)+mid(p.t!)*mid(m.edges[p.wall!]!.size),out:{edge:number;s:number}[]=[];for(let i=0;i<m.edges.length;i++)for(const wrap of[-1,0,1]){const at=s+wrap*g.perimeterMeters,left=g.perimeterOffsets[i]!,right=g.perimeterOffsets[i+1]!;if(at>=left-limit&&at<=right+limit)out.push({edge:i,s:at-left});}return out;}
function unrolledWall(g:CrescentGeometry,s:number,depth:number,cap:1|-1){s=((s%g.perimeterMeters)+g.perimeterMeters)%g.perimeterMeters;let edge=g.outline.length-1;for(let i=0;i<g.outline.length;i++)if(s<=g.perimeterOffsets[i+1]!){edge=i;break;}return pointOnWall(g,edge,(s-g.perimeterOffsets[edge]!)/mid(model(g).edges[edge]!.size),cap*(g.metadata.thicknessMeters/2-depth));}
/** A shortest path can visit a planar cap in one contiguous interval: replace
 * any departure/reentry by its nonexpansive cap projection. In the qualified
 * <H/2 neighborhood it cannot visit both caps. Between boundary entries the
 * entire lateral strip is exactly Euclidean in (perimeter, axial) coordinates.
 * Enumerate only perimeter intervals that a shorter witness could reach. */
function directCapWall(g:CrescentGeometry,start:P,end:Location,cap:1|-1,limit:number):Route|undefined{
 const m=model(g),depth=g.metadata.thicknessMeters/2-cap*end.position[1];let best:Route|undefined;const pad=guard(g);
 for(const choice of edgeChoices(g,end,limit)){
  const e=m.edges[choice.edge]!,v=sub(start,e.a),x=dot(v,e.unit),y=dot(v,e.inward),sum=y+depth;if(y< -pad||sum<=0)continue;
  const entry=(x*depth+choice.s*y)/sum;if(entry< -pad||entry>mid(e.size)+pad)continue;const t=Math.max(0,Math.min(1,entry/mid(e.size))),q:P=[e.a[0]+t*(e.b[0]-e.a[0]),e.a[1]+t*(e.b[1]-e.a[1])];if(!crescentPlanarVisible(g,start,q))continue;
  const total=Math.hypot(choice.s-x,sum);if(total>=limit||best&&total>=best.length)continue;const split=Math.max(0,y)/sum,offset=g.perimeterOffsets[choice.edge]!;
  best=numericRoute(g,total,f=>{const s=x+f*(choice.s-x),d=y-f*sum;return f<=split?pointOnCap(g,[e.a[0]+s*e.unit[0]+d*e.inward[0],e.a[1]+s*e.unit[1]+d*e.inward[1]],cap):unrolledWall(g,offset+s,-d,cap);});
 }
 return best;
}
function minimumRoutes(candidates:readonly Route[]){if(!candidates.length)return;const best=candidates.reduce((a,b)=>a.length<=b.length?a:b);return{...best,bounds:[Math.min(...candidates.map(p=>p.bounds[0])),Math.min(...candidates.map(p=>p.bounds[1]))]as B};}
function capWall(g:CrescentGeometry,a:Location,b:Location,limit:number):Route|undefined{
 const source=capPoint(a),candidates:Route[]=[],direct=directCapWall(g,source,b,a.cap!,limit);if(direct)candidates.push(direct);
 for(const vertex of g.outline){if(Math.hypot(...sub(vertex,source))>=limit)continue;const tail=directCapWall(g,vertex,b,a.cap!,limit);if(!tail)continue;const head=planar(g,a,location(g,pointOnCap(g,vertex,a.cap!))),candidate=joined([head,tail],'bounded-prism-unfolding');if(candidate.bounds[1]<limit)candidates.push(candidate);}
 return minimumRoutes(candidates);
}
function wallViaCap(g:CrescentGeometry,a:Location,b:Location,cap:1|-1,limit:number):Route|undefined{
 const m=model(g),depthA=g.metadata.thicknessMeters/2-cap*a.position[1],depthB=g.metadata.thicknessMeters/2-cap*b.position[1];if(depthA+depthB>=limit)return;const candidates:Route[]=[];
 const intersection=(a:P,b:P,c:P,d:P)=>{const v=sub(b,a),w=sub(d,c),den=v[0]*w[1]-v[1]*w[0];if(Math.abs(den)<Number.EPSILON*g.scaleMeters**2)return;const q=sub(c,a),t=(q[0]*w[1]-q[1]*w[0])/den,u=(q[0]*v[1]-q[1]*v[0])/den;if(t<0||t>1||u<0||u>1)return;return{t,u,point:[c[0]+u*w[0],c[1]+u*w[1]]as P};};
 for(const A of edgeChoices(g,a,limit))for(const B of edgeChoices(g,b,limit)){
  const e=m.edges[A.edge]!,f=m.edges[B.edge]!,x:P=[e.a[0]+A.s*e.unit[0]-depthA*e.inward[0],e.a[1]+A.s*e.unit[1]-depthA*e.inward[1]],y:P=[f.a[0]+B.s*f.unit[0]-depthB*f.inward[0],f.a[1]+B.s*f.unit[1]-depthB*f.inward[1]],total=Math.hypot(...sub(y,x));if(total>=limit)continue;
  const entry=intersection(x,y,e.a,e.b),exit=intersection(x,y,f.a,f.b);if(!entry||!exit||entry.t>exit.t||!crescentPlanarVisible(g,entry.point,exit.point))continue;
  candidates.push(numericRoute(g,total,t=>{const p:P=[x[0]+t*(y[0]-x[0]),x[1]+t*(y[1]-x[1])];if(t>=entry.t&&t<=exit.t)return pointOnCap(g,p,cap);const edge=t<entry.t?A.edge:B.edge,base=m.edges[edge]!,v=sub(p,base.a);return unrolledWall(g,g.perimeterOffsets[edge]!+dot(v,base.unit),-dot(v,base.inward),cap);}));
 }
 const starts:{vertex:P;route:Route}[]=[],ends:{vertex:P;route:Route}[]=[];
 for(const vertex of g.outline){const first=directCapWall(g,vertex,a,cap,limit),last=directCapWall(g,vertex,b,cap,limit);if(first)starts.push({vertex,route:first});if(last)ends.push({vertex,route:last});}
 for(const first of starts)for(const last of ends){if(first.route.bounds[0]+last.route.bounds[0]>=limit)continue;const middle=planar(g,location(g,pointOnCap(g,first.vertex,cap)),location(g,pointOnCap(g,last.vertex,cap))),candidate=joined([reversed(first.route),middle,last.route],'bounded-prism-unfolding');if(candidate.bounds[1]<limit)candidates.push(candidate);}
 return minimumRoutes(candidates);
}
function prism(g:CrescentGeometry,a:Location,b:Location):Route|undefined{
 const limit=g.metadata.thicknessMeters/2,qualified=(r:Route|undefined)=>r&&r.bounds[1]<limit-512*guard(g)?r:undefined;
 if(a.cap!==undefined&&b.wall!==undefined)return qualified(capWall(g,a,b,limit));
 if(b.cap!==undefined&&a.wall!==undefined){const r=qualified(capWall(g,b,a,limit));return r&&reversed(r);}
 if(a.wall!==undefined&&b.wall!==undefined){const direct=wall(g,a,b,true),upper=wallViaCap(g,a,b,1,limit),lower=wallViaCap(g,a,b,-1,limit);return qualified(minimumRoutes([direct&&direct.bounds[1]<limit?direct:undefined,upper,lower].filter((p):p is Route=>!!p)));}
}
function route(g:CrescentGeometry,first:SurfacePosition,last:SurfacePosition,tolerance:number){const a=sourceLocation(g,first),b=location(g,last);if(a.p.patchId===b.p.patchId&&a.p.u===b.p.u&&a.p.v===b.p.v)return{kind:'stationary',bounds:[0,0]as B,length:0,at:()=>b.p};let result:Route|undefined;
 if(a.cap!==undefined&&a.cap===b.cap)result=planar(g,a,b);
 if(!result)result=wall(g,a,b);
 if(!result){const caps=a.cap?[a.cap]:b.cap?[b.cap]:[1,-1]as const;for(const cap of caps){const edges=a.wall!==undefined?[a.wall]:b.wall!==undefined?[b.wall]:[];for(const i of edges){result=hinge(g,a,b,i,cap);if(result)break;}if(result)break;for(let i=0;i<g.outline.length;i++){result=cone(g,a,b,i,cap);if(result)break;}if(result)break;}}
 if(!result)result=prism(g,a,b);
 if(!result)throw RangeError('Crescent transition exceeds the certified local surface domain.');
 if(result.bounds[1]-result.bounds[0]>tolerance)throw RangeError('Crescent distance certificate exceeds the requested precision.');return result;
}
/** Planar projection is nonexpansive and remains in the extruded domain. It is
 * a global LOWER bound, never a replacement for physical cap/wall distance. */
export function crescentProjectionLowerBound(g:CrescentGeometry,a:SurfacePosition,b:SurfacePosition){const x=location(g,a),y=location(g,b);if(x.wall!==undefined&&y.wall!==undefined&&(Math.abs(x.wall-y.wall)<=1||Math.abs(x.wall-y.wall)===g.outline.length-1)||g.physicalFaceId(a.patchId)===g.physicalFaceId(b.patchId))return Math.max(0,length(minus(capBounds(y),capBounds(x)))[0]-4*guard(g));return Math.max(0,crescentPlanarRoute(g,capPoint(x),capPoint(y)).bounds[0]-4*guard(g));}
export function crescentDistance(g:CrescentGeometry,a:SurfacePosition,b:SurfacePosition,options:{absoluteToleranceMeters?:number;maxBoxes?:number}={}){const tolerance=options.absoluteToleranceMeters??g.scaleMeters*1e-6;if(!Number.isFinite(tolerance)||tolerance<=0||!Number.isInteger(options.maxBoxes??32768)||(options.maxBoxes??32768)<1)throw RangeError('Invalid Crescent certificate options.');const r=route(g,a,b,tolerance);return{scope:'global-reference-surface' as const,lowerBoundMeters:r.bounds[0],upperBoundMeters:r.bounds[1],evaluatedBoxes:0,method:r.kind};}
export function crescentPath(g:CrescentGeometry,a:SurfacePosition,b:SurfacePosition,options:{version:1;absoluteToleranceMeters?:number;maxBoxes?:number}={version:1}){if(options.version!==1)throw RangeError('Unsupported Crescent path.');const r=route(g,a,b,options.absoluteToleranceMeters??g.scaleMeters*1e-6);return{end:g.normalize(b),pieces:[{kind:r.kind}],lengthMeters:r.length,lengthUpperBoundMeters:Math.max(r.length,r.bounds[1]),lengthErrorBoundMeters:Math.max(r.length,r.bounds[1])-Math.min(r.length,r.bounds[0]),distance:{evaluatedBoxes:0},atDistance:(meters:number)=>{if(!Number.isFinite(meters)||meters<0||meters>r.length)throw RangeError('Crescent path position outside its length.');const position=meters===0?g.normalize(a):meters===r.length?g.normalize(b):r.at(r.length?meters/r.length:1);return{position,referencePosition:g.referencePosition(position),tangent:null,pieceIndex:0,distanceMeters:meters,atEnd:meters===r.length,oneSidedPatchId:position.patchId};}};}
/** Preserve compressed native positions by subdividing an actual surface
 * curve before the unchanged local route guard. Wall input follows the genuine
 * developed perimeter strip. Mixed input goes through the real cap/wall join;
 * it is a feasible input curve, not a claim of globally shortest influence. */
export function crescentPointerInputs(g:CrescentGeometry,first:SurfacePosition,last:SurfacePosition,limit:number){const a=location(g,first),b=location(g,last);if(!Number.isFinite(limit)||limit<=0)throw RangeError('Invalid Crescent pointer spacing.');let path:Route;
 if(a.cap!==undefined&&a.cap===b.cap)path=planar(g,a,b);
 else if(a.wall!==undefined&&b.wall!==undefined){const m=model(g),sa=mid(m.offsets[a.wall]!)+mid(a.t!)*mid(m.edges[a.wall]!.size),sb=mid(m.offsets[b.wall]!)+mid(b.t!)*mid(m.edges[b.wall]!.size);let ds=sb-sa;if(ds>g.perimeterMeters/2)ds-=g.perimeterMeters;if(ds< -g.perimeterMeters/2)ds+=g.perimeterMeters;const dy=b.position[1]-a.position[1];path={kind:'pointer-wall',length:Math.hypot(ds,dy),bounds:I.exact(Math.hypot(ds,dy)),at:f=>unrolledWall(g,sa+f*ds,g.metadata.thicknessMeters/2-a.position[1]-f*dy,1)};}
 else{const cap=a.cap??b.cap;if(cap===undefined||a.cap!==undefined&&b.cap!==undefined)throw RangeError('Crescent pointer cannot cross solid material.');const source=a.cap!==undefined?a:b,end=a.wall!==undefined?a:b,boundary=location(g,pointOnCap(g,capPoint(end),cap)),capPath=planar(g,source,boundary),verticalLength=Math.abs(end.position[1]-cap*g.metadata.thicknessMeters/2),vertical:Route={kind:'pointer-cap-wall',length:verticalLength,bounds:I.exact(verticalLength),at:f=>pointOnWall(g,end.wall!,mid(end.t!),cap*g.metadata.thicknessMeters/2+f*(end.position[1]-cap*g.metadata.thicknessMeters/2))},forward=joined([capPath,vertical],'pointer-cap-wall');path=a.cap!==undefined?forward:reversed(forward);}
 const count=Math.max(1,Math.ceil(path.length/(limit*.5)));if(count>256)throw RangeError('Crescent pointer curve exceeds the bounded input budget.');return Array.from({length:count},(_,i)=>i===count-1?b.p:path.at((i+1)/count));}
