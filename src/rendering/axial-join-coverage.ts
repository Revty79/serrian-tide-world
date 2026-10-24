import type {AxialTerrain} from '../terrain/axial-contract.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';
import {axialPixelPicker,projectAxial} from './axial-view.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
import type {CylinderAppearance} from './cylindrical-elevation.ts';
const MAX_JOIN_PIXELS=131072;
interface Run{readonly x:number;readonly y:number;readonly image:ImageData;readonly faces:Int16Array;readonly coordinates:Float64Array}
export interface AxialPixelRect{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number}
/** One geometry-only camera epoch. Only a narrow pixel band around the two
 * real neck joins is replaced. Each quarter-pixel samples the actual nearest
 * boundary; colors still come from the accepted indexed field and palette.
 * No readback, invented backing material, terrain copy or expanded silhouette. */
export class AxialJoinCoverage{
 readonly runs:readonly Run[];readonly pixels:number;readonly byteLength:number;
 private readonly image:ImageData;private readonly origin:{x:number;y:number};private readonly overlay:HTMLCanvasElement;private readonly clip:Path2D;
 get canvasBytes(){return this.overlay.width*this.overlay.height*4;}
 private revision=-1;private appearance:CylinderAppearance|undefined;
 constructor(t:AxialTerrain,v:CylinderView,size:CylinderViewport,width:number,height:number){const g=t.geometry,sx=width/size.width,sy=height/size.height,selected=new Set<number>();
  const offer=(x:number,y:number)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=x+dx,Y=y+dy;if(X>=0&&X<width&&Y>=0&&Y<height)selected.add(Y*width+X);}if(selected.size>MAX_JOIN_PIXELS)throw RangeError('Axial join coverage exceeds its qualified pixel budget.');};
  // Clip before raster admission: zoomed offscreen geometry cannot create
  // unbounded line stepping or allocate pixels outside the settled output.
  const segment=(A:{x:number;y:number},B:{x:number;y:number})=>{const x=A.x*sx,y=A.y*sy,dx=(B.x-A.x)*sx,dy=(B.y-A.y)*sy;let lo=0,hi=1;for(const [p,q]of [[-dx,x+3],[dx,width+3-x],[-dy,y+3],[dy,height+3-y]]){if(p===0){if(q!<0)return;continue;}const r=q!/p!;if(p!<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);if(lo>hi)return;}const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*(hi-lo)*2));for(let i=0;i<=steps;i++){const f=lo+(hi-lo)*i/steps;offer(Math.floor(x+f*dx),Math.floor(y+f*dy));}};
  for(const ring of [4,5])for(let j=0;j<16;j++){const ids=[1+ring*16+j,1+ring*16+(j+1)%16],q=ids.map(i=>{const face=g.faces.find(f=>g.vertexIds(f).includes(i))!;return g.fromWeights(face,new Map([[i,1]]))!;});segment(projectAxial(g,q[0]!,v,size),projectAxial(g,q[1]!,v,size));}
  // Convex polygon unions can also have a subpixel star at a real vertex.
  // Admit only its five-by-five neighborhood; exact nearest-boundary quarter
  // rays replace coverage without expanding material or changing its field.
  for(let vertex=0;vertex<g.vertices.length;vertex++){const face=g.faces.find(f=>g.vertexIds(f).includes(vertex))!,q=g.fromWeights(face,new Map([[vertex,1]]))!,p=projectAxial(g,q,v,size);offer(Math.floor(p.x*sx),Math.floor(p.y*sy));}
  const indices=[...selected].sort((a,b)=>a-b),runs:Run[]=[],pick=axialPixelPicker(g,v,size,width,height);let offset=0,minX=width,minY=height,maxX=-1,maxY=-1;for(const i of indices){const x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(!indices.length)minX=minY=maxX=maxY=0;this.origin={x:minX,y:minY};this.image=new ImageData(maxX-minX+1,maxY-minY+1);this.overlay=document.createElement('canvas');this.overlay.width=this.image.width;this.overlay.height=this.image.height;this.clip=new Path2D();
  while(offset<indices.length){const first=indices[offset]!,y=Math.floor(first/width),x=first%width;let end=offset+1;while(end<indices.length&&indices[end]===indices[end-1]!+1&&Math.floor(indices[end]!/width)===y)end++;const count=end-offset,base=((y-minY)*this.image.width+x-minX)*4,run:Run={x,y,image:new ImageData(this.image.data.subarray(base,base+count*4),count,1),faces:new Int16Array(count*4).fill(-1),coordinates:new Float64Array(count*8)};this.clip.rect(x,y,count,1);
   for(let i=0;i<count;i++)for(let ray=0;ray<4;ray++){const p=pick(x+i+(ray%2?.75:.25),y+(ray<2?.25:.75));if(p){run.faces[i*4+ray]=p.face;run.coordinates[i*8+ray*2]=p.u;run.coordinates[i*8+ray*2+1]=p.v;}}
   runs.push(run);offset=end;
  }
  this.runs=runs;this.pixels=indices.length;this.byteLength=this.image.data.byteLength+runs.reduce((s,r)=>s+r.faces.byteLength+r.coordinates.byteLength,0);
 }
 present(ctx:CanvasRenderingContext2D,cache:PolyhedronDisplayCache<AxialTerrain>,appearance:CylinderAppearance,area?:AxialPixelRect){const color=new Float64Array(3),g=cache.terrain.geometry,same=this.revision===cache.sourceRevision&&this.appearance===appearance,rects=this.revision<0||this.appearance!==appearance?undefined:same?[]:cache.dirtySince(this.revision),dirty=rects?new Set(rects.map(r=>g.faces.indexOf(r.face))):undefined;for(const run of this.runs){if(area&&(run.y<area.top||run.y>=area.bottom||run.x>=area.right||run.x+run.image.width<=area.left))continue;const left=area?Math.max(0,area.left-run.x):0,right=area?Math.min(run.image.width,area.right-run.x):run.image.width;for(let i=left;i<right;i++){const at=i*4;if(dirty&&!dirty.has(run.faces[at]!)&&!dirty.has(run.faces[at+1]!)&&!dirty.has(run.faces[at+2]!)&&!dirty.has(run.faces[at+3]!))continue;let count=0,R=0,G=0,B=0;for(let ray=0;ray<4;ray++){const face=run.faces[at+ray]!;if(face<0)continue;cache.colorInto(g.faces[face]!,run.coordinates[i*8+ray*2]!,run.coordinates[i*8+ray*2+1]!,appearance==='relief',color);count++;R+=color[0]!;G+=color[1]!;B+=color[2]!;}run.image.data[at]=count?R/count:0;run.image.data[at+1]=count?G/count:0;run.image.data[at+2]=count?B/count:0;run.image.data[at+3]=Math.round(count*255/4);}}
  const left=area?Math.max(0,area.left-this.origin.x):0,top=area?Math.max(0,area.top-this.origin.y):0,right=area?Math.min(this.image.width,area.right-this.origin.x):this.image.width,bottom=area?Math.min(this.image.height,area.bottom-this.origin.y):this.image.height;if(left<right&&top<bottom){if(!same)this.overlay.getContext('2d')!.putImageData(this.image,0,0,left,top,right-left,bottom-top);ctx.save();ctx.setTransform(1,0,0,1,0,0);if(area){ctx.beginPath();ctx.rect(area.left,area.top,area.right-area.left,area.bottom-area.top);ctx.clip();}ctx.clip(this.clip);ctx.globalCompositeOperation='copy';ctx.drawImage(this.overlay,this.origin.x,this.origin.y);ctx.restore();}this.revision=cache.sourceRevision;this.appearance=appearance;
 }
 dispose(){this.overlay.width=this.overlay.height=0;}
}
