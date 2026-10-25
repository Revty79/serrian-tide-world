import {createPolyhedronBrush,polyhedronBrushPolicy} from './polyhedron-brush.ts';
import {ribbonDistance,ribbonPath} from '../surfaces/ribbon-distance.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
import type {RibbonTerrain} from './ribbon.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
const accepted=createPolyhedronBrush<RibbonTerrain>();
const policies=new WeakMap<RibbonTerrain['geometry'],Map<number,ReturnType<typeof polyhedronBrushPolicy>>>();
export function ribbonBrushPolicy(t:Pick<RibbonTerrain,'geometry'|'subdivisions'>){const found=policies.get(t.geometry)?.get(t.subdivisions);if(found)return found;const p=polyhedronBrushPolicy(t as RibbonTerrain),g=t.geometry,d=g.metadata,density=Math.max(...g.faces.map(f=>{const q=g.frame(f);return t.subdivisions**2/Math.hypot(q.u[1]*q.v[2]-q.u[2]*q.v[1],q.u[2]*q.v[0]-q.u[0]*q.v[2],q.u[0]*q.v[1]-q.u[1]*q.v[0]);})),stationReach=1.5*d.lengthMeters/d.segments*(1-d.bendRadians/d.lengthMeters*Math.hypot(d.widthMeters,d.thicknessMeters)/2),maximum=Math.min(p.maximum,Math.sqrt(3500/(1.5*Math.PI*density)),stationReach),preferred=Math.max(.0837*g.minimumDimensionMeters,3*p.maxSpacing),value=Object.freeze({...p,maximum,defaultRadius:Math.min(maximum*.9,preferred),wellSampled:preferred<=maximum*.9}),cache=policies.get(g)??new Map();cache.set(t.subdivisions,value);policies.set(g,cache);return value;}
export const RIBBON_DAB_ADAPTER:ConnectedDabAdapter<RibbonTerrain>={...accepted.adapter,candidates:(t,p,r)=>{if(r>=ribbonBrushPolicy(t).maximum)throw RangeError('Ribbon radius exceeds its qualified candidate footprint.');return accepted.adapter.candidates(t,p,r);},distance:(t,a,b,o)=>ribbonDistance(t.geometry,a,b,{...o,reachMeters:ribbonBrushPolicy(t).maximum})};
export const RIBBON_STROKE_ADAPTER:ConnectedStrokeAdapter<RibbonTerrain>={...RIBBON_DAB_ADAPTER,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.scaleMeters,path:(t,a,b,o)=>ribbonPath(t.geometry,a,b,{...o,reachMeters:ribbonBrushPolicy(t).maximum})};
export function prepareRibbonDab(t:RibbonTerrain,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={}){return prepareConnectedDab(t,p,s,RIBBON_DAB_ADAPTER,limits);}
export function beginRibbonStroke(t:RibbonTerrain,h:ConnectedHistory<RibbonTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,options:ConnectedStrokeOptions<RibbonTerrain>={}){return beginConnectedStroke(t,h,p,s,RIBBON_STROKE_ADAPTER,options);}
