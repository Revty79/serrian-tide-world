import type {SurfaceIdentity,SurfacePosition} from '../surfaces/contracts.ts';
import type {Vec3} from '../surfaces/cube-sphere.ts';
import type {ConnectedSessionTerrain} from '../editor/connected-session-contracts.ts';
import type {CylinderControls} from '../editor/cylinder-controls.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {IndexedDisplayCache} from '../rendering/indexed-display-cache.ts';
import type {CylinderView,CylinderViewport,CylinderScreenPoint} from '../rendering/cylindrical-view.ts';
import type {CylinderAppearance} from '../rendering/cylindrical-elevation.ts';
import type {CoherentTerrainRaster,TerrainRasterUpdate,RasterRegions} from '../rendering/coherent-terrain-raster.ts';
import type {TerrainDisplayDab} from '../rendering/cylinder-dirty-region.ts';
import type {SurfaceDisplayReceipt} from '../rendering/surface-renderer.ts';
export interface WorkspaceTerrain extends ConnectedSessionTerrain{readonly metadata:ConnectedSessionTerrain['metadata']&{readonly identity:SurfaceIdentity;readonly terrainId:string;readonly representation:{readonly provider?:string;readonly version?:number;readonly resolution?:{readonly angularSamples:number;readonly axialCells:number;readonly radialCells:number}}}}
export interface WorkspaceGPU<V,Scene>{readonly available:boolean;readonly backend?:'cpu'|'webgl2';readonly displayCanvas?:HTMLCanvasElement;readonly statistics:{readonly renderer:string;readonly reason:string};setScene(scene:Scene|undefined):void;present(view:V,size:CylinderViewport,appearance:CylinderAppearance):SurfaceDisplayReceipt;fail(error:unknown):void;dispose():void}
/** Geometry hooks only. Input arbitration, frame budgets, cache epochs, history,
 * progressive display and tool chrome remain in one accepted workspace. */
export interface ConnectedWorkspaceAdapter<T extends WorkspaceTerrain,V extends CylinderView,Scene>{
 readonly label?:string;readonly description?:string;readonly numericalDescription?:string;
 readonly mapHelp?:string;readoutText?(p:SurfacePosition,index:number,height:number):string;
 readonly radiusMeters:number;readonly lengthMeters:number;readonly minBrushRadius:number;readonly maxBrushRadius:number;
 readonly regions:readonly{readonly id:string;readonly label:string}[];
 defaultControls():CylinderControls;brush(c:CylinderControls):CylindricalBrushSettings|undefined;
 initial(mode?:CylinderView['mode']):V;normalizeView(view:CylinderView):V;
 pointAt(cache:IndexedDisplayCache<T>,view:V,size:CylinderViewport,p:CylinderScreenPoint,scene?:Scene):SurfacePosition|undefined;
 pointerMessage?(cache:IndexedDisplayCache<T>,view:V,size:CylinderViewport,p:CylinderScreenPoint,scene?:Scene):string|undefined;
 project(p:SurfacePosition,view:V,size:CylinderViewport):CylinderScreenPoint|undefined;
 samplePositions(index:number,view:V):readonly SurfacePosition[];
 sample(index:number):object;readout(p:SurfacePosition):{readonly index:number;readonly height:number};
 guides(mark:CanvasRenderingContext2D,view:V,size:CylinderViewport):void;
 aperture(mark:CanvasRenderingContext2D,anchor:SurfacePosition,radius:number,view:V,size:CylinderViewport):void;
 continuous(a:CylinderScreenPoint,b:CylinderScreenPoint,view:V,size:CylinderViewport,scene?:Scene):boolean;
 navigate(view:V,dx:number,dy:number,size:CylinderViewport):V;
 recenter(view:V,p:SurfacePosition):V;region(view:V,id:string):SurfacePosition;
 readonly inspectionEye?:Vec3;validateEye(eye:Vec3,scene?:Scene):boolean;
 /** Raw camera-frame axis for an actual World-space look direction. Existing
  * cylinder rays use +forward; the accepted polyhedral camera uses -forward. */
 inspectionForward?(lookDirection:Vec3):Vec3;
 cutView(view:V,scene?:Scene):boolean;sceneStamp(scene?:Scene):string;
 dirtyRegion?(changes:readonly TerrainDisplayDab[],view:V,size:CylinderViewport,columns:number,rows:number):RasterRegions|undefined;
 raster(cache:IndexedDisplayCache<T>,view:V,size:CylinderViewport,budget:number,reusable:Uint8ClampedArray|undefined,appearance:CylinderAppearance,scene?:Scene,update?:TerrainRasterUpdate):Generator<void,CoherentTerrainRaster>;
 gpu(canvas:HTMLCanvasElement,cache:IndexedDisplayCache<T>,invalidate:()=>void,fallbackCanvas?:HTMLCanvasElement):WorkspaceGPU<V,Scene>;
}
