import {pyramidDot,pyramidSub} from '../surfaces/pyramid.ts';
import type {PolyhedronVector} from '../surfaces/polyhedron-contract.ts';
import type {PyramidDisplayCache,PyramidFieldRect} from './pyramid-field.ts';
import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
/** One affine color atlas per physical planar polygon. Numerical triangle
 * charts share this image, so Canvas never antialiases an internal diagonal.
 * Colors, interpolation and dirty journals are the accepted field cache's. */
export class PolygonColorAtlas {
 readonly id:string;readonly charts:string[];readonly width:number;readonly height:number;readonly pixels:Uint8ClampedArray<ArrayBuffer>;
 readonly coordinates:readonly(readonly[number,number])[];readonly anchor:{patchId:string;u:number;v:number};
 private readonly maps:{face:string;x:number;y:number;ux:number;uy:number;vx:number;vy:number;det:number}[];
 readonly left:number;readonly top:number;readonly step:number;
 readonly cache:PyramidDisplayCache<PolyhedronTerrain>;
 constructor(cache:PyramidDisplayCache<PolyhedronTerrain>,polygon:{id:string;vertices:readonly number[]}){
  this.cache=cache;const g=cache.terrain.geometry;this.id=polygon.id;this.charts=g.faces.filter(f=>g.physicalFaceId!(f)===polygon.id);const f=g.frame(this.charts[0]!);
  const xy=(p:PolyhedronVector)=>{const d=pyramidSub(p,f.origin);return[pyramidDot(d,f.e1),pyramidDot(d,f.e2)] as const;};
  const points=polygon.vertices.map(i=>xy(g.vertices[i]!)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  this.step=g.maximumLatticeEdgeMeters/(2*cache.n);this.left=Math.min(...xs)-this.step;this.top=Math.max(...ys)+this.step;
  this.width=Math.ceil((Math.max(...xs)-this.left)/this.step)+2;this.height=Math.ceil((this.top-Math.min(...ys))/this.step)+2;
  this.pixels=new Uint8ClampedArray(this.width*this.height*4);this.coordinates=points.map(p=>[(p[0]-this.left)/this.step,(this.top-p[1])/this.step]);
  this.maps=this.charts.map(face=>{const q=g.frame(face),a=xy(q.origin),u=xy(q.origin.map((x,k)=>x+q.u[k]!) as unknown as PolyhedronVector),v=xy(q.origin.map((x,k)=>x+q.v[k]!) as unknown as PolyhedronVector),ux=u[0]-a[0],uy=u[1]-a[1],vx=v[0]-a[0],vy=v[1]-a[1];return{face,x:a[0],y:a[1],ux,uy,vx,vy,det:ux*vy-uy*vx};});
  this.anchor={patchId:this.charts[0]!,u:0,v:0};
 }
 private paint(left:number,top:number,right:number,bottom:number,relief:boolean){const color=new Float64Array(3);for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
  const x=this.left+col*this.step,y=this.top-row*this.step;let face='',u=0,v=0,best=-Infinity;
  for(const m of this.maps){const dx=x-m.x,dy=y-m.y,a=(dx*m.vy-dy*m.vx)/m.det,b=(m.ux*dy-m.uy*dx)/m.det,score=Math.min(a,b,1-a-b);if(score>best){best=score;face=m.face;u=a;v=b;}}
  u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1,v));if(u+v>1){const sum=u+v;u/=sum;v=1-u;}
  this.cache.colorInto(face,u,v,relief,color);const at=(row*this.width+col)*4;this.pixels[at]=color[0]!;this.pixels[at+1]=color[1]!;this.pixels[at+2]=color[2]!;this.pixels[at+3]=255;
 }}
 *prepare(){for(let row=0;row<this.height;row+=8){this.paint(0,row,this.width-1,Math.min(this.height-1,row+7),true);yield;}}
 update(regions:readonly PyramidFieldRect[]|undefined,relief:boolean){
  if(!regions){this.paint(0,0,this.width-1,this.height-1,relief);return{left:0,top:0,width:this.width,height:this.height};}
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const r of regions){const m=this.maps.find(m=>m.face===r.face);if(!m)continue;for(const u of[r.left/this.cache.n,r.right/this.cache.n])for(const v of[r.top/this.cache.n,r.bottom/this.cache.n]){const x=(m.x+u*m.ux+v*m.vx-this.left)/this.step,y=(this.top-m.y-u*m.uy-v*m.vy)/this.step;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  if(!Number.isFinite(left))return;left=Math.max(0,Math.floor(left)-2);top=Math.max(0,Math.floor(top)-2);right=Math.min(this.width-1,Math.ceil(right)+2);bottom=Math.min(this.height-1,Math.ceil(bottom)+2);this.paint(left,top,right,bottom,relief);return{left,top,width:right-left+1,height:bottom-top+1};
 }
 /** Three chart vertices determine the same affine map for the complete kite. */
 chartPixels(){const m=this.maps[0]!;return[[m.x,m.y],[m.x+m.ux,m.y+m.uy],[m.x+m.vx,m.y+m.vy]].map(([x,y])=>[(x!-this.left)/this.step,(this.top-y!)/this.step]);}
}
