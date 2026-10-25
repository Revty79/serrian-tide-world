import type {RibbonTerrain} from '../terrain/ribbon.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';
import {pyramidDot,pyramidSub} from '../surfaces/pyramid.ts';
import {projectRibbon} from './ribbon-view.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
import type {CylinderAppearance} from './cylindrical-elevation.ts';
import type {BoundaryPixelRect} from './polyhedron-boundary-coverage.ts';
interface Projection{a:{x:number;y:number;z:number};ux:number;uy:number;vx:number;vy:number;det:number;zu:number;zv:number;points:{x:number;y:number}[]}
function buildSamplers(cache:PolyhedronDisplayCache<RibbonTerrain>){const g=cache.terrain.geometry,atlases=new Map(cache.polygonAtlases.map(a=>[a.id,a]));return g.faces.map(face=>{const atlas=atlases.get(g.physicalFaceId(face))!,f=g.frame(face),basis=g.frame(atlas.anchor.patchId),d=pyramidSub(f.origin,basis.origin);return{atlas,color:cache.colorSampler(face),x:(pyramidDot(d,basis.e1)-atlas.left)/atlas.stepX,y:(atlas.top-pyramidDot(d,basis.e2))/atlas.stepY,ux:pyramidDot(f.u,basis.e1)/atlas.stepX,uy:-pyramidDot(f.u,basis.e2)/atlas.stepY,vx:pyramidDot(f.v,basis.e1)/atlas.stepX,vy:-pyramidDot(f.v,basis.e2)/atlas.stepY};});}
/** Orthographic inverse geometry and nearest-triangle ownership only. Colors
 * are bilinear samples of the accepted physical polygon color atlases; near a
 * numerical coastline, four accepted field/palette samples match the GPU. */
