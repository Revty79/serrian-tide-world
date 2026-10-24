import {TorusDisplayCache,torusElevationSampler} from './torus-field.ts';
import {coherentTerrainRasterSteps,type TerrainRasterUpdate} from './coherent-terrain-raster.ts';
import {torusHit,torusLayout} from './torus-view.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
import {cylinderCenterInspection} from './cylindrical-view.ts';
import {cylinderElevationColor,cylinderRelief,type CylinderAppearance} from './cylindrical-elevation.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {dot3} from '../surfaces/cube-sphere.ts';
interface HitField{stamp:string;columns:number;rows:number;u:Float64Array;v:Float64Array;facing:Float64Array;known:Uint8Array}
const hits=new WeakMap<TorusDisplayCache,HitField>();
export function torusHitFieldBytes(cache:TorusDisplayCache){const h=hits.get(cache);return h?h.u.byteLength+h.v.byteLength+h.facing.byteLength+h.known.byteLength:0;}
/** The shared cylinder coherent raster, geometry-only torus intersections and
 * its same tensor Hermite/palette/relief pass. Camera hit fields are derived
 * and reused for ordinary dirty updates; they never contain terrain authority. */
export function* torusRasterSteps(cache:TorusDisplayCache,view:CylinderView,size:CylinderViewport,budget:number,reusable:Uint8ClampedArray|undefined,appearance:CylinderAppearance,update?:TerrainRasterUpdate){
 const g=cache.terrain.geometry,l=torusLayout(g,view,size),factor=Math.min(1.5,Math.sqrt(budget/(size.width*size.height))),columns=update?.base.columns??Math.max(1,Math.floor(size.width*factor)),rows=update?.base.rows??Math.max(1,Math.floor(size.height*factor)),length=columns*rows,pixels=reusable?.length===length*4?reusable:new Uint8ClampedArray(length*4),revision=cache.sourceRevision,values=cache.values.slice(),field=torusElevationSampler(values,cache.terrain,appearance==='relief'),stamp=JSON.stringify([view,size,columns,rows]);if(update)pixels.set(update.base.pixels);
 let hitField=hits.get(cache);if(view.mode==='map'){hits.delete(cache);hitField=undefined;}else if(hitField?.stamp!==stamp){hitField={stamp,columns,rows,u:new Float64Array(length),v:new Float64Array(length),facing:new Float64Array(length),known:new Uint8Array(length)};hits.set(cache,hitField);}const h=hitField,labels=view.mode==='physical'&&!update?new Uint8Array(length):undefined;
 const position=(x:number,y:number)=>{const sx=l.x+x*l.scale,sy=l.y-y*l.scale,column=Math.floor(sx*columns/size.width),row=Math.floor(sy*rows/size.height),center=!!h&&column>=0&&column<columns&&row>=0&&row<rows&&Math.abs(sx*columns/size.width-column-.5)<1e-7&&Math.abs(sy*rows/size.height-row-.5)<1e-7,index=row*columns+column;if(center&&h!.known[index])return Number.isNaN(h!.u[index]!)?undefined:{p:{...g.identity,patchId:'tube',u:h!.u[index]!,v:h!.v[index]!},facing:h!.facing[index]!};const p=torusHit(g,view,size,{x:sx,y:sy}),facing=p?view.mode==='map'||cylinderCenterInspection(view)?1:.74+.26*Math.max(0,dot3(g.normal(p),view.frame.forward)):0;if(center){h!.known[index]=1;h!.u[index]=p?.u??NaN;h!.v[index]=p?.v??NaN;h!.facing[index]=facing;}return p?{p,facing}:undefined;};
 const sampleAt=(x:number,y:number)=>{const hit=position(x,y);if(!hit)return;const f=field(hit.p),shade=hit.facing*(appearance==='relief'&&f.height>0?cylinderRelief(f.dx,f.dy):1);return{c:cylinderElevationColor(f.height,0),shade,label:2+(f.height>0?1:0),field:f,facing:hit.facing,hit:hit.p as SurfacePosition};};
 return yield* coherentTerrainRasterSteps({pixels,columns,rows,revision,snapshotBytes:values.byteLength+(labels?.byteLength??0),size,grid:l,labels,region:update?.region,quantum:2048,sampleAt,nearBoundary:(center,x,y)=>{if(view.mode==='map')return false;if(center?.hit&&dot3(g.normal(center.hit),view.frame.forward)<.15)return true;if(update){const col=Math.floor((l.x+x*l.scale)*columns/size.width),row=Math.floor((l.y-y*l.scale)*rows/size.height),alpha=update.base.pixels[(row*columns+col)*4+3]??0;return alpha>0&&alpha<255;}return false;}});
}
