import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import type {PolyhedronGeometry} from '../surfaces/polyhedron-contract.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';

import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
import{pyramidDot}from'../surfaces/pyramid.ts';
import type {CylinderAppearance} from './cylindrical-elevation.ts';
const MAX_JOIN_PIXELS=131072;
interface Run{readonly x:number;readonly y:number;readonly image:ImageData;readonly faces:Int16Array;readonly coordinates:Float64Array}
export interface BoundaryPixelRect{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number}
/** One geometry-only camera epoch. Only narrow bands at real atlas joins and
 * material boundaries are replaced. Each quarter-pixel samples the actual nearest
 * boundary; colors still come from the accepted indexed field and palette.
 * No readback, invented backing material, terrain copy or expanded silhouette. */
export function createPolyhedronBoundaryCoverage<T extends PolyhedronTerrain>(project:(g:T['geometry'],p:SurfacePosition,v:CylinderView,size:CylinderViewport)=>{x:number;y:number},picker:(g:T['geometry'],v:CylinderView,size:CylinderViewport,width:number,height:number)=>(x:number,y:number)=>{face:number;u:number;v:number}|undefined,options:{readonly creaseRadius?:1|3;readonly mixedOnly?:boolean}={}){
return class BoundaryCoverage{
 runs:readonly Run[]=[];pixels=0;byteLength=0;readonly preparation:Generator<void>;
 private image!:ImageData;private origin!:{x:number;y:number};private overlay!:HTMLCanvasElement;private clip!:Path2D;
 get canvasBytes(){return this.overlay?this.overlay.width*this.overlay.height*4:0;}
 private revision=-1;private appearance:CylinderAppearance|undefined;
 constructor(t:T,v:CylinderView,size:CylinderViewport,width:number,height:number,deferred=false){this.preparation=this.prepare(t,v,size,width,height);if(!deferred)for(const _ of this.preparation){/* synchronous standalone settled proof */}}
 private *prepare(t:T,v:CylinderView,size:CylinderViewport,width:number,height:number):Generator<void>{if(![width,height].every(x=>Number.isInteger(x)&&x>0)||width*height>1500000)throw RangeError('Physical boundary backing exceeds settled policy.');const g=t.geometry as T['geometry']&Required<Pick<PolyhedronGeometry,'physicalFaces'|'physicalEdges'|'physicalFaceId'|'positionsFromWeights'>>,sx=width/size.width,sy=height/size.height,selected=new Uint8Array(width*height);let selectedCount=0;
  yield;const pick=picker(g,v,size,width,height),physical=g.faces.map(f=>g.physicalFaceId(f));yield;let adjacent:ReadonlySet<string>=new Set(),examined=new Set<number>();
  const incidence=(a:number,b:number)=>new Set([a,b].flatMap(vertex=>g.positionsFromWeights(new Map([[vertex,1]])).map(p=>g.physicalFaceId(p.patchId))));
  const offer=(x:number,y:number,radius:number)=>{for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const X=x+dx,Y=y+dy;if(X>=0&&X<width&&Y>=0&&Y<height){const i=Y*width+X;if(!selected[i]&&!examined.has(i)){examined.add(i);let any=false,visible=false,first=-2,mixed=false;for(let ray=0;ray<4;ray++){const hit=pick(X+(ray%2?.75:.25),Y+(ray<2?.25:.75));if(hit){any=true;if(adjacent.has(physical[hit.face]!))visible=true;}if(options.mixedOnly){const face=hit?.face??-1;if(ray===0)first=face;else mixed||=face!==first;}}if(any&&!visible)continue;if(options.mixedOnly&&!mixed&&(pick(X+.5,Y+.5)?.face??-1)===first)continue;selected[i]=1;selectedCount++;}}}if(selectedCount>MAX_JOIN_PIXELS)throw RangeError('Physical boundary coverage exceeds its qualified pixel budget.');};
  // A qualified geometry may retain only actual mixed quarter-ray addresses.
  // A quarter ray is less than one pixel from its center; a one-pixel offer
  // band is conservative. Ordinary single-chart atlas colors remain unchanged.
  // Admit a band pixel only for its actual nearest physical neighborhood
  // (or empty background). Occluded turn edges cannot consume repair capacity.
  // The accepted axial narrow-band mechanism, at actual Spiral atlas joins
  // and material boundaries. Exact nearest-surface quarter rays retain real
  // occlusion and empty gaps. The shared 131,072-pixel repair cap is unchanged.
  const segment=function*(A:{x:number;y:number},B:{x:number;y:number},radius:number):Generator<void>{const x=A.x*sx,y=A.y*sy,dx=(B.x-A.x)*sx,dy=(B.y-A.y)*sy;let lo=0,hi=1;for(const[p,q]of[[-dx,x+4],[dx,width+4-x],[-dy,y+4],[dy,height+4-y]]){if(p===0){if(q!<0)return;continue;}const r=q!/p!;if(p!<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);if(lo>hi)return;}const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*(hi-lo)*2));for(let i=0;i<=steps;i++){const f=lo+(hi-lo)*i/steps;offer(Math.floor(x+f*dx),Math.floor(y+f*dy),radius);if(i%4===3)yield;}};
  if(v.mode==='map')for(const polygon of g.physicalFaces){const charts=g.faces.filter(f=>g.physicalFaceId(f)===polygon.id);for(let i=0;i<polygon.vertices.length;i++){const a=polygon.vertices[i]!,b=polygon.vertices[(i+1)%polygon.vertices.length]!,face=charts.find(f=>[a,b].every(id=>g.vertexIds(f).includes(id)))!;adjacent=incidence(a,b);examined=new Set();yield*segment(project(g,g.fromWeights(face,new Map([[a,1]]))!,v,size),project(g,g.fromWeights(face,new Map([[b,1]]))!,v,size),new Set(g.positionsFromWeights(new Map([[a,.5],[b,.5]])).map(p=>(g.gradientRegionId?.(p.patchId)??g.physicalFaceId(p.patchId)))).size===1?1:(options.creaseRadius??3));yield;}}
  else for(const[a,b]of g.physicalEdges){const aliases=g.positionsFromWeights(new Map([[a,.5],[b,.5]]));if(!aliases.some(p=>pyramidDot(g.normal(p),v.frame.forward)>1e-10))continue;const face=aliases[0]!.patchId;adjacent=incidence(a,b);examined=new Set();yield*segment(project(g,g.fromWeights(face,new Map([[a,1]]))!,v,size),project(g,g.fromWeights(face,new Map([[b,1]]))!,v,size),new Set(g.positionsFromWeights(new Map([[a,.5],[b,.5]])).map(p=>(g.gradientRegionId?.(p.patchId)??g.physicalFaceId(p.patchId)))).size===1?1:(options.creaseRadius??3));yield;}
  const indices:number[]=[];for(let y=0;y<height;y++){for(let x=0;x<width;x++)if(selected[y*width+x])indices.push(y*width+x);if(y%32===31)yield;}const runs:Run[]=[];yield;let offset=0,minX=width,minY=height,maxX=-1,maxY=-1;for(const i of indices){const x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(!indices.length)minX=minY=maxX=maxY=0;this.origin={x:minX,y:minY};this.image=new ImageData(maxX-minX+1,maxY-minY+1);this.overlay=document.createElement('canvas');this.overlay.width=this.image.width;this.overlay.height=this.image.height;this.clip=new Path2D();
  while(offset<indices.length){const first=indices[offset]!,y=Math.floor(first/width),x=first%width;let end=offset+1;while(end<indices.length&&indices[end]===indices[end-1]!+1&&Math.floor(indices[end]!/width)===y)end++;const count=end-offset,base=((y-minY)*this.image.width+x-minX)*4,run:Run={x,y,image:new ImageData(this.image.data.subarray(base,base+count*4),count,1),faces:new Int16Array(count*4).fill(-1),coordinates:new Float64Array(count*8)};this.clip.rect(x,y,count,1);
   for(let i=0;i<count;i++)for(let ray=0;ray<4;ray++){const p=pick(x+i+(ray%2?.75:.25),y+(ray<2?.25:.75));if(p){run.faces[i*4+ray]=p.face;run.coordinates[i*8+ray*2]=p.u;run.coordinates[i*8+ray*2+1]=p.v;}}
   runs.push(run);offset=end;yield;
  }
  this.runs=runs;this.pixels=indices.length;this.byteLength=this.image.data.byteLength+runs.reduce((s,r)=>s+r.faces.byteLength+r.coordinates.byteLength,0);
 }
 *prepareColors(cache:PolyhedronDisplayCache<T>,appearance:CylinderAppearance):Generator<void>{const color=new Float64Array(3),g=cache.terrain.geometry,revision=cache.sourceRevision,rects=this.revision<0||this.appearance!==appearance?undefined:this.revision===revision?[]:cache.dirtySince(this.revision),dirty=rects?new Set(rects.map(r=>g.faces.indexOf(r.face))):undefined;let visited=0;
  for(const run of this.runs)for(let i=0;i<run.image.width;i++){const at=i*4;if(!dirty||dirty.has(run.faces[at]!)||dirty.has(run.faces[at+1]!)||dirty.has(run.faces[at+2]!)||dirty.has(run.faces[at+3]!)){let count=0,R=0,G=0,B=0;for(let ray=0;ray<4;ray++){const face=run.faces[at+ray]!;if(face<0)continue;cache.colorInto(g.faces[face]!,run.coordinates[i*8+ray*2]!,run.coordinates[i*8+ray*2+1]!,appearance==='relief',color);count++;R+=color[0]!;G+=color[1]!;B+=color[2]!;}run.image.data[at]=count?R/count:0;run.image.data[at+1]=count?G/count:0;run.image.data[at+2]=count?B/count:0;run.image.data[at+3]=Math.round(count*255/4);}if(++visited%512===0)yield;}
  if(cache.sourceRevision!==revision)throw Error('Physical boundary colors changed during idle preparation.');this.overlay.getContext('2d')!.putImageData(this.image,0,0);this.revision=revision;this.appearance=appearance;
 }
 present(ctx:CanvasRenderingContext2D,cache:PolyhedronDisplayCache<T>,appearance:CylinderAppearance,area?:BoundaryPixelRect){if(area&&(area.left>=area.right||area.top>=area.bottom))return;if(this.revision!==cache.sourceRevision||this.appearance!==appearance)for(const _ of this.prepareColors(cache,appearance)){/* bounded dirty refresh of an existing camera epoch */}ctx.save();ctx.setTransform(1,0,0,1,0,0);if(area){ctx.beginPath();ctx.rect(area.left,area.top,Math.max(0,area.right-area.left),Math.max(0,area.bottom-area.top));ctx.clip();}ctx.clip(this.clip);ctx.globalCompositeOperation='copy';ctx.drawImage(this.overlay,this.origin.x,this.origin.y);ctx.restore();}
 dispose(){this.preparation.return(undefined);if(this.overlay)this.overlay.width=this.overlay.height=0;}
};
}
