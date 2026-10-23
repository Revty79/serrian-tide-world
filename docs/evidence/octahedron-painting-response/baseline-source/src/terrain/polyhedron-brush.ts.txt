import type {SurfacePosition} from '../surfaces/contracts.ts';
import {paintingStage} from '../editor/painting-metrics.ts';
import {pyramidDot,pyramidSub} from '../surfaces/pyramid.ts';
import {polyhedronDistance,reconstructPolyhedronPath,polyhedronArithmeticGuard} from '../surfaces/polyhedron-path.ts';
import type {PolyhedronTerrain} from './polyhedron-contract.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
import {connectedSmoothEstimate} from './connected-smoothing.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {cylinderCenterInspection} from '../rendering/cylindrical-view.ts';
export function polyhedronBrushPolicy(t:PolyhedronTerrain){const g=t.geometry,n=t.subdivisions,maximum=.24*g.minimumDimensionMeters,maxSpacing=g.maximumLatticeEdgeMeters/n,preferred=Math.max(.0837*g.minimumDimensionMeters,3*maxSpacing);return{minimum:maxSpacing*.5,maximum,defaultRadius:Math.min(maximum*.9,preferred),maxSpacing,wellSampled:preferred<=maximum*.9};}
export function createPolyhedronBrush<T extends PolyhedronTerrain>(){
function candidates(t:T,input:SurfacePosition,radius:number){const g=t.geometry,center=g.normalize(input),q=g.referencePosition(center),guard=polyhedronArithmeticGuard(g),n=t.subdivisions;if(!Number.isFinite(radius)||radius<=0||radius>=polyhedronBrushPolicy(t).maximum)throw RangeError('Pyramid radius exceeds the supported bounded footprint.');
 return{center,chordLowerBound:(p:SurfacePosition)=>Math.max(0,Math.hypot(...pyramidSub(g.referencePosition(p),q))-guard),*samples(){const unique=new Map<number,{key:ReturnType<T['keyAt']>;position:SurfacePosition}>();
  for(const patchId of g.faces){const f=g.frame(patchId),d=pyramidSub(q,f.origin),planeDistance=Math.max(0,Math.abs(pyramidDot(f.normal,d))-guard);if(planeDistance>radius+guard)continue;const projectedRadius=Math.sqrt(Math.max(0,(radius+guard)**2-planeDistance**2)),uu=pyramidDot(f.u,f.u),uv=pyramidDot(f.u,f.v),vv=pyramidDot(f.v,f.v),det=uu*vv-uv*uv,du=pyramidDot(d,f.u),dv=pyramidDot(d,f.v),u=(du*vv-dv*uv)/det,v=(dv*uu-du*uv)/det,ru=projectedRadius*Math.sqrt(vv/det),rv=projectedRadius*Math.sqrt(uu/det),left=Math.max(0,Math.ceil((u-ru)*n)-1),right=Math.min(n,Math.floor((u+ru)*n)+1),top=Math.max(0,Math.ceil((v-rv)*n)-1),bottom=Math.min(n,Math.floor((v+rv)*n)+1);
   for(let row=top;row<=bottom;row++)for(let column=left;column<=Math.min(right,g.isTriangle(patchId)?n-row:n);column++){const p={...g.identity,patchId,row,column},key=t.resolve(p) as ReturnType<T['keyAt']>;if(!unique.has(key.index))unique.set(key.index,{key,position:t.positionAt(p)});}
  }for(const[,value]of[...unique].sort(([a],[b])=>a-b))yield value;
 }};
}
function smooth(t:T,key:ReturnType<T['keyAt']>,current:number){const neighbors=t.neighbors(key),p=t.referencePositionAt(key),weights=neighbors.map(k=>1/pyramidDot(pyramidSub(t.referencePositionAt(k),p),pyramidSub(t.referencePositionAt(k),p))),area=neighbors.reduce((sum,k)=>sum+pyramidDot(pyramidSub(t.referencePositionAt(k),p),pyramidSub(t.referencePositionAt(k),p)),0)/(neighbors.length*t.geometry.scaleMeters**2);return connectedSmoothEstimate(t,neighbors,weights,current,area);}
const adapter=Object.freeze<ConnectedDabAdapter<T>>({candidates,distance:(t,a,b,o)=>paintingStage('certifiedDistance',()=>polyhedronDistance(t.geometry,a,b,o)),smooth:smooth});
function visibleAdapter(view?:CylinderView):ConnectedDabAdapter<T>{return view?{...adapter,candidates:(t,p,r)=>{const plan=candidates(t,p,r);return{...plan,*samples(){for(const item of plan.samples())if(view.mode==='map'||!cylinderCenterInspection(view)&&t.geometry.aliases(item.position).some(p=>pyramidDot(t.geometry.normal(p),view.frame.forward)>1e-9))yield item;}};}}:adapter;}
function prepare(t:T,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={},view?:CylinderView){return prepareConnectedDab(t,p,s,visibleAdapter(view),limits);}
const strokeAdapter=Object.freeze<ConnectedStrokeAdapter<T>>({...adapter,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.scaleMeters,path:(t,a,b,o)=>paintingStage('certifiedPath',()=>reconstructPolyhedronPath(t.geometry,a,b,o))});

function begin(t:T,h:ConnectedHistory<T>,p:SurfacePosition,s:CylindricalBrushSettings,options:ConnectedStrokeOptions<T>&{readonly view?:CylinderView}={}){return beginConnectedStroke(t,h,p,s,{...strokeAdapter,...visibleAdapter(options.view)},options);}

return{adapter,smooth,prepare,begin};
}
