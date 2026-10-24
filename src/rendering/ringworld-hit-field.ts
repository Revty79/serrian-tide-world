import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import type {IndexedDisplayCache} from './indexed-display-cache.ts';
import {openCylinderViewAdapter,type OpenCylinderView,type OpenCylinderViewHit} from './open-cylinder-view.ts';
import type {CylinderViewport} from './cylindrical-view.ts';
import type {TerrainRasterUpdate} from './coherent-terrain-raster.ts';
import {dot3,type Vec3} from '../surfaces/cube-sphere.ts';
const patches=['outer-wall','inner-wall','rim-start','rim-end']as const;
interface HitField{stamp:string;theta:Float64Array;coordinate:Float64Array;facing:Float64Array;known:Uint8Array}
type Cache=IndexedDisplayCache<OpenCylinderTerrain>;
const fields=new WeakMap<Cache,HitField>();
export function ringworldHitFieldBytes(cache:Cache){const h=fields.get(cache);return h?h.theta.byteLength+h.coordinate.byteLength+h.facing.byteLength+h.known.byteLength:0;}
export function releaseRingworldHitField(cache:Cache){fields.delete(cache);}
/** The accepted Torus camera-hit cache pattern, adapted to annular charts.
 * One bounded camera epoch: 25 bytes per center pixel, at most 37.5 MB desktop
 * / 16.25 MB coarse. Fractional rays ALWAYS use the real geometric adapter.
 * No elevations, interpolated colors or brush data enter this cache. */
export function ringworldRaySampler(cache:Cache,view:OpenCylinderView,size:CylinderViewport,budget:number,update?:TerrainRasterUpdate){
 if(view.mode==='map'||view.interiorView==='center'){fields.delete(cache);return;}
 const g=cache.terrain.geometry,adapter=openCylinderViewAdapter(g,view,size),l=adapter.layout,factor=Math.min(1.5,Math.sqrt(budget/(size.width*size.height))),columns=update?.base.columns??Math.max(1,Math.floor(size.width*factor)),rows=update?.base.rows??Math.max(1,Math.floor(size.height*factor)),length=columns*rows,stamp=JSON.stringify([view,size,columns,rows]);
 if(length>1500000)throw RangeError('Ringworld hit field exceeds the settled display budget.');
 let field=fields.get(cache);if(field?.stamp!==stamp){field={stamp,theta:new Float64Array(length),coordinate:new Float64Array(length),facing:new Float64Array(length),known:new Uint8Array(length)};fields.set(cache,field);}const h=field,{outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=g.metadata,R=adapter.radiusMeters,extent=Math.hypot(view.frame.forward[0],view.frame.forward[1])+adapter.model.outerHalfLength*Math.abs(view.frame.forward[2])+2;
 const decode=(index:number):(OpenCylinderViewHit&{readonly displayFacing?:number})|undefined=>{const code=h.known[index]!;if(code===1)return;const patchId=patches[code-2]!,theta=h.theta[index]!,coordinate=h.coordinate[index]!,wall=patchId.endsWith('wall'),radiusMeters=wall?patchId==='outer-wall'?ro:ri:coordinate,zMeters=wall?coordinate:patchId==='rim-end'?L:0,c=Math.cos(theta),s=Math.sin(theta),sign=(patchId==='outer-wall'?1:-1)*(adapter.fittedInside?-1:1),normal:Vec3=wall?[sign*c,sign*s,0]:[0,0,patchId==='rim-end'?1:-1],radial=adapter.fittedInside?ri/radiusMeters:radiusMeters/ro,point:Vec3=[radial*c,radial*s,(zMeters-L/2)/R];
   return{kind:'terrain',patchId,theta,radiusMeters,zMeters,normal,displayRadial:radial,depth:extent-dot3(point,view.frame.forward),displayFacing:h.facing[index]!};
  };
 return(x:number,y:number):(OpenCylinderViewHit&{readonly displayFacing?:number})|undefined=>{
  const px=(l.x+x*l.scale)*columns/size.width-.5,py=(l.y-y*l.scale)*rows/size.height-.5,col=Math.round(px),row=Math.round(py),center=col>=0&&col<columns&&row>=0&&row<rows&&Math.abs(px-col)<1e-7&&Math.abs(py-row)<1e-7,index=row*columns+col;
  if(center&&h.known[index])return decode(index);
  const hit=adapter.rayAt(x,y);if(center&&hit?.kind!=='rock'){h.known[index]=hit?patches.indexOf(hit.patchId)+2:1;if(hit){h.theta[index]=hit.theta;h.coordinate[index]=hit.patchId.endsWith('wall')?hit.zMeters:hit.radiusMeters;h.facing[index]=dot3(hit.normal,view.frame.forward);}return decode(index);}
  return hit?.kind==='terrain'?{...hit,displayFacing:dot3(hit.normal,view.frame.forward)}:hit;
 };
}