export class RibbonCanvas {
 private samplers?:ReturnType<typeof buildSamplers>;
 private stamp='';private owners=new Uint16Array(0);private image?:ImageData;private triangles:Projection[]=[];
 private coastRevision=-1;private coastFlags=new Uint8Array(0);
 private revision=-1;private appearance?:CylinderAppearance;
 get byteLength(){return this.owners.byteLength+this.coastFlags.byteLength+(this.image?.data.byteLength??0);}
 invalidate(){this.stamp='';this.revision=-1;}
 present(ctx:CanvasRenderingContext2D,cache:PolyhedronDisplayCache<RibbonTerrain>,view:CylinderView,size:CylinderViewport,appearance:CylinderAppearance){
  const g=cache.terrain.geometry,width=ctx.canvas.width,height=ctx.canvas.height,stamp=JSON.stringify([view,size,width,height]);if(width*height>1500000)throw RangeError('Ribbon Canvas exceeds the accepted settled backing.');
  const changed=this.stamp!==stamp;if(changed){this.stamp=stamp;if(this.owners.length!==width*height){this.owners=new Uint16Array(width*height);this.image=ctx.createImageData(width,height);}else this.owners.fill(0);const depths=new Float64Array(width*height).fill(-Infinity),sx=width/size.width,sy=height/size.height;
   this.triangles=g.faces.map((patchId,index)=>{const points=[[0,0],[1,0],[0,1]].map(([u,v])=>{const p={...g.identity,patchId,u:u!,v:v!},screen=projectRibbon(g,p,view,size);return{x:screen.x*sx,y:screen.y*sy,z:pyramidDot(g.referencePosition(p),view.frame.forward)/g.scaleMeters};}),[a,b,c]=points as [typeof points[number],typeof points[number],typeof points[number]],ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y,det=ux*vy-uy*vx,zu=b.z-a.z,zv=c.z-a.z,t={a,ux,uy,vx,vy,det,zu,zv,points};
    if(Math.abs(det)<1e-12||view.mode==='physical'&&pyramidDot(g.frame(patchId).normal,view.frame.forward)<=1e-12)return t;
    const top=Math.max(0,Math.ceil(Math.min(...points.map(p=>p.y))-.5)),bottom=Math.min(height-1,Math.floor(Math.max(...points.map(p=>p.y))-.5));
    for(let y=top;y<=bottom;y++){let left=Infinity,right=-Infinity;for(let k=0;k<3;k++){const p=points[k]!,q=points[(k+1)%3]!;if((p.y<=y+.5&&q.y>y+.5)||(q.y<=y+.5&&p.y>y+.5)){const x=p.x+(y+.5-p.y)*(q.x-p.x)/(q.y-p.y);left=Math.min(left,x);right=Math.max(right,x);}}
     const first=Math.max(0,Math.ceil(left-.5)),last=Math.min(width-1,Math.floor(right-.5));let u=((first+.5-a.x)*vy-(y+.5-a.y)*vx)/det,v=(ux*(y+.5-a.y)-uy*(first+.5-a.x))/det;
     for(let x=first;x<=last;x++,u+=vy/det,v-=uy/det){const at=y*width+x,z=view.mode==='map'?0:a.z+u*zu+v*zv;if(z>depths[at]!){depths[at]=z;this.owners[at]=index+1;}}
    }return t;
   });this.revision=-1;
  }
  if(this.revision===cache.sourceRevision&&this.appearance===appearance)return{left:0,top:0,right:0,bottom:0};
  const rects=this.revision<0||this.appearance!==appearance?undefined:cache.dirtySince(this.revision);let area:BoundaryPixelRect={left:0,top:0,right:width,bottom:height};
  if(rects){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(const r of rects){const t=this.triangles[g.faces.indexOf(r.face)]!;for(const u of[(r.left-3)/cache.n,(r.right+3)/cache.n])for(const v of[(r.top-3)/cache.n,(r.bottom+3)/cache.n]){const x=t.a.x+u*t.ux+v*t.vx,y=t.a.y+u*t.uy+v*t.vy;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}area={left:Math.max(0,Math.floor(left)-4),top:Math.max(0,Math.floor(top)-4),right:Math.min(width,Math.ceil(right)+4),bottom:Math.min(height,Math.ceil(bottom)+4)};}
  if(area.left>=area.right||area.top>=area.bottom){this.revision=cache.sourceRevision;this.appearance=appearance;return{left:0,top:0,right:0,bottom:0};}
  const samplers=this.samplers??=buildSamplers(cache),pixels=this.image!.data,n=cache.n,side=cache.side,field=cache.data,color=new Float64Array(3);
  // A numerical zero-crossing mask only schedules exact accepted field colors.
  // It never changes heights, palette, gradients or coast classification. One
  // neighboring native cell encloses the half-cell color-atlas filter footprint.
  if(this.coastRevision!==cache.sourceRevision){if(!this.coastFlags.length)this.coastFlags=new Uint8Array(g.faces.length*n*n);const dirty=this.coastRevision<0?undefined:cache.dirtySince(this.coastRevision),faces=dirty?new Set(dirty.map(r=>g.faces.indexOf(r.face))):new Set(g.faces.map((_,i)=>i));for(const face of faces)for(let row=0;row<n;row++)for(let col=0;col<n;col++){let low=Infinity,high=-Infinity;for(let y=Math.max(0,row-1);y<=Math.min(n,row+2);y++)for(let x=Math.max(0,col-1);x<=Math.min(n,col+2);x++){if(x+y>n)continue;const h=field[((face*side+y)*side+x)*4]!;low=Math.min(low,h);high=Math.max(high,h);}this.coastFlags[(face*n+row)*n+col]=low<0&&high>=0?1:0;}this.coastRevision=cache.sourceRevision;}
  const nearCoast=(face:number,u:number,v:number)=>{u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1-u,v));return this.coastFlags[(face*n+Math.min(n-1,Math.floor(v*n)))*n+Math.min(n-1,Math.floor(u*n))]===1;};
  for(let row=area.top;row<area.bottom;row++)for(let column=area.left;column<area.right;column++){const at=row*width+column,id=this.owners[at]!-1,offset=at*4;if(id<0){pixels[offset]=pixels[offset+1]=pixels[offset+2]=pixels[offset+3]=0;continue;}const t=this.triangles[id]!,x=column+.5-t.a.x,y=row+.5-t.a.y,u=(x*t.vy-y*t.vx)/t.det,v=(t.ux*y-t.uy*x)/t.det,s=samplers[id]!,a=s.atlas,tx=Math.max(0,Math.min(a.width-1,s.x+u*s.ux+v*s.vx)),ty=Math.max(0,Math.min(a.height-1,s.y+u*s.uy+v*s.vy)),cx=Math.min(a.width-2,Math.floor(tx)),cy=Math.min(a.height-2,Math.floor(ty)),fx=tx-cx,fy=ty-cy,first=(cy*a.width+cx)*4,next=first+a.width*4;
   const du=(Math.abs(t.vy)+Math.abs(t.vx))/t.det*.25,dv=(Math.abs(t.uy)+Math.abs(t.ux))/t.det*.25;
   if(nearCoast(id,u,v)||nearCoast(id,u-du,v-dv)||nearCoast(id,u+du,v-dv)||nearCoast(id,u-du,v+dv)||nearCoast(id,u+du,v+dv)){let R=0,G=0,B=0;for(let ray=0;ray<4;ray++){const dx=ray%2?.25:-.25,dy=ray<2?-.25:.25,U=Math.max(0,Math.min(1,u+(dx*t.vy-dy*t.vx)/t.det)),V=Math.max(0,Math.min(1-U,v+(t.ux*dy-t.uy*dx)/t.det));s.color(U,V,appearance==='relief',color);R+=color[0]!;G+=color[1]!;B+=color[2]!;}pixels[offset]=R/4;pixels[offset+1]=G/4;pixels[offset+2]=B/4;pixels[offset+3]=255;continue;}
   for(let k=0;k<3;k++)pixels[offset+k]=(a.pixels[first+k]!*(1-fx)+a.pixels[first+4+k]!*fx)*(1-fy)+(a.pixels[next+k]!*(1-fx)+a.pixels[next+4+k]!*fx)*fy;pixels[offset+3]=255;
  }
  ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(this.image!,0,0,area.left,area.top,area.right-area.left,area.bottom-area.top);this.revision=cache.sourceRevision;this.appearance=appearance;return area;
 }
 dispose(){this.owners=new Uint16Array(0);this.coastFlags=new Uint8Array(0);this.coastRevision=-1;this.image=undefined;this.triangles=[];this.samplers=undefined;this.invalidate();}
}
