import type {SurfacePosition} from '../surfaces/contracts.ts';
import {crescentDistance,crescentPath,crescentProjectionLowerBound} from '../surfaces/crescent-distance.ts';
import type {CrescentTerrain} from './crescent.ts';
import {createPolyhedronBrush,polyhedronBrushPolicy} from './polyhedron-brush.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeOptions,type ConnectedStrokeAdapter} from './connected-stroke.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {crescentVisible} from '../rendering/crescent-view.ts';

const accepted=createPolyhedronBrush<CrescentTerrain>();
export const crescentBrushPolicy=polyhedronBrushPolicy;
export const crescentDabAdapter:ConnectedDabAdapter<CrescentTerrain>={
 ...accepted.adapter,
 candidates:(t,p,r)=>{const plan=accepted.adapter.candidates(t,p,r),sector=(p:SurfacePosition)=>{const id=t.geometry.physicalFaceId(p.patchId),i=Number(id.slice(id.lastIndexOf('-')+1));return id.startsWith('wall-')?(i<t.geometry.segments?i:2*t.geometry.segments-1-i):i;},sourceSector=sector(plan.center);return{...plan,chordLowerBound:q=>{const lower=plan.chordLowerBound(q);return lower>=r||Math.abs(sector(q)-sourceSector)<=2?lower:Math.max(lower,crescentProjectionLowerBound(t.geometry,plan.center,q));}};},
 distance:(t,a,b,o)=>crescentDistance(t.geometry,a,b,o),
};
function visible(view?:CylinderView):ConnectedDabAdapter<CrescentTerrain>{return view?{...crescentDabAdapter,candidates:(t,p,r)=>{const plan=crescentDabAdapter.candidates(t,p,r);return{...plan,*samples(){for(const item of plan.samples())if(crescentVisible(t.geometry,item.position,view))yield item;}};}}:crescentDabAdapter;}
export function prepareCrescentDab(t:CrescentTerrain,p:SurfacePosition,s:CylindricalBrushSettings,limits:CylinderDabLimits={},view?:CylinderView){return prepareConnectedDab(t,p,s,visible(view),limits);}
export type CrescentStrokeOptions=ConnectedStrokeOptions<CrescentTerrain>&{readonly view?:CylinderView};
const adapter:ConnectedStrokeAdapter<CrescentTerrain>={...crescentDabAdapter,normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.scaleMeters,path:(t,a,b,o)=>crescentPath(t.geometry,a,b,o)};
export function beginCrescentStroke(t:CrescentTerrain,h:ConnectedHistory<CrescentTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,options:CrescentStrokeOptions={}){return beginConnectedStroke(t,h,p,s,{...adapter,...visible(options.view)},options);}
