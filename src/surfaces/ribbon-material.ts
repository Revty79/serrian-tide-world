import type {RibbonGeometry} from './ribbon.ts';
import type {SurfacePosition} from './contracts.ts';
const regions=['first-face','left-side','second-face','right-side'] as const;
export function ribbonMaterial(g:RibbonGeometry,p:SurfacePosition){const q=g.normalize(p),ids=g.vertexIds(q.patchId),weights=g.weights(q);let station=0,U=0,V=0;for(let i=0;i<3;i++){const m=g.materialVertex(ids[i]!);station+=m[0]*weights[i]!;U+=m[1]*weights[i]!;V+=m[2]*weights[i]!;}return{station,U,V,region:g.region(q.patchId)};}
export function ribbonLateralPosition(g:RibbonGeometry,region:typeof regions[number],station:number,fraction:number){
 const N=g.metadata.segments,pieces=region.endsWith('face')?g.metadata.widthSegments:g.metadata.thicknessSegments;
 if(!Number.isFinite(station)||station<0||station>N||!Number.isFinite(fraction)||fraction<0||fraction>1||!regions.includes(region))throw RangeError('Ribbon material position is bounded.');
 const i=Math.min(N-1,Math.floor(station)),s=station-i,piece=Math.min(pieces-1,Math.floor(fraction*pieces)),f=fraction*pieces-piece,triangle=s<=f?0:1,u=triangle===0?f-s:f,v=triangle===0?s:s-f;return g.normalize({...g.identity,patchId:`${region}-${i}-${2*piece+triangle}:0`,u,v});
}
export function ribbonCapPosition(g:RibbonGeometry,end:'first-end'|'second-end',U:number,V:number){
 if(![U,V].every(Number.isFinite)||Math.max(Math.abs(U),Math.abs(V))>1)throw RangeError('Ribbon cap coordinates are bounded.');
 for(const patchId of g.faces.filter(f=>g.region(f)===end)){const ids=g.vertexIds(patchId),a=g.materialVertex(ids[0]!).slice(1),b=g.materialVertex(ids[1]!).slice(1),c=g.materialVertex(ids[2]!).slice(1),ux=b[0]!-a[0]!,uy=b[1]!-a[1]!,vx=c[0]!-a[0]!,vy=c[1]!-a[1]!,det=ux*vy-uy*vx;let u=((U-a[0]!)*vy-(V-a[1]!)*vx)/det,v=(ux*(V-a[1]!)-uy*(U-a[0]!))/det;if(u>=-1e-12&&v>=-1e-12&&u+v<=1+1e-12){u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1,v));if(u+v>1)v=1-u;return g.normalize({...g.identity,patchId,u,v});}}
 throw Error('Ribbon cap chart is missing.');
}
/** Pointer resampling follows a real material trajectory. The certified path
 * engine still decides every influential route between the resulting points. */
export function ribbonPointerInputs(g:RibbonGeometry,first:SurfacePosition,last:SurfacePosition,limitMeters:number):SurfacePosition[]{
 if(!Number.isFinite(limitMeters)||limitMeters<=0)throw RangeError('Positive Ribbon pointer interval required.');
 const a=ribbonMaterial(g,first),b=ribbonMaterial(g,last),d=g.metadata,lengths=[d.widthMeters,d.thicknessMeters,d.widthMeters,d.thicknessMeters],offsets=[0,d.widthMeters,d.widthMeters+d.thicknessMeters,2*d.widthMeters+d.thicknessMeters],perimeter=2*(d.widthMeters+d.thicknessMeters),lateral=(r:string)=>regions.includes(r as typeof regions[number]),fraction=(m:typeof a)=>m.region==='first-face'?(1-m.U)/2:m.region==='second-face'?(m.U+1)/2:m.region==='left-side'?(1-m.V)/2:(m.V+1)/2;
 const samples=(length:number,at:(fraction:number)=>SurfacePosition)=>{const n=Math.max(1,Math.ceil(length/limitMeters));if(n>256)throw RangeError('Ribbon pointer jump exceeds bounded input preparation.');return Array.from({length:n},(_,i)=>i===n-1?g.normalize(last):at((i+1)/n));};
 if(lateral(a.region)&&lateral(b.region)){const ai=regions.indexOf(a.region as typeof regions[number]),bi=regions.indexOf(b.region as typeof regions[number]),start=offsets[ai]!+fraction(a)*lengths[ai]!,finish=offsets[bi]!+fraction(b)*lengths[bi]!;let delta=finish-start;if(delta>perimeter/2)delta-=perimeter;if(delta< -perimeter/2)delta+=perimeter;
  const stretch=2*(1+(Math.abs(d.twistRadians)+d.bendRadians)*Math.hypot(d.widthMeters,d.thicknessMeters)/(2*d.lengthMeters)),length=Math.hypot((b.station-a.station)*d.lengthMeters/d.segments,delta)*stretch;
  return samples(length,t=>{let m=((start+delta*t)%perimeter+perimeter)%perimeter,k=0;while(k<3&&m>offsets[k]!+lengths[k]!)k++;return ribbonLateralPosition(g,regions[k]!,a.station+(b.station-a.station)*t,Math.max(0,Math.min(1,(m-offsets[k]!)/lengths[k]!)));});
 }
 if(a.region===b.region&&!lateral(a.region))return samples(Math.hypot((b.U-a.U)*d.widthMeters/2,(b.V-a.V)*d.thicknessMeters/2),t=>ribbonCapPosition(g,a.region as 'first-end'|'second-end',a.U+(b.U-a.U)*t,a.V+(b.V-a.V)*t));
 if(lateral(a.region)!==lateral(b.region)){
  const cap=lateral(a.region)?b:a,side=lateral(a.region)?a:b,end=cap.region as 'first-end'|'second-end',join=ribbonLateralPosition(g,side.region as typeof regions[number],end==='first-end'?0:d.segments,fraction(side)),capJoin=g.aliases(join).find(p=>g.region(p.patchId)===end);
  if(!capJoin)throw Error('Ribbon terminal material alias is missing.');
  const one=lateral(a.region)?ribbonPointerInputs(g,first,join,limitMeters):ribbonPointerInputs(g,first,capJoin,limitMeters),two=lateral(a.region)?ribbonPointerInputs(g,capJoin,last,limitMeters):ribbonPointerInputs(g,join,last,limitMeters);if(one.length+two.length>256)throw RangeError('Ribbon pointer interval exceeds bounded input preparation.');return[...one,...two];
 }
 return[g.normalize(last)];
}
