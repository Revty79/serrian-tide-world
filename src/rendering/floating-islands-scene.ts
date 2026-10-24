import {settledSurfaceDimensions} from './raster-quality.ts';
import type {IslandComponent} from '../editor/floating-islands-document.ts';
import {islandPointToWorld,islandPointToLocal,islandVectorToLocal} from '../editor/floating-islands-placement.ts';
import type {FloatingIslandGeometry} from '../surfaces/floating-island.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {pyramidDot,pyramidSub,type PyramidVector} from '../surfaces/pyramid.ts';
import type {CylinderFrame,CylinderView,CylinderViewport,CylinderScreenPoint} from './cylindrical-view.ts';
import {initialFloatingIslandView,FLOATING_ISLAND_PROJECTION} from './floating-island-view.ts';
import {PolyhedronPresentation} from './polyhedron-presentation.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';
import {surfaceDisplayDimensions} from './surface-renderer.ts';
import {samplePolyhedronAtlas,type PerspectiveAtlasBuffer} from './polyhedron-perspective-atlas.ts';
import type {CylinderAppearance} from './cylindrical-elevation.ts';
export interface IslandSceneCamera{readonly frame:CylinderFrame;readonly targetMeters:PyramidVector;readonly viewRadiusMeters:number;readonly zoom:number}
export function fitIslandScene(islands:readonly IslandComponent[],selected?:string):IslandSceneCamera{
 const subset=selected?islands.filter(c=>c.id===selected):islands,points=subset.flatMap(c=>c.terrain.geometry.vertices.map(v=>islandPointToWorld(c.placement,v))),target=[0,1,2].map(k=>(Math.min(...points.map(p=>p[k]!))+Math.max(...points.map(p=>p[k]!)))/2) as unknown as PyramidVector,radius=Math.max(...points.map(p=>Math.hypot(...pyramidSub(p,target))));
 return{frame:initialFloatingIslandView(islands[0]!.terrain.geometry).frame,targetMeters:target,viewRadiusMeters:radius*1.04,zoom:1};
}
function scenePose(islands:readonly IslandComponent[],camera:IslandSceneCamera,size:CylinderViewport){
 let distance=3*camera.viewRadiusMeters;
 // Orbit/dolly stays outside every material body's enclosing sphere, including
 // when focus is on a small neighbor. Zoom changes the lens, not material.
 for(let pass=0;pass<=islands.length;pass++)for(const c of islands){const center=c.placement.positionMeters,r=c.terrain.geometry.circumradiusMeters,delta=pyramidSub(center,camera.targetMeters),along=pyramidDot(delta,camera.frame.forward),perpendicular=Math.max(0,pyramidDot(delta,delta)-along*along);if(perpendicular<r*r){const exit=along+Math.sqrt(r*r-perpendicular)+camera.viewRadiusMeters*.05,entry=along-Math.sqrt(r*r-perpendicular);if(distance>=entry&&distance<=exit)distance=exit;}}
 const eye=camera.targetMeters.map((x,k)=>x+distance*camera.frame.forward[k]!) as unknown as PyramidVector,focal=Math.min(size.width,size.height)*.38*distance/camera.viewRadiusMeters*camera.zoom,far=Math.max(...islands.map(c=>Math.hypot(...pyramidSub(c.placement.positionMeters,eye))+c.terrain.geometry.circumradiusMeters))*1.1;
 return{eye,focal,near:Math.max(.001,distance/1000),far};
}
function localView(c:IslandComponent,camera:IslandSceneCamera,eye:PyramidVector):CylinderView{return{mode:'physical',interior:false,interiorView:'center',eyeMeters:islandPointToLocal(c.placement,eye),frame:{forward:islandVectorToLocal(c.placement,camera.frame.forward),right:islandVectorToLocal(c.placement,camera.frame.right),up:islandVectorToLocal(c.placement,camera.frame.up)},zoom:camera.zoom,target:[0,0,0],pan:{x:0,y:0},phase:0};}
/** Nearest genuine positive ray/plane hit, expressed in the island's immutable
 * local geography. Empty space and other components have no surface aliases. */
