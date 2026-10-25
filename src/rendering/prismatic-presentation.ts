import type{PrismaticTerrain}from'../terrain/prismatic-contract.ts';
import{pyramidDot}from'../surfaces/pyramid.ts';
import type{PolyhedronDisplayCache}from'./polyhedron-field.ts';
import{TrianglePolyhedronPresentation}from'./triangle-polyhedron-presentation.ts';
import{PRISM_PROJECTION}from'./prismatic-view.ts';
import type{CylinderView,CylinderViewport}from'./cylindrical-view.ts';
import type{CylinderAppearance}from'./cylindrical-elevation.ts';
import type{PolyhedronProjection}from'./polyhedron-projection.ts';
import type{SurfacePosition}from'../surfaces/contracts.ts';
export interface PrismPixelRect{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number}
/** The accepted prism-specific wall order and exact silhouette composition. */
export class PrismaticPresentation<T extends PrismaticTerrain> extends TrianglePolyhedronPresentation<T>{
 protected get incrementalCanvas(){return false;}
 protected canvasDirtyArea:PrismPixelRect|undefined;
 /** The workspace may erase/resize the shared backing independently of terrain. */
 invalidateCanvas(){this.canvasFrame=undefined;this.canvasDirtyArea=undefined;}
 private canvasFrame?:{stamp:string;revision:number;appearance:CylinderAppearance;fills:string};
 private canvasGeometry?:{stamp:string;groups:readonly string[][];polygons:ReadonlyMap<string,{face:string;points:readonly{x:number;y:number}[];bounds:PrismPixelRect}>};
 private polygonInfo?:readonly{id:string;face:string;corners:readonly SurfacePosition[]}[];
 constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,cache:PolyhedronDisplayCache<T>,invalidate:()=>void,projection:PolyhedronProjection<T['geometry']>=PRISM_PROJECTION,options:{polygonColorsOnly?:boolean}={}){super(canvas,fallback,cache,invalidate,projection,options);}
 protected canvasGroupMask(_group:readonly string[],_view:CylinderView,_size:CylinderViewport):Path2D|undefined{return undefined;}
 private wallGroups(view:CylinderView){const g=this.cache.terrain.geometry,N=g.outline.length,visible=g.outline.map((_,i)=>{const face=g.faces.find(f=>g.physicalFaceId(f)===`wall-${i}`)!;return pyramidDot(g.frame(face).normal,view.frame.forward)>1e-10;}),start=visible.findIndex(v=>!v);if(start<0)return[Array.from({length:N},(_,i)=>i)];const groups:number[][]=[];let run:number[]=[];for(let k=1;k<=N;k++){const i=(start+k)%N;if(visible[i])run.push(i);else if(run.length){groups.push(run);run=[];}}if(run.length)groups.push(run);if(groups.length<2)return groups;
  const h=Math.hypot(view.frame.forward[0],view.frame.forward[2]);if(h<1e-12)return[];const axis=[view.frame.forward[2]/h,-view.frame.forward[0]/h]as const,depth=[view.frame.forward[0]/h,view.frame.forward[2]/h]as const,project=(i:number)=>{const p=g.outline[i]!;return{x:p[0]*axis[0]+p[1]*axis[1],z:p[0]*depth[0]+p[1]*depth[1]};},before=groups.map(()=>new Set<number>());
  for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++)for(const i of groups[a]!)for(const j of groups[b]!){const p=project(i),q=project((i+1)%N),r=project(j),s=project((j+1)%N),left=Math.max(Math.min(p.x,q.x),Math.min(r.x,s.x)),right=Math.min(Math.max(p.x,q.x),Math.max(r.x,s.x));if(right-left<g.scaleMeters*1e-10)continue;const x=(left+right)/2,za=p.z+(q.z-p.z)*(x-p.x)/(q.x-p.x),zb=r.z+(s.z-r.z)*(x-r.x)/(s.x-r.x);if(za<zb)before[b]!.add(a);else before[a]!.add(b);}
  const order:number[]=[];for(let k=0;k<groups.length;k++){const next=groups.findIndex((_,i)=>!order.includes(i)&&[...before[i]!].every(j=>order.includes(j)));if(next<0)throw Error('Prism wall visibility order is inconsistent.');order.push(next);}return order.map(i=>groups[i]!);
 }
 protected override presentCanvas(view:CylinderView,size:CylinderViewport,appearance:CylinderAppearance){if(this.incrementalCanvas){this.presentIncrementalCanvas(view,size,appearance);return;}this.atlas.refreshColorAtlases(appearance);const ctx=this.fallback.getContext('2d')!,layer=this.scratch.getContext('2d')!;if(this.scratch.width!==this.fallback.width||this.scratch.height!==this.fallback.height){this.scratch.width=this.fallback.width;this.scratch.height=this.fallback.height;}ctx.clearRect(0,0,this.fallback.width,this.fallback.height);const g=this.cache.terrain.geometry,groups=view.mode==='map'?[g.physicalFaces.map(p=>p.id)]:[...this.wallGroups(view).map(group=>group.map(i=>`wall-${i}`)),Math.abs(view.frame.forward[1])<1e-10?[]:g.physicalFaces.filter(p=>p.id.startsWith(view.frame.forward[1]>=0?'upper-':'lower-')).map(p=>p.id)];for(const group of groups){layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,this.scratch.width,this.scratch.height);layer.globalCompositeOperation='lighter';layer.imageSmoothingEnabled=true;layer.imageSmoothingQuality='high';for(const id of group)this.drawPolygon(layer,id,view,size);
   // One union silhouette supplies opaque material behind the color atlases.
   // Separate Canvas clips round complementary edge coverage to 254/255 at
   // some coplanar joins. A single nonzero path cancels their internal edges;
   // destination-over fills only that rounding remainder, without readback,
   // expanded polygons, hidden geometry or a change to canonical heights.
   if(group.length){const mask=this.canvasGroupMask(group,view,size);layer.globalCompositeOperation='destination-over';layer.beginPath();for(const id of group){const polygon=g.physicalFaces.find(p=>p.id===id)!;polygon.vertices.forEach((vertex,i)=>{const chart=g.faces.find(f=>g.physicalFaceId(f)===id&&g.vertexIds(f).includes(vertex))!,p=g.fromWeights(chart,new Map([[vertex,1]]));if(!p)throw Error('Prism silhouette vertex is missing.');const projected=this.projection.project(g,p,view,size)!,x=projected.x*this.scratch.width/size.width,y=projected.y*this.scratch.height/size.height;i?layer.lineTo(x,y):layer.moveTo(x,y);});layer.closePath();}const color=this.cache.color(g.faces.find(f=>g.physicalFaceId(f)===group[0])!,.25,.25,appearance==='relief');layer.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;if(mask)layer.fill(mask);else layer.fill();
    // Reuse that exact physical union as the final clip. Very thin/sheared
    // atlas clips can leave a faint antialias pixel outside their real edge;
    // the union bounds color coverage without expanding or inventing material.
    layer.globalCompositeOperation='destination-in';layer.fillStyle='white';if(mask)layer.fill(mask);else layer.fill();}ctx.drawImage(this.scratch,0,0);}this.canvas.hidden=true;}
 /** Same accepted pattern/mask composition, restricted to the complete dirty
  * filter footprint. Qualified geometry opts in; older prisms keep their path. */
 private presentIncrementalCanvas(view:CylinderView,size:CylinderViewport,appearance:CylinderAppearance){
  this.atlas.refreshColorAtlases(appearance);
  const g=this.cache.terrain.geometry,ctx=this.fallback.getContext('2d')!,layer=this.scratch.getContext('2d')!,stamp=JSON.stringify([view,size,this.fallback.width,this.fallback.height]);
  if(!this.polygonInfo)this.polygonInfo=g.physicalFaces.map(p=>{const charts=g.faces.filter(f=>g.physicalFaceId(f)===p.id);return{id:p.id,face:charts[0]!,corners:p.vertices.map(vertex=>g.fromWeights(charts.find(f=>g.vertexIds(f).includes(vertex))!,new Map([[vertex,1]]))!)};});
  if(this.canvasGeometry?.stamp!==stamp){
   const groups=view.mode==='map'?[g.physicalFaces.map(p=>p.id)]:[...this.wallGroups(view).map(group=>group.map(i=>`wall-${i}`)),Math.abs(view.frame.forward[1])<1e-10?[]:g.physicalFaces.filter(p=>p.id.startsWith(view.frame.forward[1]>=0?'upper-':'lower-')).map(p=>p.id)];
   const polygons=new Map(this.polygonInfo.map(p=>{const points=p.corners.map(q=>{const a=this.projection.project(g,q,view,size)!;return{x:a.x*this.fallback.width/size.width,y:a.y*this.fallback.height/size.height};});return[p.id,{face:p.face,points,bounds:{left:Math.min(...points.map(p=>p.x))-3,top:Math.min(...points.map(p=>p.y))-3,right:Math.max(...points.map(p=>p.x))+3,bottom:Math.max(...points.map(p=>p.y))+3}}]as const;}));
   this.canvasGeometry={stamp,groups,polygons};
  }
  const {groups,polygons}=this.canvasGeometry,fills=groups.map(group=>group.length?this.cache.color(polygons.get(group[0]!)!.face,.25,.25,appearance==='relief').join(','):'').join(';'),same=this.canvasFrame?.stamp===stamp&&this.canvasFrame.appearance===appearance&&this.canvasFrame.fills===fills;
  this.canvas.hidden=true;this.canvasDirtyArea=undefined;
  if(same&&this.canvasFrame!.revision===this.cache.sourceRevision){this.canvasDirtyArea={left:0,top:0,right:0,bottom:0};return;}
  const area=same?this.dirtyPixels(view,size):undefined;this.canvasDirtyArea=area;
  if(area&&(area.left>=area.right||area.top>=area.bottom)){this.canvasFrame={stamp,revision:this.cache.sourceRevision,appearance,fills};return;}
  if(this.scratch.width!==this.fallback.width||this.scratch.height!==this.fallback.height){this.scratch.width=this.fallback.width;this.scratch.height=this.fallback.height;}
  const guard=area?{left:Math.max(0,area.left-8),top:Math.max(0,area.top-8),right:Math.min(this.scratch.width,area.right+8),bottom:Math.min(this.scratch.height,area.bottom+8)}:undefined;
  ctx.save();layer.save();ctx.setTransform(1,0,0,1,0,0);layer.setTransform(1,0,0,1,0,0);
  if(area&&guard)for(const[c,r]of[[ctx,area],[layer,guard]]as const){c.beginPath();c.rect(r.left,r.top,r.right-r.left,r.bottom-r.top);c.clip();}
  ctx.clearRect(0,0,this.fallback.width,this.fallback.height);
  for(const group of groups){
   const visible=guard?group.filter(id=>{const b=polygons.get(id)!.bounds;return b.left<guard.right&&b.right>guard.left&&b.top<guard.bottom&&b.bottom>guard.top;}):group;
   if(!visible.length)continue;
   layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,this.scratch.width,this.scratch.height);layer.globalCompositeOperation='lighter';layer.imageSmoothingEnabled=true;layer.imageSmoothingQuality='high';
   for(const id of visible)this.drawPolygon(layer,id,view,size);
   const mask=this.canvasGroupMask(group,view,size);layer.beginPath();
   if(!mask)for(const id of group){polygons.get(id)!.points.forEach((p,i)=>i?layer.lineTo(p.x,p.y):layer.moveTo(p.x,p.y));layer.closePath();}
   const color=this.cache.color(polygons.get(group[0]!)!.face,.25,.25,appearance==='relief');layer.globalCompositeOperation='destination-over';layer.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;if(mask)layer.fill(mask);else layer.fill();
   layer.globalCompositeOperation='destination-in';layer.fillStyle='white';if(mask)layer.fill(mask);else layer.fill();ctx.drawImage(this.scratch,0,0);
  }
  ctx.restore();layer.restore();this.canvasFrame={stamp,revision:this.cache.sourceRevision,appearance,fills};
 }
 private dirtyPixels(view:CylinderView,size:CylinderViewport):PrismPixelRect|undefined{
  const updates=this.atlas.lastPolygonUpdates,g=this.cache.terrain.geometry;
  if(!updates||updates.from!==this.canvasFrame?.revision||updates.to!==this.cache.sourceRevision)return;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const r of updates.rectangles){
   const a=this.cache.polygonAtlases.find(a=>a.id===r.id)!,face=a.anchor.patchId,f=g.frame(face),p=this.projection.project(g,{...g.identity,patchId:face,u:0,v:0},view,size)!,u=this.projection.project(g,{...g.identity,patchId:face,u:1,v:0},view,size)!,v=this.projection.project(g,{...g.identity,patchId:face,u:0,v:1},view,size)!;
   for(const col of[r.left-2,r.left+r.width+2])for(const row of[r.top-2,r.top+r.height+2]){
    const x=a.left+col*a.stepX,y=a.top-row*a.stepY,point=f.origin.map((p,k)=>p+x*f.e1[k]!+y*f.e2[k]!)as[number,number,number],q=g.localCoordinates(face,point),X=(p.x+q.u*(u.x-p.x)+q.v*(v.x-p.x))*this.fallback.width/size.width,Y=(p.y+q.u*(u.y-p.y)+q.v*(v.y-p.y))*this.fallback.height/size.height;
    left=Math.min(left,X);right=Math.max(right,X);top=Math.min(top,Y);bottom=Math.max(bottom,Y);
   }
  }
  return{left:Math.max(0,Math.floor(left)-3),top:Math.max(0,Math.floor(top)-3),right:Math.min(this.fallback.width,Math.ceil(right)+3),bottom:Math.min(this.fallback.height,Math.ceil(bottom)+3)};
 }
 override dispose(){this.canvasFrame=undefined;this.canvasGeometry=undefined;this.polygonInfo=undefined;super.dispose();}
}
