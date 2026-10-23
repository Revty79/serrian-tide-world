import type {ExcavationPrimitive} from '../surfaces/hollow-cube-csg.ts';
import type {SurfaceDisplaySize} from './surface-renderer.ts';
/** Conservative bounds of projected capsule volumes, clipped to the viewport.
 * The adapter supplies its own physical projection and reference-unit scale. */
export function projectedCutBounds(primitives:readonly ExcavationPrimitive[],size:SurfaceDisplaySize,project:(p:ExcavationPrimitive['a'])=>{x:number;y:number},scale:number,padding=3){
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const cut of primitives)for(const point of[cut.a,cut.b]){const p=project(point),r=cut.radius*scale+padding;left=Math.min(left,p.x-r);right=Math.max(right,p.x+r);top=Math.min(top,p.y-r);bottom=Math.max(bottom,p.y+r);}
 left=Math.max(0,Math.floor(left));top=Math.max(0,Math.floor(top));right=Math.min(size.width,Math.ceil(right));bottom=Math.min(size.height,Math.ceil(bottom));return{x:left,y:top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
}
/** Same conservative projected capsule test as PROJECTED_CUT_GLSL. Ordinary
 * terrain outside every padded capsule keeps its existing sharp presentation. */
export function prepareProjectedCutTest(primitives:readonly ExcavationPrimitive[],project:(p:ExcavationPrimitive['a'])=>{x:number;y:number},scale:number,padding=3){const cuts=primitives.map(c=>{const a=project(c.a),b=project(c.b),dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,r=c.radius*scale+padding;return{a,dx,dy,length,r2:r*r};});return(x:number,y:number)=>cuts.some(c=>{const px=x-c.a.x,py=y-c.a.y,t=c.length?Math.max(0,Math.min(1,(px*c.dx+py*c.dy)/c.length)):0,dx=px-t*c.dx,dy=py-t*c.dy;return dx*dx+dy*dy<=c.r2;});}
