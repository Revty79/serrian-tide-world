import type {SurfacePosition} from '../surfaces/contracts.ts';
import {prepareDumbbellDistance} from '../surfaces/dumbbell-distance.ts';
import {dumbbellNeckDistance} from '../surfaces/dumbbell-neck-distance.ts';
import {dumbbellTerminalDistance} from '../surfaces/dumbbell-terminal-distance.ts';
import {dumbbellPointerPath} from '../surfaces/dumbbell-path.ts';
import type {DumbbellTerrain} from './dumbbell.ts';
import {createPolyhedronBrush} from './polyhedron-brush.ts';
import type {DumbbellGeometry} from '../surfaces/dumbbell.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {dumbbellVisible} from '../rendering/dumbbell-view.ts';

export function dumbbellGeometryBrushPolicy(g:DumbbellGeometry,n:number){const maxSpacing=g.maximumLatticeEdgeMeters/n,axial=g.metadata.neckLengthMeters/n,angular=Math.min(...Array.from({length:16},(_,j)=>{const a=g.vertices[65+j]!,b=g.vertices[65+(j+1)%16]!;return Math.hypot(a[1]-b[1],a[2]-b[2])/n;})),previewRadius=.95*(Math.sqrt(1600*angular*axial/Math.PI)-Math.hypot(angular,axial)/2),maximum=Math.min(.24*g.minimumDimensionMeters,previewRadius),preferred=Math.max(.0837*g.minimumDimensionMeters,3*maxSpacing);return{minimum:maxSpacing*.5,maximum,defaultRadius:Math.min(maximum*.9,preferred),maxSpacing,wellSampled:3*maxSpacing<=maximum*.9};}
export const dumbbellBrushPolicy=(t:DumbbellTerrain)=>dumbbellGeometryBrushPolicy(t.geometry,t.subdivisions);
const accepted=createPolyhedronBrush<DumbbellTerrain>(),sources=new WeakMap<DumbbellTerrain,{center:SurfacePosition;radius:number;prepared?:ReturnType<typeof prepareDumbbellDistance>}>();
const base:ConnectedDabAdapter<DumbbellTerrain>={...accepted.adapter,
 candidates:(t,p,r)=>{if(r>=dumbbellBrushPolicy(t).maximum)throw RangeError('Dumbbell brush exceeds its qualified physical footprint.');const plan=accepted.adapter.candidates(t,p,r);sources.set(t,{center:plan.center,radius:r});return plan;},
 distance:(t,a,b,o)=>{const state=sources.get(t);if(!state||state.center.patchId!==a.patchId||state.center.u!==a.u||state.center.v!==a.v)throw Error('Dumbbell distance must use its bound candidate source.');const terminal=dumbbellTerminalDistance(t.geometry,a,b,o.absoluteToleranceMeters);if(terminal)return terminal;const neck=dumbbellNeckDistance(t.geometry,a,b);if(neck&&neck.upperBoundMeters-neck.lowerBoundMeters<=o.absoluteToleranceMeters)return neck;state.prepared??=prepareDumbbellDistance(t.geometry,a,state.radius+t.geometry.scaleMeters*1e-9,o.absoluteToleranceMeters);return state.prepared.distance(b,o);},
};
function visible(view?:CylinderView):ConnectedDabAdapter<DumbbellTerrain>{return view?{...base,candidates:(t,p,r)=>{const plan=base.candidates(t,p,r);return{...plan,*samples(){for(const item of plan.samples())if(dumbbellVisible(t.geometry,item.position,view))yield item;}};}}:base;}
export type DumbbellStrokeOptions=ConnectedStrokeOptions<DumbbellTerrain>&{readonly view?:CylinderView};
const stroke:ConnectedStrokeAdapter<DumbbellTerrain>={...base,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.scaleMeters,path:(t,a,b,o)=>dumbbellPointerPath(t.geometry,a,b,o)};
export const prepareDumbbellDab=(t:DumbbellTerrain,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={},view?:CylinderView)=>prepareConnectedDab(t,p,s,visible(view),limits);
export const beginDumbbellStroke=(t:DumbbellTerrain,h:ConnectedHistory<DumbbellTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:DumbbellStrokeOptions={})=>beginConnectedStroke(t,h,p,s,{...stroke,...visible(o.view)},o);