export function prepareIslandRayPicker(g:FloatingIslandGeometry,view:CylinderView,size:CylinderViewport,focal:number){
 const eye=view.eyeMeters!,direction=view.frame.forward.map(x=>-x) as unknown as PyramidVector,right=view.frame.right.map(x=>-x) as unknown as PyramidVector,up=view.frame.up;
 const planes=g.faces.flatMap(face=>{const f=g.frame(face),q=pyramidSub(eye,f.origin),distance=-pyramidDot(f.normal,q);if(distance>=0)return[];const uu=pyramidDot(f.u,f.u),uv=pyramidDot(f.u,f.v),vv=pyramidDot(f.v,f.v),det=uu*vv-uv*uv,du=f.u.map((x,k)=>(x*vv-f.v[k]!*uv)/det) as unknown as PyramidVector,dv=f.v.map((x,k)=>(x*uu-f.u[k]!*uv)/det) as unknown as PyramidVector,coeff=(v:PyramidVector)=>[pyramidDot(v,direction),pyramidDot(v,right),pyramidDot(v,up)] as const;return[{face,distance,den:coeff(f.normal),u0:pyramidDot(du,q),u:coeff(du),v0:pyramidDot(dv,q),v:coeff(dv)}];});
 return(p:CylinderScreenPoint)=>{const x=(p.x-size.width/2)/focal,y=(size.height/2-p.y)/focal;let best=Infinity,selected:typeof planes[number]|undefined,bu=0,bv=0;for(const plane of planes){const den=plane.den[0]+plane.den[1]*x+plane.den[2]*y;if(den>=-1e-12)continue;const t=plane.distance/den;if(t<=0||t>=best)continue;const u=plane.u0+t*(plane.u[0]+plane.u[1]*x+plane.u[2]*y),v=plane.v0+t*(plane.v[0]+plane.v[1]*x+plane.v[2]*y);if(u< -1e-10||v< -1e-10||u+v>1+1e-10)continue;selected=plane;best=t;bu=Math.max(0,u);bv=Math.max(0,v);}if(!selected)return;return{position:g.normalize({...g.identity,patchId:selected.face,u:bu,v:bu+bv>1?1-bu:bv}),distanceMeters:best*Math.hypot(1,x,y)};};
}
export const pickIslandLocal=(g:FloatingIslandGeometry,view:CylinderView,size:CylinderViewport,focal:number,p:CylinderScreenPoint)=>prepareIslandRayPicker(g,view,size,focal)(p);

export function pickIslandScene(islands:readonly IslandComponent[],camera:IslandSceneCamera,size:CylinderViewport,p:CylinderScreenPoint){const pose=scenePose(islands,camera,size);let selected:{component:IslandComponent;position:SurfacePosition;distanceMeters:number}|undefined;for(const c of islands){const hit=pickIslandLocal(c.terrain.geometry,localView(c,camera,pose.eye),size,pose.focal,p);if(hit&&(!selected||hit.distanceMeters<selected.distanceMeters))selected={component:c,...hit};}return selected;}
export function projectIslandScene(islands:readonly IslandComponent[],camera:IslandSceneCamera,size:CylinderViewport,c:IslandComponent,p:PyramidVector){const pose=scenePose(islands,camera,size),q=pyramidSub(islandPointToWorld(c.placement,p),pose.eye),depth=-pyramidDot(q,camera.frame.forward);if(depth<=0)return;return{x:size.width/2-pyramidDot(q,camera.frame.right)/depth*pose.focal,y:size.height/2-pyramidDot(q,camera.frame.up)/depth*pose.focal};}
interface Resource{component:IslandComponent;presenter:PolyhedronPresentation<IslandComponent['terrain']>}
/** The accepted field/color/atlas presenter, with real perspective transforms
 * and cross-component depth. Unchanged islands retain their display resources. */
