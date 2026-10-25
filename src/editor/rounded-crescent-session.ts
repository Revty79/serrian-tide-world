import {SphericalSession} from './spherical-session.ts';
import {prepareSphericalSession} from './prepare-spherical-session.ts';
import {sphericalLayout,type SphericalView} from '../rendering/spherical-view.ts';
import {defaultSphericalControls,sphericalBrushFromControls,type SphericalControlState} from './spherical-controls.ts';
import {roundedBrushPolicy} from '../terrain/rounded-crescent-brush-metric.ts';
import type {RoundedCrescentWorld} from '../terrain/rounded-crescent-globe.ts';
import type {SphericalDisplayCache} from '../rendering/spherical-raster.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
export interface RoundedCrescentEditing {readonly view:Pick<SphericalView,'mode'|'frame'|'zoom'|'pan'>;readonly controls:SphericalControlState}
export function roundedOverview(world:Pick<RoundedCrescentWorld,'geometry'>):SphericalView{const s=.25,c=Math.sqrt(1-s*s);return{mode:'globe',frame:{right:[c,0,-s],up:[0,1,0],forward:[s,0,c]},zoom:1,pan:{x:0,y:0},roundedGlobe:world.geometry};}
export function roundedControlRange(g:RoundedCrescentWorld['geometry']){const p=roundedBrushPolicy(g);return{minimum:Math.max(p.minimum,g.scaleMeters*.002),maximum:p.maximum,elevationLimit:g.elevationLimitMeters};}
export function defaultRoundedEditing(world:RoundedCrescentWorld):RoundedCrescentEditing{const {roundedGlobe,...view}=roundedOverview(world),g=world.geometry;return{view,controls:{...defaultSphericalControls(g.scaleMeters),radius:String(roundedBrushPolicy(g).defaultRadius),strength:String(Math.min(150,g.elevationLimitMeters/20)),limbAssist:false}};}
export function validateRoundedEditing(world:Pick<RoundedCrescentWorld,'geometry'>,value:RoundedCrescentEditing):RoundedCrescentEditing{
 const exact=(o:object,keys:string[])=>{if(!o||typeof o!=='object'||JSON.stringify(Object.keys(o).sort())!==JSON.stringify(keys.sort()))throw Error('Unsupported Rounded Crescent editor fields.');};
 exact(value,['view','controls']);exact(value.view,['mode','frame','zoom','pan']);exact(value.view.frame,['right','up','forward']);exact(value.view.pan,['x','y']);exact(value.controls,['tool','radius','strength','intensity','target','edgeAssist','limbAssist']);
 for(const axis of Object.values(value.view.frame))if(!Array.isArray(axis)||axis.length!==3||Object.keys(axis).length!==3)throw Error('Invalid Rounded Crescent camera axes.');sphericalLayout(value.view,{width:800,height:600});if(Math.abs(value.view.pan.x)>3||Math.abs(value.view.pan.y)>2)throw Error('Invalid Rounded Crescent map or focus offset.');
 const c=value.controls;if(!['navigate','raise','lower','smooth','flatten'].includes(c.tool)||[c.radius,c.strength,c.intensity,c.target].some(v=>typeof v!=='string'||!v.trim()||v.length>80)||typeof c.edgeAssist!=='boolean'||c.limbAssist!==false)throw Error('Invalid Rounded Crescent brush controls.');
 for(const tool of ['raise','smooth','flatten'] as const)if(!sphericalBrushFromControls({...c,tool},world.geometry.scaleMeters,roundedControlRange(world.geometry)))throw Error('Invalid Rounded Crescent brush settings.');return structuredClone(value);
}
export class RoundedCrescentSession extends SphericalSession {
 readonly world:RoundedCrescentWorld;editing:RoundedCrescentEditing;captureEditing=()=>{};
 constructor(world:RoundedCrescentWorld,cache:SphericalDisplayCache,name:string,saved=false,editing?:RoundedCrescentEditing){super(world.terrain,cache,name,saved,undefined,world.geometry);this.world=world;this.editing=validateRoundedEditing(world,editing??defaultRoundedEditing(world));}
}
export async function prepareRoundedCrescentSession(world:RoundedCrescentWorld,name:string,saved=false,work:PersistenceWork={},editing?:RoundedCrescentEditing){const prepared=await prepareSphericalSession(world.terrain,name,saved,work);return{...prepared,world,editor:new RoundedCrescentSession(world,prepared.cache,name,saved,editing)};}
