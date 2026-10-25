import {SphericalSession} from './spherical-session.ts';
import {prepareSphericalSession} from './prepare-spherical-session.ts';
import {INITIAL_SPHERICAL_VIEW,recenterSphere,sphericalLayout,type SphericalView} from '../rendering/spherical-view.ts';
import {unitDirection,dot3,type Vec3} from '../surfaces/cube-sphere.ts';
import type {CrescentCutGlobeWorld} from '../terrain/crescent-cut-globe.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
import {defaultSphericalControls,sphericalBrushFromControls,type SphericalControlState} from './spherical-controls.ts';
import type {SphericalDisplayCache} from '../rendering/spherical-raster.ts';
export interface CutGlobeEditing {readonly view:Omit<SphericalView,'cutGlobe'|'interior'|'interiorView'|'eyeMeters'>;readonly controls:SphericalControlState}
export function cutGlobeOverview(world:CrescentCutGlobeWorld):SphericalView {const a=world.geometry.axis,up:Vec3=Math.abs(a[2])<.9?[0,0,1]:[0,1,0],tangent=unitDirection(up.map((v,i)=>v-dot3(up,a)*a[i]!) as unknown as Vec3),forward=unitDirection(a.map((v,i)=>.5*v+Math.sqrt(1-.5**2)*tangent[i]!) as unknown as Vec3);return{...recenterSphere(INITIAL_SPHERICAL_VIEW,forward),cutGlobe:world.geometry,mapRegion:'all'};}
export function defaultCutGlobeEditing(world:CrescentCutGlobeWorld):CutGlobeEditing {const {cutGlobe,...view}=cutGlobeOverview(world);return{view,controls:{...defaultSphericalControls(world.geometry.radiusMeters),limbAssist:false}};}
export function validateCutGlobeEditing(world:Pick<CrescentCutGlobeWorld,'geometry'>,value:CutGlobeEditing):CutGlobeEditing {
 if(!value||typeof value!=='object'||!value.view||!value.controls)throw Error('Invalid Crescent-Cut Globe editing state.');
 const exact=(v:object,keys:string[])=>{if(JSON.stringify(Object.keys(v).sort())!==JSON.stringify(keys.sort()))throw Error('Unsupported Crescent-Cut Globe editing fields.');};
 exact(value,['view','controls']);exact(value.view,['mode','frame','zoom','pan','mapRegion']);exact(value.view.frame,['right','up','forward']);exact(value.view.pan,['x','y']);exact(value.controls,['tool','radius','strength','intensity','target','edgeAssist','limbAssist']);
 for(const axis of Object.values(value.view.frame))if(!Array.isArray(axis)||axis.length!==3||Object.keys(axis).length!==3)throw Error('Invalid Crescent-Cut Globe camera axes.');
 sphericalLayout(value.view,{width:800,height:600});if(Math.abs(value.view.pan.x)>3||Math.abs(value.view.pan.y)>2||!['all','retained','cut'].includes(value.view.mapRegion as string))throw Error('Invalid Crescent-Cut Globe map view.');
 const c=value.controls;if(!['navigate','raise','lower','smooth','flatten'].includes(c.tool)||[c.radius,c.strength,c.intensity,c.target].some(v=>typeof v!=='string'||!v.trim()||v.length>80)||typeof c.edgeAssist!=='boolean'||c.limbAssist!==false)throw Error('Invalid Crescent-Cut Globe brush controls.');
 const r=world.geometry.radiusMeters;if(!sphericalBrushFromControls({...c,tool:'raise'},r)||!sphericalBrushFromControls({...c,tool:'smooth'},r)||!sphericalBrushFromControls({...c,tool:'flatten'},r))throw Error('Invalid Crescent-Cut Globe brush settings.');
 return structuredClone(value);
}
export class CrescentCutGlobeSession extends SphericalSession {
 editing:CutGlobeEditing;captureEditing=()=>{};
 readonly world:CrescentCutGlobeWorld;
 constructor(world:CrescentCutGlobeWorld,cache:SphericalDisplayCache,name:string,saved:boolean,editing?:CutGlobeEditing){super(world.terrain,cache,name,saved,world.geometry);this.world=world;this.editing=validateCutGlobeEditing(world,editing??defaultCutGlobeEditing(world));}
}
export async function prepareCrescentCutGlobeSession(world:CrescentCutGlobeWorld,name:string,saved=false,work:PersistenceWork={},editing?:CutGlobeEditing){const prepared=await prepareSphericalSession(world.terrain,name,saved,work),editor=new CrescentCutGlobeSession(world,prepared.cache,name,saved,editing);return{...prepared,world,editor};}
