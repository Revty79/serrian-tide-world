import type {SpiralTerrain} from '../terrain/spiral.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';
import {spiralPixelPicker,projectSpiral} from './spiral-view.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
import{pyramidDot}from'../surfaces/pyramid.ts';
import type {CylinderAppearance} from './cylindrical-elevation.ts';
const MAX_JOIN_PIXELS=131072;
interface Run{readonly x:number;readonly y:number;readonly image:ImageData;readonly faces:Int16Array;readonly coordinates:Float64Array}
export interface SpiralPixelRect{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number}
/** One geometry-only camera epoch. Only narrow bands at real atlas joins and
 * material boundaries are replaced. Each quarter-pixel samples the actual nearest
 * boundary; colors still come from the accepted indexed field and palette.
 * No readback, invented backing material, terrain copy or expanded silhouette. */
export class SpiralBoundaryCoverage{
 runs:readonly Run[]=[];pixels=0;byteLength=0;readonly preparation:Generator<void>;
 private image!:ImageData;private origin!:{x:number;y:number};private overlay!:HTMLCanvasElement;private clip!:Path2D;
 get canvasBytes(){return this.overlay?this.overlay.width*this.overlay.height*4:0;}
 private revision=-1;private appearance:CylinderAppearance|undefined;
 constructor(t:SpiralTerrain,v:CylinderView,size:CylinderViewport,width:number,height:number,deferred=false){this.preparation=this.prepare(t,v,size,width,height);if(!deferred)for(const _ of this.preparation){/* synchronous standalone settled proof */}}
 private *prepare(t:SpiralTerrain,v:CylinderView,size:CylinderViewport,width:number,height:number):Generator<void>{if(![width,height].every(x=>Number.isInteger(x)&&x>0)||width*height>1500000)throw RangeError('Spiral boundary backing exceeds settled policy.');const g=t.geometry,sx=width/size.width,sy=height/size.height,selected=new Uint8Array(width*height);let selectedCount=0;
  const offer=(x:number,y:number,radius:number)=>{for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const X=x+dx,Y=y+dy;if(X>=0&&X<width&&Y>=0&&Y<height){const i=Y*width+X;if(!selected[i]){selected[i]=1;selectedCount++;}}}if(selectedCount>MAX_JOIN_PIXELS)throw RangeError('Spiral boundary coverage exceeds its qualified pixel budget.');};
  // The accepted axial narrow-band mechanism, at actual Spiral atlas joins
  // and material boundaries. Exact nearest-surface quarter rays retain real
  // occlusion and empty gaps. The shared 131,072-pixel repair cap is unchanged.
  const segment=(A:{x:number;y:number},B:{x:number;y:number},radius:number)=>{const x=A.x*sx,y=A.y*sy,dx=(B.x-A.x)*sx,dy=(B.y-A.y)*sy;let lo=0,hi=1;for(const[p,q]of[[-dx,x+4],[dx,width+4-x],[-dy,y+4],[dy,height+4-y]]){if(p===0){if(q!<0)return;continue;}const r=q!/p!;if(p!<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);if(lo>hi)return;}const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*(hi-lo)*2));for(let i=0;i<=steps;i++){const f=lo+(hi-lo)*i/steps;offer(Math.floor(x+f*dx),Math.floor(y+f*dy),radius);}};
  if(v.mode==='map')for(const polygon of g.physicalFaces){const charts=g.faces.filter(f=>g.physicalFaceId(f)===polygon.id);for(let i=0;i<polygon.vertices.length;i++){const a=polygon.vertices[i]!,b=polygon.vertices[(i+1)%polygon.vertices.length]!,face=charts.find(f=>[a,b].every(id=>g.vertexIds(f).includes(id)))!;segment(projectSpiral(g,g.fromWeights(face,new Map([[a,1]]))!,v,size),projectSpiral(g,g.fromWeights(face,new Map([[b,1]]))!,v,size),new Set(g.positionsFromWeights(new Map([[a,.5],[b,.5]])).map(p=>g.gradientRegionId(p.patchId))).size===1?1:3);yield;}}
  else for(const[a,b]of g.physicalEdges){const aliases=g.positionsFromWeights(new Map([[a,.5],[b,.5]]));if(!aliases.some(p=>pyramidDot(g.normal(p),v.frame.forward)>1e-10))continue;const face=aliases[0]!.patchId;segment(projectSpiral(g,g.fromWeights(face,new Map([[a,1]]))!,v,size),projectSpiral(g,g.fromWeights(face,new Map([[b,1]]))!,v,size),new Set(g.positionsFromWeights(new Map([[a,.5],[b,.5]])).map(p=>g.gradientRegionId(p.patchId))).size===1?1:3);yield;}
  const indices:number[]=[];for(let y=0;y<height;y++){for(let x=0;x<width;x++)if(selected[y*width+x])indices.push(y*width+x);if(y%32===31)yield;}const runs:Run[]=[];yield;const pick=spiralPixelPicker(g,v,size,width,height);yield;let offset=0,minX=width,minY=height,maxX=-1,maxY=-1;for(const i of indices){const x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(!indices.length)minX=minY=maxX=maxY=0;this.origin={x:minX,y:minY};this.image=new ImageData(maxX-minX+1,maxY-minY+1);this.overlay=document.createElement('canvas');this.overlay.width=this.image.width;this.overlay.height=this.image.height;this.clip=new Path2D();
  while(offset<indices.length){const first=indices[offset]!,y=Math.floor(first/width),x=first%width;let end=offset+1;while(end<indices.length&&indices[end]===indices[end-1]!+1&&Math.floor(indices[end]!/width)===y)end++;const count=end-offset,base=((y-minY)*this.image.width+x-minX)*4,run:Run={x,y,image:new ImageData(this.image.data.subarray(base,base+count*4),count,1),faces:new Int16Array(count*4).fill(-1),coordinates:new Float64Array(count*8)};this.clip.rect(x,y,count,1);
   for(let i=0;i<count;i++)for(let ray=0;ray<4;ray++){const p=pick(x+i+(ray%2?.75:.25),y+(ray<2?.25:.75));if(p){run.faces[i*4+ray]=p.face;run.coordinates[i*8+ray*2]=p.u;run.coordinates[i*8+ray*2+1]=p.v;}}
   runs.push(run);offset=end;yield;
  }
  this.runs=runs;this.pixels=indices.length;this.byteLength=this.image.data.byteLength+runs.reduce((s,r)=>s+r.faces.byteLength+r.coordinates.byteLength,0);
 }
 *prepareColors(cache:PolyhedronDisplayCache<SpiralTerrain>,appearance:CylinderAppearance):Generator<void>{const color=new Float64Array(3),g=cache.terrain.geometry,revision=cache.sourceRevision,rects=this.revision<0||this.appearance!==appearance?undefined:this.revision===revision?[]:cache.dirtySince(this.revision),dirty=rects?new Set(rects.map(r=>g.faces.indexOf(r.face))):undefined;let visited=0;
  for(const run of this.runs)for(let i=0;i<run.image.width;i++){const at=i*4;if(!dirty||dirty.has(run.faces[at]!)||dirty.has(run.faces[at+1]!)||dirty.has(run.faces[at+2]!)||dirty.has(run.faces[at+3]!)){let count=0,R=0,G=0,B=0;for(let ray=0;ray<4;ray++){const face=run.faces[at+ray]!;if(face<0)continue;cache.colorInto(g.faces[face]!,run.coordinates[i*8+ray*2]!,run.coordinates[i*8+ray*2+1]!,appearance==='relief',color);count++;R+=color[0]!;G+=color[1]!;B+=color[2]!;}run.image.data[at]=count?R/count:0;run.image.data[at+1]=count?G/count:0;run.image.data[at+2]=count?B/count:0;run.image.data[at+3]=Math.round(count*255/4);}if(++visited%512===0)yield;}
  if(cache.sourceRevision!==revision)throw Error('Spiral boundary colors changed during idle preparation.');this.overlay.getContext('2d')!.putImageData(this.image,0,0);this.revision=revision;this.appearance=appearance;
 }
 present(ctx:CanvasRenderingContext2D,cache:PolyhedronDisplayCache<SpiralTerrain>,appearance:CylinderAppearance){if(this.revision!==cache.sourceRevision||this.appearance!==appearance)for(const _ of this.prepareColors(cache,appearance)){/* bounded dirty refresh of an existing camera epoch */}ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clip(this.clip);ctx.globalCompositeOperation='copy';ctx.drawImage(this.overlay,this.origin.x,this.origin.y);ctx.restore();}
 dispose(){this.preparation.return(undefined);if(this.overlay)this.overlay.width=this.overlay.height=0;}
}
