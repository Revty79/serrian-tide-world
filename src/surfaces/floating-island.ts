import {assertIdentity,type SurfaceIdentity} from './contracts.ts';
import {freezePolyhedronArrays,type PolyhedronPhysicalBounds,type PolyhedronVector} from './polyhedron-contract.ts';
import {triangulatedPolygonGeometry} from './triangulated-polygon.ts';
import * as I from './pyramid-interval.ts';

export interface FloatingIslandConfiguration {
 readonly provider:'physical-floating-island';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior';
 readonly widthMeters:number;readonly lengthMeters:number;readonly thicknessMeters:number;readonly seed:number;
}
/** A convex, irregular five-sided plateau, five genuine cliff trapezoids and
 * five tapered underside facets. Ring coordinates are rational multiples of
 * the persisted dimensions. Numerical fan diagonals are welded, not seams.
 * The lower ring is homothetic; its smaller taper rate proves convexity. */
export function createFloatingIslandGeometry(input:FloatingIslandConfiguration){
 assertIdentity(input.identity);
 const {widthMeters:w,lengthMeters:l,thicknessMeters:h,seed}=input;
 if(input.provider!=='physical-floating-island'||input.version!==1||input.role!=='exterior'||![w,l,h].every(Number.isFinite)||w<10000||w>1e9||l/w<.75||l/w>1.5||h/w<.25||h/w>.65||!Number.isInteger(seed)||seed<0||seed>2147483647)throw RangeError('Islands require width 10,000–1,000,000,000 m, length 0.75–1.5 × width, thickness 0.25–0.65 × width, and a supported seed.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,widthMeters:w,lengthMeters:l,thicknessMeters:h,seed});
 // Three bounded, independently checked convex outlines. Seed selects a stable
 // outline and a mirror, never unbounded random topology or a generated mesh.
 const outlines=[[[ -50,-22],[-18,-43],[44,-25],[50,19],[-16,45]],[[-48,-28],[-9,-46],[47,-19],[42,30],[-27,43]],[[-50,-16],[-26,-41],[38,-32],[49,25],[-15,46]]] as const;
 const outline=outlines[seed%3]!,mirror=Math.floor(seed/3)%2===1?-1:1;
 const raw:PolyhedronPhysicalBounds[]=outline.map(([x,z])=>[I.divide(I.multiply(I.exact(x*mirror),I.exact(w)),I.exact(100)),I.divide(I.exact(h),I.exact(2)),I.divide(I.multiply(I.exact(z),I.exact(l)),I.exact(100))]);
 // top y = h/2, rim y = .1h, tip y = -h/2; the body center stays fixed.
 for(let i=0;i<5;i++)raw.push([I.divide(I.multiply(raw[i]![0],I.exact(9)),I.exact(10)),I.divide(I.exact(h),I.exact(10)),I.divide(I.multiply(raw[i]![2],I.exact(9)),I.exact(10))]);
 raw.push([I.exact(0),I.divide(I.neg(I.exact(h)),I.exact(2)),I.exact(0)]);
 const vertexBounds=freezePolyhedronArrays(raw),vertices=freezePolyhedronArrays(raw.map(p=>p.map(a=>a[0]+(a[1]-a[0])/2) as unknown as PolyhedronVector));
 // x/z outline is CCW, hence the upper y normal requires reversed winding.
 const outward=(ids:number[])=>Object.freeze(mirror===1?ids:ids.slice().reverse());
 const polygons=Object.freeze([
  Object.freeze({id:'upper',vertices:outward([4,3,2,1,0])}),
  ...Array.from({length:5},(_,i)=>Object.freeze({id:`cliff-${i+1}`,vertices:outward([i,(i+1)%5,(i+1)%5+5,i+5])})),
  ...Array.from({length:5},(_,i)=>Object.freeze({id:`underside-${i+1}`,vertices:outward([i+5,(i+1)%5+5,10])})),
 ]);
 const g=triangulatedPolygonGeometry({metadata,vertices,vertexBounds,polygons,scaleMeters:w,minimumDimensionMeters:Math.min(w,l,h)});
 return Object.freeze({...g,simplePhysicalFaceRoutes:true as const,heightMeters:h,diameterMeters:Math.max(w,l),circumradiusMeters:Math.max(...vertices.map(v=>Math.hypot(...v))),
  volumeMeters3:g.faces.reduce((sum,f)=>{const[a,b,c]=g.vertexIds(f).map(i=>vertices[i]!);return sum+(a![0]*(b![1]*c![2]-b![2]*c![1])+a![1]*(b![2]*c![0]-b![0]*c![2])+a![2]*(b![0]*c![1]-b![1]*c![0]))/6;},0)});
}
export type FloatingIslandGeometry=ReturnType<typeof createFloatingIslandGeometry>;
