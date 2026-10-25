import type {RibbonGeometry} from '../surfaces/ribbon.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {pyramidDot,pyramidSub,type PyramidVector} from '../surfaces/pyramid.ts';
import type {CylinderView} from './cylindrical-view.ts';
import {physicalBoxTree,type PhysicalBoxNode} from '../surfaces/physical-box-tree.ts';
type Node=PhysicalBoxNode<string>;
const trees=new WeakMap<RibbonGeometry,Node>();
function tree(g:RibbonGeometry){let root=trees.get(g);if(root)return root;root=physicalBoxTree(g.faces.map(face=>{const p=g.vertexIds(face).map(i=>g.vertices[i]!);return{id:face,low:[0,1,2].map(k=>Math.min(...p.map(v=>v[k]!))),high:[0,1,2].map(k=>Math.max(...p.map(v=>v[k]!)))};}));trees.set(g,root);return root;}
/** Derived geometry-only BVH; the original full triangle ray remains the
 * independent picker. Visibility never changes numerical brush distance. */
export function ribbonPointVisible(g:RibbonGeometry,p:SurfacePosition,v:CylinderView){if(v.mode==='map')return true;if(!g.aliases(p).some(q=>pyramidDot(g.normal(q),v.frame.forward)>1e-10))return false;const origin=g.referencePosition(p),d=v.frame.forward,tolerance=g.scaleMeters*1e-7;
 const box=(n:Node)=>{let lo=tolerance,hi=Infinity;for(let k=0;k<3;k++){if(Math.abs(d[k]!)<1e-15){if(origin[k]!<n.low[k]!-tolerance||origin[k]!>n.high[k]!+tolerance)return false;}else{let a=(n.low[k]!-tolerance-origin[k]!)/d[k]!,b=(n.high[k]!+tolerance-origin[k]!)/d[k]!;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}}return hi>=tolerance;};
 const occluded=(n:Node):boolean=>{if(!box(n))return false;if(n.children)return n.children.some(occluded);for(const face of n.ids!){const f=g.frame(face),den=pyramidDot(f.normal,d);if(den<=1e-12)continue;const t=pyramidDot(f.normal,pyramidSub(f.origin,origin))/den;if(t<=tolerance)continue;const point=origin.map((x,k)=>x+t*d[k]!) as unknown as PyramidVector,{u,v}=g.localCoordinates(face,point);if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9)return true;}return false;};return!occluded(tree(g));
}