export class FloatingIslandsScene{
 private resources=new Map<string,Resource>();private focal=1;private buffer?:PerspectiveAtlasBuffer;private boundary:Uint32Array=new Uint32Array(0);
 readonly canvas:HTMLCanvasElement;readonly fallback:HTMLCanvasElement;private invalidate:()=>void;
 statistics={frames:0,lastPresentMs:0,boundaryPixels:0,ownedBackingBytes:0};
 constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,invalidate:()=>void){this.canvas=canvas;this.fallback=fallback;this.invalidate=invalidate;}
 sync(islands:readonly IslandComponent[],cache:(id:string)=>PolyhedronDisplayCache<IslandComponent['terrain']>){const keep=new Set(islands.map(c=>c.id));for(const[id,r]of this.resources)if(!keep.has(id)){r.presenter.dispose();this.resources.delete(id);}for(const c of islands){const r=this.resources.get(c.id);if(r){r.component=c;continue;}const projection={...FLOATING_ISLAND_PROJECTION,layout:(_g:FloatingIslandGeometry,_v:CylinderView,size:CylinderViewport)=>({x:size.width/2,y:size.height/2,scale:this.focal})};this.resources.set(c.id,{component:c,presenter:new PolyhedronPresentation(this.canvas,this.fallback,cache(c.id),this.invalidate,projection)});}}
 get backend(){return [...this.resources.values()].every(r=>r.presenter.backend==='webgl2')?'webgl2':'cpu';}
 get graphics(){return [...this.resources.values()].map(r=>({id:r.component.id,...r.presenter.statistics}));}
 present(camera:IslandSceneCamera,size:CylinderViewport,appearance:CylinderAppearance){const started=performance.now(),rows=[...this.resources.values()],islands=rows.map(r=>r.component),pose=scenePose(islands,camera,size);this.focal=pose.focal;const dimensions=surfaceDisplayDimensions(size,devicePixelRatio||1),canvasDimensions=settledSurfaceDimensions(size,devicePixelRatio||1,matchMedia('(pointer: coarse)').matches),width=canvasDimensions.width,height=canvasDimensions.height;
  if(this.fallback.width!==width||this.fallback.height!==height){this.fallback.width=width;this.fallback.height=height;}if(!this.buffer||this.buffer.image.width!==width||this.buffer.image.height!==height){this.buffer={image:this.fallback.getContext('2d')!.createImageData(width,height),depth:new Float64Array(width*height),owner:new Uint8Array(width*height)};this.boundary=new Uint32Array(width*height);}
  const buffer=this.buffer;buffer.image.data.fill(0);buffer.depth.fill(Infinity);buffer.owner.fill(0);const cpu=this.backend==='cpu';if(cpu)for(const r of rows)if(r.presenter.backend!=='cpu')r.presenter.fail('A scene component requires coherent Canvas fallback.');
  // Depth resolves interior occlusion. Far-to-near submission also preserves
  // the accepted premultiplied coverage at a foreground silhouette.
  rows.sort((a,b)=>Math.hypot(...pyramidSub(b.component.placement.positionMeters,pose.eye))-Math.hypot(...pyramidSub(a.component.placement.positionMeters,pose.eye)));
  for(const[i,r]of rows.entries())r.presenter.present(localView(r.component,camera,pose.eye),size,appearance,{first:i===0,nearMeters:pose.near,farMeters:pose.far,buffer,component:i+1,dimensions:cpu?canvasDimensions:dimensions});
  if(cpu){this.coverage(rows,camera,size,pose.eye,buffer);this.fallback.getContext('2d')!.putImageData(buffer.image,0,0);this.canvas.hidden=true;this.fallback.hidden=false;}else{this.fallback.hidden=false;this.fallback.getContext('2d')!.clearRect(0,0,width,height);this.canvas.hidden=false;}
  this.statistics={frames:this.statistics.frames+1,lastPresentMs:performance.now()-started,boundaryPixels:this.statistics.boundaryPixels,ownedBackingBytes:buffer.image.data.byteLength+buffer.depth.byteLength+buffer.owner.byteLength+this.boundary.byteLength};
 }
 private coverage(rows:Resource[],camera:IslandSceneCamera,size:CylinderViewport,eye:PyramidVector,buffer:PerspectiveAtlasBuffer){const {width,height}=buffer.image,o=buffer.owner,pixels=buffer.image.data;let count=0;for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x,a=o[i]!;if(a!==o[i-1]||a!==o[i+1]||a!==o[i-width]||a!==o[i+width])this.boundary[count++]=i;}const local=rows.map(r=>({r,pick:prepareIslandRayPicker(r.component.terrain.geometry,localView(r.component,camera,eye),size,this.focal)})),color=new Float64Array(3);
  for(let k=0;k<count;k++){const i=this.boundary[k]!,x=i%width,y=Math.floor(i/width);let red=0,green=0,blue=0,hits=0;for(const[dx,dy]of[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]]){let nearest:typeof local[number]|undefined,position:SurfacePosition|undefined,distance=Infinity;for(const row of local){const hit=row.pick({x:(x+.5+dx!)*size.width/width,y:(y+.5+dy!)*size.height/height});if(hit&&hit.distanceMeters<distance){distance=hit.distanceMeters;nearest=row;position=hit.position;}}if(nearest&&position){samplePolyhedronAtlas(nearest.r.presenter.colorAtlases,nearest.r.presenter.cache.atlasSize,position,color);red+=color[0]!;green+=color[1]!;blue+=color[2]!;hits++;}}
   const at=i*4;pixels[at]=hits?red/hits:0;pixels[at+1]=hits?green/hits:0;pixels[at+2]=hits?blue/hits:0;pixels[at+3]=hits/4*255;
  }this.statistics.boundaryPixels=count;
 }
 dispose(){for(const r of this.resources.values())r.presenter.dispose();this.resources.clear();this.buffer=undefined;this.boundary=new Uint32Array(0);}
}
