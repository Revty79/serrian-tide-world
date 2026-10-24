import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {torusVisible} from '../rendering/torus-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {torusDelta} from '../surfaces/torus.ts';
import {torusLocalDistance,torusTrigBounds} from '../surfaces/torus-distance.ts';
import {torusPointerPath} from '../surfaces/torus-path.ts';
import type {TorusTerrain,TorusKey} from './torus.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
import {connectedSmoothEstimate} from './connected-smoothing.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
export function torusBrushPolicy(t:TorusTerrain){const{majorRadiusMeters:R,minorRadiusMeters:r}=t.geometry.metadata,n=t.subdivisions,maxSpacing=Math.hypot(2*Math.PI*(R+r)/(4*n),2*Math.PI*r/n);return{minimum:maxSpacing/2,maximum:.3*r,defaultRadius:Math.max(.15*r,3*maxSpacing),maxSpacing};}
function candidates(t:TorusTerrain,input:SurfacePosition,radius:number){const g=t.geometry,center=g.normalize(input),r=g.metadata.minorRadiusMeters,R=g.metadata.majorRadiusMeters,A=4*t.subdivisions,B=t.subdivisions,guard=r*1e-10,cosine=torusTrigBounds([torusDelta(center.v),torusDelta(center.v)],true),minimum=Math.max(R-r,R+r*cosine[0]-radius-guard),du=(radius+guard)/minimum,dv=(radius+guard)/r;
 if(!Number.isFinite(radius)||radius<=0||radius>=torusBrushPolicy(t).maximum)throw RangeError('Torus brush radius exceeds its measured local footprint.');
 const bound=(p:SurfacePosition)=>Math.max(0,Math.min(radius,Math.hypot(minimum*torusDelta(p.u-center.u),r*torusDelta(p.v-center.v)))-guard);
 return{center,chordLowerBound:bound,*samples(){const found:{key:TorusKey;position:SurfacePosition}[]=[];const seen=new Set<number>();for(let row=Math.floor((center.v-dv)/2/Math.PI*B)-1;row<=Math.ceil((center.v+dv)/2/Math.PI*B)+1;row++)for(let column=Math.floor((center.u-du)/2/Math.PI*A)-1;column<=Math.ceil((center.u+du)/2/Math.PI*A)+1;column++){const key=t.resolve({...g.identity,patchId:'tube',row,column});if(seen.has(key.index))continue;seen.add(key.index);const position=t.positionAt(t.owner(key));if(Math.hypot(minimum*torusDelta(position.u-center.u),r*torusDelta(position.v-center.v))>=radius+guard)continue;found.push({key,position});}yield* found.sort((a,b)=>a.key.index-b.key.index);}};
}
function smooth(t:TorusTerrain,k:TorusKey,current:number){const p=t.positionAt(t.owner(k)),r=t.geometry.metadata.minorRadiusMeters,q=t.geometry.metadata.majorRadiusMeters/r,du=2*Math.PI/(4*t.subdivisions),dv=2*Math.PI/t.subdivisions,a=q+Math.cos(p.v),weights=[dv/(a*du),dv/(a*du),(q+Math.cos(p.v+dv/2))*du/dv,(q+Math.cos(p.v-dv/2))*du/dv];return connectedSmoothEstimate(t,t.neighbors(k),weights,current,a*du*dv);}
export const TORUS_DAB_ADAPTER=Object.freeze<ConnectedDabAdapter<TorusTerrain>>({candidates,distance:(t,a,b,o)=>torusLocalDistance(t.geometry,a,b,o),smooth});
const adapter=Object.freeze<ConnectedStrokeAdapter<TorusTerrain>>({...TORUS_DAB_ADAPTER,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.metadata.minorRadiusMeters,path:(t,a,b,o)=>torusPointerPath(t.geometry,a,b,o)});
function visibleAdapter(view?:CylinderView):ConnectedDabAdapter<TorusTerrain>{return view?{...TORUS_DAB_ADAPTER,candidates:(t,p,r)=>{const plan=candidates(t,p,r);return{...plan,*samples(){for(const item of plan.samples())if(torusVisible(t.geometry,item.position,view))yield item;}};}}:TORUS_DAB_ADAPTER;}
export type TorusStrokeOptions=ConnectedStrokeOptions<TorusTerrain>&{readonly view?:CylinderView};
export const prepareTorusDab=(t:TorusTerrain,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={},view?:CylinderView)=>prepareConnectedDab(t,p,s,visibleAdapter(view),limits);
export const beginTorusStroke=(t:TorusTerrain,h:ConnectedHistory<TorusTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,options:TorusStrokeOptions={})=>beginConnectedStroke(t,h,p,s,{...adapter,...visibleAdapter(options.view)},options);
