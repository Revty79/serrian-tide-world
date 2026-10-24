import {pyramidDot,pyramidSub,type PyramidVector} from '../surfaces/pyramid.ts';
import type {PolyhedronGeometry} from '../surfaces/polyhedron-contract.ts';
import type {PolyhedronProjection} from './polyhedron-projection.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
interface Vertex{u:number;v:number;x:number;y:number;w:number}
interface Linear{a:number;x:number;y:number}
const dot=pyramidDot;
/** Geometry-only inverse homographies of the accepted colored face atlases.
 * A convex cavity has one visible face per ray. Clip its five actual planes in
 * homogeneous coordinates, then scan-convert their projected convex polygons.
 * No numerical elevation/color engine or reduced interaction raster is added. */
export function polyhedronAtlasProjection<G extends PolyhedronGeometry>(g:G,view:CylinderView,size:CylinderViewport,width:number,height:number,projection:PolyhedronProjection<G>,exterior=false){
 const l=projection.layout(g,view,size),eye=view.eyeMeters??g.inspectionEyeMeters,s=g.scaleMeters;
 const origin=view.frame.forward.map((f,k)=>-f+view.frame.right[k]!*l.x/l.scale+view.frame.up[k]!*l.y/l.scale) as unknown as PyramidVector,dx=view.frame.right.map(f=>-f*size.width/(width*l.scale)) as unknown as PyramidVector,dy=view.frame.up.map(f=>-f*size.height/(height*l.scale)) as unknown as PyramidVector;
 const clip=[(p:Vertex)=>p.w-1e-8,(p:Vertex)=>p.x+l.x/l.scale*p.w,(p:Vertex)=>(size.width-l.x)/l.scale*p.w-p.x,(p:Vertex)=>p.y+(size.height-l.y)/l.scale*p.w,(p:Vertex)=>l.y/l.scale*p.w-p.y];
 return g.faces.flatMap(face=>{const f=g.frame(face),u=f.u.map(x=>x/s) as unknown as PyramidVector,v=f.v.map(x=>x/s) as unknown as PyramidVector,q=pyramidSub(eye,f.origin).map(x=>x/s) as unknown as PyramidVector,uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),det=uu*vv-uv*uv,dualU=u.map((x,k)=>(x*vv-v[k]!*uv)/det) as unknown as PyramidVector,dualV=v.map((x,k)=>(x*uu-u[k]!*uv)/det) as unknown as PyramidVector,d=-dot(f.normal,q);
  if(exterior){if(d>=0)return [];}else if(!(d>0))throw RangeError('A perspective atlas eye must lie strictly inside the actual cavity.');
  const denominator:Linear={a:dot(f.normal,origin),x:dot(f.normal,dx),y:dot(f.normal,dy)},numerator=(dual:PyramidVector):Linear=>{const c=dot(q,dual);return{a:c*denominator.a+d*dot(origin,dual),x:c*denominator.x+d*dot(dx,dual),y:c*denominator.y+d*dot(dy,dual)};},nu=numerator(dualU),nv=numerator(dualV);
  let polygon=(!g.isTriangle(face)?[[0,0],[1,0],[1,1],[0,1]]:[[0,0],[1,0],[0,1]]).map(([u,v])=>{const p=pyramidSub(g.referencePosition({...g.identity,patchId:face,u:u!,v:v!}),eye).map(x=>x/s) as unknown as PyramidVector;return{u:u!,v:v!,x:-dot(p,view.frame.right),y:dot(p,view.frame.up),w:-dot(p,view.frame.forward)};});
  for(const plane of clip){const next:Vertex[]=[];for(let i=0;i<polygon.length;i++){const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=plane(a),db=plane(b);if(da>=0)next.push(a);if((da<0)!==(db<0)){const t=da/(da-db);next.push({u:a.u+t*(b.u-a.u),v:a.v+t*(b.v-a.v),x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),w:a.w+t*(b.w-a.w)});}}polygon=next;}
  return[{face,distanceNumerator:d,polygon:polygon.map(p=>({x:(l.x+p.x/p.w*l.scale)*width/size.width,y:(l.y-p.y/p.w*l.scale)*height/size.height})),denominator,u:nu,v:nv}];
 });
}
export interface PerspectiveAtlasBuffer{readonly image:ImageData;readonly depth:Float64Array;readonly owner:Uint8Array}
export interface PerspectiveAtlasOptions{readonly exterior?:boolean;readonly buffer?:PerspectiveAtlasBuffer;readonly component?:number;readonly publish?:boolean;readonly distanceScale?:number}
const images=new WeakMap<CanvasRenderingContext2D,ImageData>();
/** Bilinear RGBA atlas reconstruction, identical source texels and endpoint
 * convention to ordinary affine Canvas presentation. Its only new mathematics
 * is the exact inverse perspective coordinate. Buffers are bounded by the
 * shared backing policy and reused. The hot loop allocates no per-pixel objects. */
