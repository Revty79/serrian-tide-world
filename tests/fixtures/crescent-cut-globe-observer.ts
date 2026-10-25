import {SphereWebGLRenderer} from '../../src/rendering/spherical-webgl.ts';
import {SphericalSession} from '../../src/editor/spherical-session.ts';
import type {CrescentCutGlobeSession} from '../../src/editor/crescent-cut-globe-session.ts';
import {projectSphere,type SphericalView} from '../../src/rendering/spherical-view.ts';
import {createSphericalTerrain} from '../../src/terrain/spherical.ts';
import {startSphericalBrushStroke,type SphericalBrushSettings,type SphericalBrushVisibility} from '../../src/terrain/spherical-brush.ts';
import {unitDirection,type Vec3} from '../../src/surfaces/cube-sphere.ts';
import {cutGlobeRim,cutGlobeRegion} from '../../src/surfaces/crescent-cut-globe.ts';
const registry=globalThis as unknown as {__cutGlobeObserver?:{active?:CrescentCutGlobeSession;gpu?:SphereWebGLRenderer}};const shared=registry.__cutGlobeObserver??={};
const present=SphereWebGLRenderer.prototype.present;SphereWebGLRenderer.prototype.present=function(...args){if((this as unknown as {canvas:HTMLCanvasElement}).canvas.classList.contains('sphere-gpu'))shared.gpu=this;return present.apply(this,args);};
export function renderCurrentGPU(){const c=canvas(),r=c.getBoundingClientRect();if(!shared.gpu?.available)throw Error('Current hardware renderer unavailable.');shared.gpu.present(view(),{width:r.width,height:r.height},JSON.parse(c.dataset.displayDiagnostics!).appearance);return shared.gpu;}

const update=SphericalSession.prototype.updateDisplay;
SphericalSession.prototype.updateDisplay=function(){if(this.cutGlobe)shared.active=this as CrescentCutGlobeSession;return update.call(this);};
export const current=()=>{if(!shared.active)throw Error('Cut Globe not active.');return shared.active;};
export const canvas=()=>document.querySelector<HTMLCanvasElement>('canvas[aria-label="Atlas Crescent-Cut Globe terrain map"]')!;
export function view():SphericalView {const d=canvas().dataset;return{mode:d.mode as 'globe'|'net',frame:JSON.parse(d.frame!),zoom:Number(d.zoom),pan:JSON.parse(d.pan!),cutGlobe:current().world.geometry,mapRegion:d.mapRegion as SphericalView['mapRegion']};}
export function snapshot(){const s=current(),d=canvas().dataset;return{ready:d.ready==='true',viewPending:d.viewPending==='true',displayPending:d.displayPending==='true',painting:s.painting,processing:s.processing,pending:s.pendingPoints,revision:s.terrain.revision,displayRevision:Number(d.displayRevision),renderer:d.renderer,diagnostics:JSON.parse(d.displayDiagnostics??'{}'),statistics:s.statistics,work:s.workDiagnostics,historyEntries:s.history.length,historyBytes:s.history.retainedBytes,configuration:s.world.geometry,view:view()};}
export async function hash(){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',current().terrain.copyElevations().buffer as ArrayBuffer)),v=>v.toString(16).padStart(2,'0')).join('');}
export function point(direction:Vec3){const c=canvas(),r=c.getBoundingClientRect(),p=projectSphere(current().terrain,direction,view(),{width:r.width,height:r.height})[0];return p?{x:r.left+p.x,y:r.top+p.y}:null;}
export function path(region:'cut'|'retained'|'rim',count=40,extent=.24){const s=current(),g=s.world.geometry,a=g.axis,u=unitDirection(cutGlobeRim(g,0).map((v,i)=>v-g.separationRatio/2*a[i]!) as unknown as Vec3);return Array.from({length:count+1},(_,i)=>{const t=(i/count-.5)*extent,p=region==='rim'?unitDirection(a.map((v,j)=>v*(g.separationRatio/2+t)+u[j]!*Math.sqrt(1-(g.separationRatio/2+t)**2)) as unknown as Vec3):unitDirection(a.map((v,j)=>v*(region==='cut'?1:-1)+u[j]!*t) as unknown as Vec3),screen=point(p);if(!screen)throw Error(`Physical ${region} point hidden at ${i}`);return screen;});}
let recording=false,source:Float32Array,first:Vec3|undefined,settings:SphericalBrushSettings,hemisphere:Vec3|undefined,points:{direction:Vec3;visibility?:SphericalBrushVisibility}[]=[];
const begin=SphericalSession.prototype.begin,move=SphericalSession.prototype.move;
SphericalSession.prototype.begin=function(d,s,h){const accepted=begin.call(this,d,s,h);if(this.cutGlobe&&recording&&accepted){first=structuredClone(d);settings={...s};hemisphere=h&&structuredClone(h);}return accepted;};
SphericalSession.prototype.move=function(d,v){if(this.cutGlobe&&recording&&this.painting&&!this.processing&&!this.locked)points.push({direction:structuredClone(d),visibility:v&&structuredClone(v)});move.call(this,d,v);};
export function record(){source=current().terrain.copyElevations();first=undefined;points=[];recording=true;}
export function compare(){recording=false;if(!first)throw Error('No accepted stroke.');const s=current(),m=s.terrain.metadata,t=createSphericalTerrain({terrainId:m.terrainId,identity:m.identity,radiusMeters:m.geometry.radiusMeters,cellsPerEdge:m.representation.cellsPerEdge});for(let i=0;i<source.length;i++)t.write(t.keyAt(i),source[i]!);const stroke=startSphericalBrushStroke(t,{...m.identity,direction:first},settings,undefined,hemisphere?{hemisphere,cutGlobe:s.world.geometry}:undefined);for(const p of points)stroke.moveTo({...m.identity,direction:p.direction},p.visibility);stroke.end();const actual=new Uint32Array(s.terrain.copyElevations().buffer),expected=new Uint32Array(t.copyElevations().buffer),before=new Uint32Array(source.buffer),changed={retained:0,cut:0};let mismatches=0;for(let i=0;i<actual.length;i++){mismatches+=actual[i]!==expected[i]?1:0;if(actual[i]!==before[i])changed[cutGlobeRegion(s.world.geometry,s.terrain.directionAt(s.terrain.keyAt(i)))]++;}return{mismatches,changed,accepted:points.length+1,statistics:stroke.statistics};}

export const largePath=()=>path('cut',96,.6);
