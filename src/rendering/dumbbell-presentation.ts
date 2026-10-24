import type {DumbbellTerrain} from '../terrain/dumbbell.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';
import {TrianglePolyhedronPresentation} from './triangle-polyhedron-presentation.ts';
import {DUMBBELL_PROJECTION,dumbbellRegion,projectDumbbell} from './dumbbell-view.ts';
import {pyramidDot} from '../surfaces/pyramid.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
import type {CylinderAppearance} from './cylindrical-elevation.ts';
/** The three reference regions are convex and separated by two axial planes.
 * Their exact painter order follows the sign of the camera's axial component.
 * Internal join disks are never rendered. GPU uses real triangle depth. */
export class DumbbellPresentation extends TrianglePolyhedronPresentation<DumbbellTerrain>{
 constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,cache:PolyhedronDisplayCache<DumbbellTerrain>,invalidate:()=>void){super(canvas,fallback,cache,invalidate,DUMBBELL_PROJECTION);}
 protected override presentCanvas(view:CylinderView,size:CylinderViewport,appearance:CylinderAppearance){this.atlas.refreshColorAtlases(appearance);const ctx=this.fallback.getContext('2d')!,layer=this.scratch.getContext('2d')!,g=this.cache.terrain.geometry;if(this.scratch.width!==this.fallback.width||this.scratch.height!==this.fallback.height){this.scratch.width=this.fallback.width;this.scratch.height=this.fallback.height;}ctx.clearRect(0,0,this.fallback.width,this.fallback.height);
  const order=view.mode==='map'?['all']:view.frame.forward[0]>=0?['first','neck','second']:['second','neck','first'];for(const region of order){const polygons=g.physicalFaces.filter(p=>{const face=g.faces.find(f=>g.physicalFaceId(f)===p.id)!;return(region==='all'||dumbbellRegion(g,face)===region)&&(view.mode==='map'||pyramidDot(g.frame(face).normal,view.frame.forward)>1e-10);});if(!polygons.length)continue;layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,this.scratch.width,this.scratch.height);layer.globalCompositeOperation='lighter';layer.imageSmoothingEnabled=true;layer.imageSmoothingQuality='high';for(const p of polygons)this.drawPolygon(layer,p.id,view,size);
   layer.beginPath();for(const polygon of polygons){for(let i=0;i<polygon.vertices.length;i++){const vertex=polygon.vertices[i]!,face=g.faces.find(f=>g.physicalFaceId(f)===polygon.id&&g.vertexIds(f).includes(vertex))!,q=g.fromWeights(face,new Map([[vertex,1]]))!,p=projectDumbbell(g,q,view,size),x=p.x*this.scratch.width/size.width,y=p.y*this.scratch.height/size.height;i?layer.lineTo(x,y):layer.moveTo(x,y);}layer.closePath();}const face=g.faces.find(f=>g.physicalFaceId(f)===polygons[0]!.id)!,color=this.cache.color(face,.25,.25,appearance==='relief');layer.globalCompositeOperation='destination-over';layer.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;layer.fill();layer.globalCompositeOperation='destination-in';layer.fillStyle='white';layer.fill();ctx.drawImage(this.scratch,0,0);}
  this.canvas.hidden=true;
 }
}
