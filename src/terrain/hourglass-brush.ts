import type {SurfacePosition} from '../surfaces/contracts.ts';
import {prepareAxialDistance} from '../surfaces/axial-distance.ts';
import {hourglassCapDistance} from '../surfaces/hourglass-cap-distance.ts';
import {axialWaistDistance} from '../surfaces/axial-waist-distance.ts';
import {axialPointerPath} from '../surfaces/axial-path.ts';
import type {HourglassTerrain} from './hourglass.ts';
import {createPolyhedronBrush} from './polyhedron-brush.ts';
import type {HourglassGeometry} from '../surfaces/hourglass.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {axialVisible} from '../rendering/axial-view.ts';

export function hourglassGeometryBrushPolicy(g:HourglassGeometry,n:number){const maxSpacing=g.maximumLatticeEdgeMeters/n,axial=g.metadata.waistLengthMeters/n,angular=Math.min(...Array.from({length:16},(_,j)=>{const a=g.vertices[65+j]!,b=g.vertices[65+(j+1)%16]!;return Math.hypot(a[1]-b[1],a[2]-b[2])/n;})),previewRadius=.95*(Math.sqrt(1600*angular*axial/Math.PI)-Math.hypot(angular,axial)/2),maximum=Math.min(.24*g.minimumDimensionMeters,previewRadius),preferred=Math.max(.0837*g.minimumDimensionMeters,3*maxSpacing);return{minimum:maxSpacing*.5,maximum,defaultRadius:Math.min(maximum*.9,preferred),maxSpacing,wellSampled:3*maxSpacing<=maximum*.9};}
export const hourglassBrushPolicy=(t:HourglassTerrain)=>hourglassGeometryBrushPolicy(t.geometry,t.subdivisions);
const accepted=createPolyhedronBrush<HourglassTerrain>(),sources=new WeakMap<HourglassTerrain,{center:SurfacePosition;radius:number;prepared?:ReturnType<typeof prepareAxialDistance>}>();
const base:ConnectedDabAdapter<HourglassTerrain>={...accepted.adapter,
 candidates:(t,p,r)=>{if(r>=hourglassBrushPolicy(t).maximum)throw RangeError('Hourglass brush exceeds its qualified physical footprint.');const plan=accepted.adapter.candidates(t,p,r);sources.set(t,{center:plan.center,radius:r});return plan;},
 distance:(t,a,b,o)=>{const state=sources.get(t);if(!state||state.center.patchId!==a.patchId||state.center.u!==a.u||state.center.v!==a.v)throw Error('Hourglass distance must use its bound candidate source.');const terminal=hourglassCapDistance(t.geometry,a,b,o.absoluteToleranceMeters);if(terminal)return terminal;const neck=axialWaistDistance(t.geometry,a,b,-t.geometry.metadata.heightMeters/2,t.geometry.metadata.heightMeters/2);if(neck&&neck.upperBoundMeters-neck.lowerBoundMeters<=o.absoluteToleranceMeters)return neck;state.prepared??=prepareAxialDistance(t.geometry,a,state.radius+t.geometry.scaleMeters*1e-9,o.absoluteToleranceMeters);return state.prepared.distance(b,o);},
};
function visible(view?:CylinderView):ConnectedDabAdapter<HourglassTerrain>{return view?{...base,candidates:(t,p,r)=>{const plan=base.candidates(t,p,r);return{...plan,*samples(){for(const item of plan.samples())if(axialVisible(t.geometry,item.position,view))yield item;}};}}:base;}
export type HourglassStrokeOptions=ConnectedStrokeOptions<HourglassTerrain>&{readonly view?:CylinderView};
const stroke:ConnectedStrokeAdapter<HourglassTerrain>={...base,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.scaleMeters,path:(t,a,b,o)=>axialPointerPath(t.geometry,a,b,o)};
export const prepareHourglassDab=(t:HourglassTerrain,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={},view?:CylinderView)=>prepareConnectedDab(t,p,s,visible(view),limits);
export const beginHourglassStroke=(t:HourglassTerrain,h:ConnectedHistory<HourglassTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:HourglassStrokeOptions={})=>beginConnectedStroke(t,h,p,s,{...stroke,...visible(o.view)},o);
