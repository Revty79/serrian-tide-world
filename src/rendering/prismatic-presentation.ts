import type{PrismaticTerrain}from'../terrain/prismatic-contract.ts';
import{pyramidDot}from'../surfaces/pyramid.ts';
import type{PolyhedronDisplayCache}from'./polyhedron-field.ts';
import{TrianglePolyhedronPresentation}from'./triangle-polyhedron-presentation.ts';
import{PRISM_PROJECTION,projectPrism}from'./prismatic-view.ts';
import type{CylinderView,CylinderViewport}from'./cylindrical-view.ts';
import type{CylinderAppearance}from'./cylindrical-elevation.ts';
/** The accepted prism-specific wall order and exact silhouette composition. */
export class PrismaticPresentation<T extends PrismaticTerrain> extends TrianglePolyhedronPresentation<T>{
 constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,cache:PolyhedronDisplayCache<T>,invalidate:()=>void){super(canvas,fallback,cache,invalidate,PRISM_PROJECTION);}
 private wallGroups(view:CylinderView){const g=this.cache.terrain.geometry,N=g.outline.length,visible=g.outline.map((_,i)=>{const face=g.faces.find(f=>g.physicalFaceId(f)===`wall-${i}`)!;return pyramidDot(g.frame(face).normal,view.frame.forward)>1e-10;}),start=visible.findIndex(v=>!v);if(start<0)return[Array.from({length:N},(_,i)=>i)];const groups:number[][]=[];let run:number[]=[];for(let k=1;k<=N;k++){const i=(start+k)%N;if(visible[i])run.push(i);else if(run.length){groups.push(run);run=[];}}if(run.length)groups.push(run);if(groups.length<2)return groups;
  const h=Math.hypot(view.frame.forward[0],view.frame.forward[2]);if(h<1e-12)return[];const axis=[view.frame.forward[2]/h,-view.frame.forward[0]/h]as const,depth=[view.frame.forward[0]/h,view.frame.forward[2]/h]as const,project=(i:number)=>{const p=g.outline[i]!;return{x:p[0]*axis[0]+p[1]*axis[1],z:p[0]*depth[0]+p[1]*depth[1]};},before=groups.map(()=>new Set<number>());
  for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++)for(const i of groups[a]!)for(const j of groups[b]!){const p=project(i),q=project((i+1)%N),r=project(j),s=project((j+1)%N),left=Math.max(Math.min(p.x,q.x),Math.min(r.x,s.x)),right=Math.min(Math.max(p.x,q.x),Math.max(r.x,s.x));if(right-left<g.scaleMeters*1e-10)continue;const x=(left+right)/2,za=p.z+(q.z-p.z)*(x-p.x)/(q.x-p.x),zb=r.z+(s.z-r.z)*(x-r.x)/(s.x-r.x);if(za<zb)before[b]!.add(a);else before[a]!.add(b);}
  const order:number[]=[];for(let k=0;k<groups.length;k++){const next=groups.findIndex((_,i)=>!order.includes(i)&&[...before[i]!].every(j=>order.includes(j)));if(next<0)throw Error('Prism wall visibility order is inconsistent.');order.push(next);}return order.map(i=>groups[i]!);
 }
 protected override presentCanvas(view:CylinderView,size:CylinderViewport,appearance:CylinderAppearance){this.atlas.refreshColorAtlases(appearance);const ctx=this.fallback.getContext('2d')!,layer=this.scratch.getContext('2d')!;if(this.scratch.width!==this.fallback.width||this.scratch.height!==this.fallback.height){this.scratch.width=this.fallback.width;this.scratch.height=this.fallback.height;}ctx.clearRect(0,0,this.fallback.width,this.fallback.height);const g=this.cache.terrain.geometry,groups=view.mode==='map'?[g.physicalFaces.map(p=>p.id)]:[...this.wallGroups(view).map(group=>group.map(i=>`wall-${i}`)),Math.abs(view.frame.forward[1])<1e-10?[]:g.physicalFaces.filter(p=>p.id.startsWith(view.frame.forward[1]>=0?'upper-':'lower-')).map(p=>p.id)];for(const group of groups){layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,this.scratch.width,this.scratch.height);layer.globalCompositeOperation='lighter';layer.imageSmoothingEnabled=true;layer.imageSmoothingQuality='high';for(const id of group)this.drawPolygon(layer,id,view,size);
   // One union silhouette supplies opaque material behind the color atlases.
   // Separate Canvas clips round complementary edge coverage to 254/255 at
   // some coplanar joins. A single nonzero path cancels their internal edges;
   // destination-over fills only that rounding remainder, without readback,
   // expanded polygons, hidden geometry or a change to canonical heights.
   if(group.length){layer.globalCompositeOperation='destination-over';layer.beginPath();for(const id of group){const polygon=g.physicalFaces.find(p=>p.id===id)!;polygon.vertices.forEach((vertex,i)=>{const chart=g.faces.find(f=>g.physicalFaceId(f)===id&&g.vertexIds(f).includes(vertex))!,p=g.fromWeights(chart,new Map([[vertex,1]]));if(!p)throw Error('Prism silhouette vertex is missing.');const projected=projectPrism(g,p,view,size),x=projected.x*this.scratch.width/size.width,y=projected.y*this.scratch.height/size.height;i?layer.lineTo(x,y):layer.moveTo(x,y);});layer.closePath();}const color=this.cache.color(g.faces.find(f=>g.physicalFaceId(f)===group[0])!,.25,.25,appearance==='relief');layer.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;layer.fill();
    // Reuse that exact physical union as the final clip. Very thin/sheared
    // atlas clips can leave a faint antialias pixel outside their real edge;
    // the union bounds color coverage without expanding or inventing material.
    layer.globalCompositeOperation='destination-in';layer.fillStyle='white';layer.fill();}ctx.drawImage(this.scratch,0,0);}this.canvas.hidden=true;}
}
