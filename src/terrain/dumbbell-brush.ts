import type {SurfacePosition} from '../surfaces/contracts.ts';
import {prepareDumbbellDistance} from '../surfaces/dumbbell-distance.ts';
import {dumbbellNeckDistance} from '../surfaces/dumbbell-neck-distance.ts';
import {dumbbellPointerPath} from '../surfaces/dumbbell-path.ts';
import type {DumbbellTerrain} from './dumbbell.ts';
import {createPolyhedronBrush,polyhedronBrushPolicy} from './polyhedron-brush.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {dumbbellVisible} from '../rendering/dumbbell-view.ts';

export const dumbbellBrushPolicy=polyhedronBrushPolicy;
const accepted=createPolyhedronBrush<DumbbellTerrain>(),sources=new WeakMap<DumbbellTerrain,{center:SurfacePosition;radius:number;prepared?:ReturnType<typeof prepareDumbbellDistance>}>();
const base:ConnectedDabAdapter<DumbbellTerrain>={...accepted.adapter,
 candidates:(t,p,r)=>{const plan=accepted.adapter.candidates(t,p,r);sources.set(t,{center:plan.center,radius:r});return plan;},
 distance:(t,a,b,o)=>{const state=sources.get(t);if(!state||state.center.patchId!==a.patchId||state.center.u!==a.u||state.center.v!==a.v)throw Error('Dumbbell distance must use its bound candidate source.');const neck=dumbbellNeckDistance(t.geometry,a,b);if(neck&&neck.upperBoundMeters-neck.lowerBoundMeters<=o.absoluteToleranceMeters)return neck;state.prepared??=prepareDumbbellDistance(t.geometry,a,state.radius+t.geometry.scaleMeters*1e-9,o.absoluteToleranceMeters);return state.prepared.distance(b,o);},
};
function visible(view?:CylinderView):ConnectedDabAdapter<DumbbellTerrain>{return view?{...base,candidates:(t,p,r)=>{const plan=base.candidates(t,p,r);return{...plan,*samples(){for(const item of plan.samples())if(dumbbellVisible(t.geometry,item.position,view))yield item;}};}}:base;}
export type DumbbellStrokeOptions=ConnectedStrokeOptions<DumbbellTerrain>&{readonly view?:CylinderView};
const stroke:ConnectedStrokeAdapter<DumbbellTerrain>={...base,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.scaleMeters,path:(t,a,b,o)=>dumbbellPointerPath(t.geometry,a,b,o)};
export const prepareDumbbellDab=(t:DumbbellTerrain,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={},view?:CylinderView)=>prepareConnectedDab(t,p,s,visible(view),limits);
export const beginDumbbellStroke=(t:DumbbellTerrain,h:ConnectedHistory<DumbbellTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:DumbbellStrokeOptions={})=>beginConnectedStroke(t,h,p,s,{...stroke,...visible(o.view)},o);
