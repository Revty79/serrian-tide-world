import {drawPolyhedronPerspectiveAtlas} from '../../src/rendering/polyhedron-perspective-atlas.ts';
import type {PolyhedronDisplayCache} from '../../src/rendering/polyhedron-field.ts';
import type {PolyhedronTerrain} from '../../src/terrain/polyhedron-contract.ts';
import type {CylinderView} from '../../src/rendering/cylindrical-view.ts';
import type {PolyhedronProjection} from '../../src/rendering/polyhedron-projection.ts';
import type {PolyhedronGeometry} from '../../src/surfaces/polyhedron-contract.ts';
/** Independent binary coast-support reference. It follows the physical atlas
 * coordinates and the browser's real minification filter, including oblique
 * faces. It never modifies numerical terrain or renderer colors. */
export function polygonCoastSupportMask(cache:PolyhedronDisplayCache<PolyhedronTerrain>,view:CylinderView,size:{width:number;height:number},projection:PolyhedronProjection<PolyhedronGeometry>){
 const g=cache.terrain.geometry,canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const dot=(a:readonly number[],b:readonly number[])=>a.reduce((s,x,k)=>s+x*b[k]!,0);
 for(const atlas of cache.polygonAtlases){const face=atlas.anchor.patchId;if(view.mode!=='map'&&dot(g.normal({...g.identity,patchId:face,u:0,v:0}),view.frame.forward)<=1e-10)continue;const anchor=g.frame(face),xy=(p:readonly number[])=>{const d=p.map((x,k)=>x-anchor.origin[k]!);return[dot(d,anchor.e1),dot(d,anchor.e2)] as const;},maps=atlas.charts.map((face:string)=>{const f=g.frame(face),a=xy(f.origin),u=xy(f.origin.map((x:number,k:number)=>x+f.u[k]!)),v=xy(f.origin.map((x:number,k:number)=>x+f.v[k]!)),ux=u[0]-a[0],uy=u[1]-a[1],vx=v[0]-a[0],vy=v[1]-a[1];return{face,x:a[0],y:a[1],ux,uy,vx,vy,det:ux*vy-uy*vx};}),land=new Uint8Array(atlas.width*atlas.height);
  for(let row=0;row<atlas.height;row++)for(let col=0;col<atlas.width;col++){const x=atlas.left+col*atlas.step,y=atlas.top-row*atlas.step;let best=-Infinity,u=0,v=0,face='';for(const m of maps){const dx=x-m.x,dy=y-m.y,a=(dx*m.vy-dy*m.vx)/m.det,b=(m.ux*dy-m.uy*dx)/m.det,score=Math.min(a,b,1-a-b);if(score>best){best=score;u=a;v=b;face=m.face;}}u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1,v));if(u+v>1){const sum=u+v;u/=sum;v=1-u;}land[row*atlas.width+col]=cache.sample(face,u,v).height>=0?1:0;}
  // Include the accepted two-texel atlas support before actual screen filtering.
  const image=new ImageData(atlas.width,atlas.height);for(let row=0;row<atlas.height;row++)for(let col=0;col<atlas.width;col++){let coast=0;for(let dy=-2;dy<=2&&!coast;dy++)for(let dx=-2;dx<=2;dx++){const y=Math.max(0,Math.min(atlas.height-1,row+dy)),x=Math.max(0,Math.min(atlas.width-1,col+dx));if(land[y*atlas.width+x]!==land[row*atlas.width+col]){coast=255;break;}}const at=(row*atlas.width+col)*4;image.data[at]=image.data[at+1]=image.data[at+2]=coast;image.data[at+3]=255;}
  const tile=document.createElement('canvas');tile.width=atlas.width;tile.height=atlas.height;tile.getContext('2d')!.putImageData(image,0,0);const p=projection.project(g,{...g.identity,patchId:face,u:0,v:0},view,size)!,u=projection.project(g,{...g.identity,patchId:face,u:1,v:0},view,size)!,v=projection.project(g,{...g.identity,patchId:face,u:0,v:1},view,size)!,coordinates=atlas.chartPixels().map(p=>[p[0]!,p[1]!] as const),a=coordinates[0]!,b=coordinates[1]!,c=coordinates[2]!,det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),ux=((u.x-p.x)*(c[1]-a[1])-(v.x-p.x)*(b[1]-a[1]))/det,uy=((u.y-p.y)*(c[1]-a[1])-(v.y-p.y)*(b[1]-a[1]))/det,vx=((v.x-p.x)*(b[0]-a[0])-(u.x-p.x)*(c[0]-a[0]))/det,vy=((v.y-p.y)*(b[0]-a[0])-(u.y-p.y)*(c[0]-a[0]))/det;
  ctx.save();ctx.setTransform(ux,uy,vx,vy,p.x-ux*a[0]-vx*a[1],p.y-uy*a[0]-vy*a[1]);ctx.beginPath();atlas.coordinates.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(tile,-.5,-.5);ctx.restore();
 }
 return ctx.getImageData(0,0,canvas.width,canvas.height).data;
}

/** A sign-change reference through the accepted cavity atlas sampler. */
export function perspectiveCoastSupportMask(cache:PolyhedronDisplayCache<PolyhedronTerrain>,view:CylinderView,size:{width:number;height:number},projection:PolyhedronProjection<PolyhedronGeometry>){
 const side=cache.atlasSize,tiles=new Map<string,Uint8ClampedArray>();
 for(const face of cache.terrain.geometry.faces){const land=new Uint8Array(side*side),prefix=new Uint32Array((side+1)*(side+1));
  for(let row=0;row<side;row++)for(let col=0;col<side;col++){const u=col/(side-1),v=1-row/(side-1);if(u+v<=1)land[row*side+col]=cache.sample(face,u,v).height>=0?1:0;}
  for(let row=0;row<side;row++){let sum=0;for(let col=0;col<side;col++){sum+=land[row*side+col]!;prefix[(row+1)*(side+1)+col+1]=sum+prefix[row*(side+1)+col+1]!;}}
  const rgba=new Uint8ClampedArray(side*side*4);for(let row=0;row<side;row++)for(let col=0;col<side;col++){const l=Math.max(0,col-2),r=Math.min(side,col+3),t=Math.max(0,row-2),b=Math.min(side,row+3),count=prefix[b*(side+1)+r]!-prefix[t*(side+1)+r]!-prefix[b*(side+1)+l]!+prefix[t*(side+1)+l]!,coast=count>0&&count<(r-l)*(b-t)?255:0,at=(row*side+col)*4;rgba[at]=rgba[at+1]=rgba[at+2]=coast;rgba[at+3]=255;}tiles.set(face,rgba);
 }
 const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d')!;drawPolyhedronPerspectiveAtlas(ctx,tiles,side,cache.terrain.geometry,view,size,projection);return ctx.getImageData(0,0,canvas.width,canvas.height).data;
}