export function drawPolyhedronPerspectiveAtlas<G extends PolyhedronGeometry>(ctx:CanvasRenderingContext2D,atlases:ReadonlyMap<string,Uint8ClampedArray>,atlasSize:number,g:G,view:CylinderView,size:CylinderViewport,projection:PolyhedronProjection<G>,options:PerspectiveAtlasOptions={}){
 const width=ctx.canvas.width,height=ctx.canvas.height,planes=polyhedronAtlasProjection(g,view,size,width,height,projection,options.exterior),n=atlasSize-1;let image=options.buffer?.image??images.get(ctx);if(!image||image.width!==width||image.height!==height){image=ctx.createImageData(width,height);images.set(ctx,image);}const pixels=image.data;if(!options.buffer)pixels.fill(0);let covered=0;
 for(const plane of planes){const {polygon,denominator:d,u,v,face}=plane;if(polygon.length<3)continue;const atlas=atlases.get(face)!,triangle=g.isTriangle(face),top=Math.max(0,Math.ceil(Math.min(...polygon.map(p=>p.y))-.5)),bottom=Math.min(height-1,Math.ceil(Math.max(...polygon.map(p=>p.y))-.5)-1);
  for(let row=top;row<=bottom;row++){const y=row+.5;let left=Infinity,right=-Infinity;for(let k=0;k<polygon.length;k++){const a=polygon[k]!,b=polygon[(k+1)%polygon.length]!;if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y)){const x=a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y);left=Math.min(left,x);right=Math.max(right,x);}}const first=Math.max(0,Math.ceil(left-.5)),last=Math.min(width-1,Math.ceil(right-.5)-1);let den=d.a+d.x*(first+.5)+d.y*y,un=u.a+u.x*(first+.5)+u.y*y,vn=v.a+v.x*(first+.5)+v.y*y;
   for(let col=first;col<=last;col++,den+=d.x,un+=u.x,vn+=v.x){const index=row*width+col;if(options.buffer){const distance=plane.distanceNumerator/den*g.scaleMeters*(options.distanceScale??1);if(!(distance>0)||distance>=options.buffer.depth[index]!)continue;options.buffer.depth[index]=distance;options.buffer.owner[index]=options.component??1;}const inv=1/den,tx=Math.max(0,Math.min(n,un*inv*n)),ty=Math.max(0,Math.min(n,(1-vn*inv)*n)),c=Math.min(n-1,Math.floor(tx)),r=Math.min(n-1,Math.floor(ty)),a=tx-c,b=ty-r,c1=c+1,r1=r+1,i0=(r*atlasSize+(triangle?Math.min(c,r):c))*4,i1=(r*atlasSize+(triangle?Math.min(c1,r):c1))*4,i2=(r1*atlasSize+(triangle?Math.min(c,r1):c))*4,i3=(r1*atlasSize+(triangle?Math.min(c1,r1):c1))*4,to=(row*width+col)*4;if(!pixels[to+3])covered++;for(let k=0;k<3;k++)pixels[to+k]=(atlas[i0+k]!*(1-a)+atlas[i1+k]!*a)*(1-b)+(atlas[i2+k]!*(1-a)+atlas[i3+k]!*a)*b;pixels[to+3]=255;}
  }
 }
 // Shared crease ownership can put an exact pixel center on two half-open
 // polygon edges. Resolve only any such uncovered centers with the same real
 // ray picker; ordinary scan conversion covers the complete closed cavity.
 if(!options.exterior&&covered!==width*height)for(let i=0;i<width*height;i++)if(!pixels[i*4+3]){const p=projection.unproject(g,view,size,{x:(i%width+.5)*size.width/width,y:(Math.floor(i/width)+.5)*size.height/height});if(!p)throw Error('A closed pyramid cavity must cover every view ray.');const atlas=atlases.get(p.patchId)!,c=Math.round(p.u*n),r=Math.round((1-p.v)*n),at=(r*atlasSize+(!g.isTriangle(p.patchId)?c:Math.min(c,r)))*4;pixels[i*4]=atlas[at]!;pixels[i*4+1]=atlas[at+1]!;pixels[i*4+2]=atlas[at+2]!;pixels[i*4+3]=255;}
 ctx.setTransform(1,0,0,1,0,0);if(options.publish!==false)ctx.putImageData(image,0,0);return planes.length;
}

/** The same accepted bilinear colored-atlas reconstruction, exposed for the
 * bounded exterior silhouette/occlusion subpixel coverage pass. */
export function samplePolyhedronAtlas(atlases:ReadonlyMap<string,Uint8ClampedArray>,atlasSize:number,p:{patchId:string;u:number;v:number},out:Float64Array){const atlas=atlases.get(p.patchId)!,n=atlasSize-1,tx=Math.max(0,Math.min(n,p.u*n)),ty=Math.max(0,Math.min(n,(1-p.v)*n)),c=Math.min(n-1,Math.floor(tx)),r=Math.min(n-1,Math.floor(ty)),a=tx-c,b=ty-r,i0=(r*atlasSize+Math.min(c,r))*4,i1=(r*atlasSize+Math.min(c+1,r))*4,i2=((r+1)*atlasSize+Math.min(c,r+1))*4,i3=((r+1)*atlasSize+Math.min(c+1,r+1))*4;for(let k=0;k<3;k++)out[k]=(atlas[i0+k]!*(1-a)+atlas[i1+k]!*a)*(1-b)+(atlas[i2+k]!*(1-a)+atlas[i3+k]!*a)*b;}
