import {FACE_BASES,CUBE_FACES,QUARTER_PI,type CubeFace,type Vec3} from './cube-sphere.ts';
import {roundedAngle,type RoundedCrescentGeometry} from './rounded-crescent-globe.ts';
import * as I from './pyramid-interval.ts';
import {physicalBoxTree,type PhysicalBoxNode} from './physical-box-tree.ts';
export interface RoundedPhysicalBounds {readonly low:Vec3;readonly high:Vec3}
function trig(a:I.Interval,cosine:boolean):I.Interval{const fn=cosine?Math.cos:Math.sin,values=[fn(a[0]),fn(a[1])],offset=cosine?0:Math.PI/2;for(let n=Math.ceil((a[0]-offset)/Math.PI);offset+n*Math.PI<=a[1];n++)values.push(n%2===0?1:-1);return[Math.min(...values)-1e-14,Math.max(...values)+1e-14];}
/** Conservative bounds of a complete smooth cube-chart rectangle. Outward
 * interval arithmetic retains nonlinear normalization, taper and curvature.
 * Bounds only accelerate/limit work; they never replace actual intersections. */
export function roundedPatchBounds(g:RoundedCrescentGeometry,face:CubeFace,u:I.Interval,v:I.Interval):RoundedPhysicalBounds{
 const a:I.Interval=[Math.tan(u[0])-1e-14,Math.tan(u[1])+1e-14],b:I.Interval=[Math.tan(v[0])-1e-14,Math.tan(v[1])+1e-14],length=I.root(I.add(I.exact(1),I.add(I.square(a),I.square(b)))),basis=FACE_BASES[face],p=[0,1,2].map(k=>{const q=I.divide(I.add(I.exact(basis.normal[k]!),I.add(I.multiply(I.exact(basis.u[k]!),a),I.multiply(I.exact(basis.v[k]!),b))),length);return[Math.max(-1,q[0]),Math.min(1,q[1])] as I.Interval;});
 const phi:I.Interval=[roundedAngle(g,p[0]![0]),roundedAngle(g,p[0]![1])],profile=I.subtract(I.exact(1),I.multiply(I.exact(g.tipTaper),I.square(p[0]!))),radial=I.add(I.exact(g.bendRadius),I.multiply(I.exact(g.bodyRadius),I.multiply(profile,p[1]!))),xyz=[I.multiply(radial,trig(phi,true)),I.multiply(radial,trig(phi,false)),I.multiply(I.exact(g.bodyDepth),I.multiply(profile,p[2]!))],pad=(g.bendRadius+g.bodyRadius)*1e-12;
 return{low:xyz.map(p=>p[0]-pad) as unknown as Vec3,high:xyz.map(p=>p[1]+pad) as unknown as Vec3};
}
const trees=new WeakMap<RoundedCrescentGeometry,{root:PhysicalBoxNode<number>;boxes:RoundedPhysicalBounds[]}>();
export function roundedBoundTree(g:RoundedCrescentGeometry){let found=trees.get(g);if(found)return found;const N=16,boxes:RoundedPhysicalBounds[]=[];for(const face of CUBE_FACES)for(let row=0;row<N;row++)for(let column=0;column<N;column++)boxes.push(roundedPatchBounds(g,face,[(2*column/N-1)*QUARTER_PI,(2*(column+1)/N-1)*QUARTER_PI],[(2*row/N-1)*QUARTER_PI,(2*(row+1)/N-1)*QUARTER_PI]));found={root:physicalBoxTree(boxes.map((b,id)=>({...b,id}))),boxes};trees.set(g,found);return found;}
export function roundedRayWindows(g:RoundedCrescentGeometry,origin:Vec3,direction:Vec3){
 const {root,boxes}=roundedBoundTree(g),intervals:[number,number][]=[];
 let hitLo=0,hitHi=0;const hit=(b:RoundedPhysicalBounds|PhysicalBoxNode<number>)=>{let lo=0,hi=Infinity;for(let k=0;k<3;k++){const o=origin[k]!,d=direction[k]!;if(Math.abs(d)<1e-15){if(o<b.low[k]!||o>b.high[k]!)return false;}else{let a=(b.low[k]!-o)/d,c=(b.high[k]!-o)/d;if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return false;}}hitLo=lo;hitHi=hi;return true;};
 const visit=(node:PhysicalBoxNode<number>)=>{if(!hit(node))return;if(node.children){for(const child of node.children)visit(child);}else for(const id of node.ids!){if(hit(boxes[id]!))intervals.push([hitLo,hitHi]);}};visit(root);intervals.sort((a,b)=>a[0]-b[0]);const merged:[number,number][]=[];for(const p of intervals){const last=merged.at(-1);if(last&&p[0]<=last[1]+1e-12)last[1]=Math.max(last[1],p[1]);else merged.push([...p]);}return merged;
}
