import {pyramidDot,pyramidSub} from '../surfaces/pyramid.ts';
import type {PolyhedronVector} from '../surfaces/polyhedron-contract.ts';
import type {PyramidDisplayCache,PyramidFieldRect} from './pyramid-field.ts';
import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import {polyhedronAtlasSpacingMeters} from './polyhedron-display-policy.ts';
/** One affine color atlas per physical planar polygon. Numerical triangle
 * charts share this image, so Canvas never antialiases an internal diagonal.
 * Colors, interpolation and dirty journals are the accepted field cache's. */
export class PolygonColorAtlas {
 readonly id:string;readonly charts:string[];readonly width:number;readonly height:number;readonly pixels:Uint8ClampedArray<ArrayBuffer>;
 readonly coordinates:readonly(readonly[number,number])[];readonly anchor:{patchId:string;u:number;v:number};
 private readonly maps:{face:string;x:number;y:number;ux:number;uy:number;vx:number;vy:number;det:number}[];
 readonly left:number;readonly top:number;readonly step:number;readonly stepX:number;readonly stepY:number;
 readonly gutterBounds:Float64Array;private readonly tileColumns:number;private readonly tileRows:number;
 readonly cache:PyramidDisplayCache<PolyhedronTerrain>;
 constructor(cache:PyramidDisplayCache<PolyhedronTerrain>,polygon:{id:string;vertices:readonly number[]}){
  this.cache=cache;const g=cache.terrain.geometry;this.id=polygon.id;this.charts=g.faces.filter(f=>g.physicalFaceId!(f)===polygon.id);const f=g.frame(this.charts[0]!);
  const xy=(p:PolyhedronVector)=>{const d=pyramidSub(p,f.origin);return[pyramidDot(d,f.e1),pyramidDot(d,f.e2)] as const;};
  const points=polygon.vertices.map(i=>xy(g.vertices[i]!)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const spacing=polyhedronAtlasSpacingMeters(cache.terrain,this.charts);this.stepX=spacing.x;this.stepY=spacing.y;this.step=Math.max(this.stepX,this.stepY);this.left=Math.min(...xs)-this.stepX;this.top=Math.max(...ys)+this.stepY;
  this.width=Math.ceil((Math.max(...xs)-this.left)/this.stepX)+2;this.height=Math.ceil((this.top-Math.min(...ys))/this.stepY)+2;
  this.pixels=new Uint8ClampedArray(this.width*this.height*4);this.coordinates=points.map(p=>[(p[0]-this.left)/this.stepX,(this.top-p[1])/this.stepY]);
  this.maps=this.charts.map(face=>{const q=g.frame(face),a=xy(q.origin),u=xy(q.origin.map((x,k)=>x+q.u[k]!) as unknown as PolyhedronVector),v=xy(q.origin.map((x,k)=>x+q.v[k]!) as unknown as PolyhedronVector),ux=u[0]-a[0],uy=u[1]-a[1],vx=v[0]-a[0],vy=v[1]-a[1];return{face,x:a[0],y:a[1],ux,uy,vx,vy,det:ux*vy-uy*vx};});
  this.tileColumns=Math.ceil(this.width/16);this.tileRows=Math.ceil(this.height/16);this.gutterBounds=new Float64Array(this.tileColumns*this.tileRows*this.maps.length*4);for(let i=0;i<this.gutterBounds.length;i+=4){this.gutterBounds[i]=this.gutterBounds[i+2]=Infinity;this.gutterBounds[i+1]=this.gutterBounds[i+3]=-Infinity;}
  this.anchor={patchId:this.charts[0]!,u:0,v:0};
 }
 private paint(left:number,top:number,right:number,bottom:number,relief:boolean,collectGutter=false,gutterOnly=false){const color=new Float64Array(3);for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
  const x=this.left+col*this.stepX,y=this.top-row*this.stepY;let face='',u=0,v=0,best=-Infinity,chart=0;
  for(let k=0;k<this.maps.length;k++){const m=this.maps[k]!,dx=x-m.x,dy=y-m.y,a=(dx*m.vy-dy*m.vx)/m.det,b=(m.ux*dy-m.uy*dx)/m.det,score=Math.min(a,b,1-a-b);if(score>best){best=score;face=m.face;u=a;v=b;chart=k;}}
  if(gutterOnly&&best>=0)continue;
  const g=this.cache.terrain.geometry;
  if(best<0&&g.atlasBoundaryPosition){const basis=g.frame(this.anchor.patchId),point=basis.origin.map((p,k)=>p+x*basis.e1[k]!+y*basis.e2[k]!) as unknown as PolyhedronVector,q=g.atlasBoundaryPosition(face,point);face=q.patchId;u=q.u;v=q.v;chart=this.charts.indexOf(face);if(chart<0)throw Error('Atlas boundary must remain in its physical polygon.');}
  else{u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1,v));if(u+v>1){const sum=u+v;u/=sum;v=1-u;}}
  if(collectGutter&&best<0){const at=((Math.floor(row/16)*this.tileColumns+Math.floor(col/16))*this.maps.length+chart)*4,b=this.gutterBounds;b[at]=Math.min(b[at]!,u);b[at+1]=Math.max(b[at+1]!,u);b[at+2]=Math.min(b[at+2]!,v);b[at+3]=Math.max(b[at+3]!,v);}
  this.cache.colorInto(face,u,v,relief,color);const at=(row*this.width+col)*4;this.pixels[at]=color[0]!;this.pixels[at+1]=color[1]!;this.pixels[at+2]=color[2]!;this.pixels[at+3]=255;
 }}
 *prepare(){for(let row=0;row<this.height;row+=8){this.paint(0,row,this.width-1,Math.min(this.height-1,row+7),true,true);yield;}}
 update(regions:readonly PyramidFieldRect[]|undefined,relief:boolean){
  if(!regions){this.paint(0,0,this.width-1,this.height-1,relief);return{left:0,top:0,width:this.width,height:this.height};}
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  // A changed field node influences each adjacent interpolation cell. Expand
  // in numerical coordinates BEFORE mapping into the orthogonal polygon tile:
  // two tile texels alone do not enclose a sheared chart's u+v stencil.
  for(const r of regions){const m=this.maps.find(m=>m.face===r.face);if(!m)continue;for(const u of[(r.left-1)/this.cache.n,(r.right+1)/this.cache.n])for(const v of[(r.top-1)/this.cache.n,(r.bottom+1)/this.cache.n]){const x=(m.x+u*m.ux+v*m.vx-this.left)/this.stepX,y=(this.top-m.y-u*m.uy-v*m.vy)/this.stepY;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  if(!Number.isFinite(left))return;left=Math.max(0,Math.floor(left)-2);top=Math.max(0,Math.floor(top)-2);right=Math.min(this.width-1,Math.ceil(right)+2);bottom=Math.min(this.height-1,Math.ceil(bottom)+2);this.paint(left,top,right,bottom,relief);
  // Clamped texels outside the polygon can feed the browser's reconstruction
  // filter at its silhouette. Their preimages need not lie in the planar dirty
  // rectangle. Immutable per-tile UV bounds find all affected gutter texels,
  // without repainting an entire polygon on each boundary dab.
  for(let ty=0;ty<this.tileRows;ty++)for(let tx=0;tx<this.tileColumns;tx++){
   const dirty=regions.some(r=>{const chart=this.charts.indexOf(r.face);if(chart<0)return false;const at=((ty*this.tileColumns+tx)*this.maps.length+chart)*4,b=this.gutterBounds,n=this.cache.n;return b[at]!<=(r.right+1)/n&&b[at+1]!>=(r.left-1)/n&&b[at+2]!<=(r.bottom+1)/n&&b[at+3]!>=(r.top-1)/n;});if(!dirty)continue;
   const x=tx*16,y=ty*16,r=Math.min(this.width-1,x+15),b=Math.min(this.height-1,y+15);this.paint(x,y,r,b,relief,false,true);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,r);bottom=Math.max(bottom,b);
  }
  return{left,top,width:right-left+1,height:bottom-top+1};
 }
 /** Three chart vertices determine the same affine map for the complete kite. */
 chartPixels(){const m=this.maps[0]!;return[[m.x,m.y],[m.x+m.ux,m.y+m.uy],[m.x+m.vx,m.y+m.vy]].map(([x,y])=>[(x!-this.left)/this.stepX,(this.top-y!)/this.stepY]);}
}
