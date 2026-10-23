import type {SurfacePosition} from '../surfaces/contracts.ts';
import {PYRAMID_FACES,pyramidDot,pyramidSub} from '../surfaces/pyramid.ts';
import {pyramidDistance,reconstructPyramidPath,pyramidArithmeticGuard} from '../surfaces/pyramid-path.ts';
import type {PyramidTerrain,PyramidSampleKey} from './pyramid.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
import {connectedSmoothEstimate} from './connected-smoothing.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {pyramidVisibility} from '../rendering/pyramid-view.ts';
export function pyramidBrushPolicy(t:PyramidTerrain){const{baseWidthMeters:w,heightMeters:h}=t.geometry.metadata,n=t.subdivisions,maximum=.24*Math.min(w,h),maxSpacing=Math.max(w,Math.hypot(w/2,h))/n,preferred=Math.max(.0837*Math.min(w,h),3*maxSpacing);return{minimum:maxSpacing*.5,maximum,defaultRadius:Math.min(maximum*.9,preferred),maxSpacing,wellSampled:preferred<=maximum*.9};}
function candidates(t:PyramidTerrain,input:SurfacePosition,radius:number){const g=t.geometry,center=g.normalize(input),q=g.referencePosition(center),guard=pyramidArithmeticGuard(g),n=t.subdivisions;if(!Number.isFinite(radius)||radius<=0||radius>=pyramidBrushPolicy(t).maximum)throw RangeError('Pyramid radius exceeds the supported bounded footprint.');
 return{center,chordLowerBound:(p:SurfacePosition)=>Math.max(0,Math.hypot(...pyramidSub(g.referencePosition(p),q))-guard),*samples(){const unique=new Map<number,{key:PyramidSampleKey;position:SurfacePosition}>();
  for(const patchId of PYRAMID_FACES){const f=g.faceFrames[patchId],d=pyramidSub(q,f.origin),planeDistance=Math.max(0,Math.abs(pyramidDot(f.normal,d))-guard);if(planeDistance>radius+guard)continue;const projectedRadius=Math.sqrt(Math.max(0,(radius+guard)**2-planeDistance**2)),uu=pyramidDot(f.u,f.u),uv=pyramidDot(f.u,f.v),vv=pyramidDot(f.v,f.v),det=uu*vv-uv*uv,du=pyramidDot(d,f.u),dv=pyramidDot(d,f.v),u=(du*vv-dv*uv)/det,v=(dv*uu-du*uv)/det,ru=projectedRadius*Math.sqrt(vv/det),rv=projectedRadius*Math.sqrt(uu/det),left=Math.max(0,Math.ceil((u-ru)*n)-1),right=Math.min(n,Math.floor((u+ru)*n)+1),top=Math.max(0,Math.ceil((v-rv)*n)-1),bottom=Math.min(n,Math.floor((v+rv)*n)+1);
   for(let row=top;row<=bottom;row++)for(let column=left;column<=Math.min(right,patchId==='base'?n:n-row);column++){const p={...g.identity,patchId,row,column},key=t.resolve(p);if(!unique.has(key.index))unique.set(key.index,{key,position:t.positionAt(p)});}
  }for(const[,value]of[...unique].sort(([a],[b])=>a-b))yield value;
 }};
}
export function pyramidSmoothEstimate(t:PyramidTerrain,key:PyramidSampleKey,current:number){const neighbors=t.neighbors(key),p=t.referencePositionAt(key),weights=neighbors.map(k=>1/pyramidDot(pyramidSub(t.referencePositionAt(k),p),pyramidSub(t.referencePositionAt(k),p))),area=neighbors.reduce((sum,k)=>sum+pyramidDot(pyramidSub(t.referencePositionAt(k),p),pyramidSub(t.referencePositionAt(k),p)),0)/(neighbors.length*t.geometry.scaleMeters**2);return connectedSmoothEstimate(t,neighbors,weights,current,area);}
export const PYRAMID_DAB_ADAPTER=Object.freeze<ConnectedDabAdapter<PyramidTerrain>>({candidates,distance:(t,a,b,o)=>pyramidDistance(t.geometry,a,b,o),smooth:pyramidSmoothEstimate});
function visibleAdapter(view?:CylinderView):ConnectedDabAdapter<PyramidTerrain>{return view?{...PYRAMID_DAB_ADAPTER,candidates:(t,p,r)=>{const plan=candidates(t,p,r);return{...plan,*samples(){for(const item of plan.samples())if(pyramidVisibility(t.geometry,view,item.position))yield item;}};}}:PYRAMID_DAB_ADAPTER;}
export function preparePyramidDab(t:PyramidTerrain,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={},view?:CylinderView){return prepareConnectedDab(t,p,s,visibleAdapter(view),limits);}
const strokeAdapter=Object.freeze<ConnectedStrokeAdapter<PyramidTerrain>>({...PYRAMID_DAB_ADAPTER,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.scaleMeters,path:(t,a,b,o)=>reconstructPyramidPath(t.geometry,a,b,o)});
export interface PyramidStrokeOptions extends ConnectedStrokeOptions<PyramidTerrain>{readonly view?:CylinderView}
export function beginPyramidStroke(t:PyramidTerrain,h:ConnectedHistory<PyramidTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,options:PyramidStrokeOptions={}){return beginConnectedStroke(t,h,p,s,{...strokeAdapter,...visibleAdapter(options.view)},options);}
