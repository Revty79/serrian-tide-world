import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {IndexedTerrain} from '../terrain/indexed-float32.ts';
import type {IndexedDisplayTerrain,IndexedDisplayCache} from '../rendering/indexed-display-cache.ts';
import type {beginConnectedStroke} from '../terrain/connected-stroke.ts';
import type {prepareConnectedDab,CylindricalBrushSettings,CylinderDabLimits} from '../terrain/connected-brush.ts';
import type {ConnectedHistory,ConnectedCommitJob} from './connected-history.ts';
import type {ConnectedPreparedPatch} from './connected-work-protocol.ts';
export type ConnectedSessionTerrain=IndexedTerrain<{readonly index:number}>&IndexedDisplayTerrain<{readonly index:number}>;
export interface ConnectedSessionView{readonly mode:string;readonly frame:unknown}
export interface ConnectedStencil{readonly center:SurfacePosition;readonly indices:Uint32Array;readonly revision:number;readonly settings:CylindricalBrushSettings;readonly affectedSamples:number}
export interface ConnectedSessionStrokeOptions{readonly spacingMeters:number;readonly dabLimits:CylinderDabLimits;readonly maxDabs:number}
export type ConnectedSessionStroke<T extends ConnectedSessionTerrain>=Pick<ReturnType<typeof beginConnectedStroke<T>>,'status'|'failure'|'statistics'|'move'|'release'|'cancel'|'pump'>;
export type ConnectedWorkerSessionStroke<T extends ConnectedSessionTerrain>=ConnectedSessionStroke<T>&{readonly diagnostics:{readonly backend:string};waitForProgress():Promise<void>};
export type ConnectedWorkerFactory=()=>Worker;
export interface ConnectedSessionHooks<T extends ConnectedSessionTerrain,View extends ConnectedSessionView>{
 createCache(terrain:T):IndexedDisplayCache<T>;
 begin(terrain:T,history:ConnectedHistory<T>,center:SurfacePosition,settings:CylindricalBrushSettings,options:ConnectedSessionStrokeOptions):ConnectedSessionStroke<T>;
 visibility(terrain:T,view:View):(center:SurfacePosition,indices:Iterable<number>)=>void;
 prepareStencil(terrain:T,center:SurfacePosition,settings:CylindricalBrushSettings,view:View):{readonly job:ReturnType<typeof prepareConnectedDab<T>>;finish():ConnectedStencil};
 readonly workers?:{
  readonly factory:ConnectedWorkerFactory;
  begin(terrain:T,history:ConnectedHistory<T>,center:SurfacePosition,settings:CylindricalBrushSettings,options:ConnectedSessionStrokeOptions,changed:()=>void,factory:ConnectedWorkerFactory):ConnectedWorkerSessionStroke<T>;
  preparedPatch(terrain:T,prepared:ConnectedPreparedPatch):ConnectedCommitJob<T>;
  startPreview(worker:Worker,input:{readonly terrain:T;readonly task:number;readonly revision:number;readonly values:Float32Array;readonly center:SurfacePosition;readonly settings:CylindricalBrushSettings;readonly view:View;readonly measure:boolean}):void;
 };
}
