import {type Vec3} from './cube-sphere.ts';
import {roundedBoundTree,roundedRayWindows} from './rounded-crescent-bounds.ts';
import type {RoundedCrescentGeometry} from './rounded-crescent-globe.ts';
/** Conservative camera-space depth windows. A physical AABB projects into every
 * overlapped screen bin; each bin retains the union of its complete depth
 * intervals. A bin can only add search space, never remove material. The
 * physical implicit solver remains the intersection authority. */
let previous:{g:RoundedCrescentGeometry;key:string;windows:(origin:Vec3,direction:Vec3)=>[number,number][]}|undefined;
export function roundedParallelWindows(g:RoundedCrescentGeometry,right:Vec3,up:Vec3,forward?:Vec3){
 const key=JSON.stringify([right,up,forward]);if(previous?.g===g&&previous.key===key)return previous.windows;
 const f=forward??[right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]],{boxes}=roundedBoundTree(g),N=128,E=g.bendRadius+g.bodyRadius,bins:Array<[number,number][]|undefined>=new Array(N*N),cell=(x:number)=>Math.max(0,Math.min(N-1,Math.floor((x/E+1)*N/2)));
 let references=0;for(const b of boxes){const cx=(b.low[0]+b.high[0])/2,cy=(b.low[1]+b.high[1])/2,cz=(b.low[2]+b.high[2])/2,hx=(b.high[0]-b.low[0])/2,hy=(b.high[1]-b.low[1])/2,hz=(b.high[2]-b.low[2])/2,x=cx*right[0]+cy*right[1]+cz*right[2],y=cx*up[0]+cy*up[1]+cz*up[2],z=cx*f[0]!+cy*f[1]!+cz*f[2]!,rx=hx*Math.abs(right[0])+hy*Math.abs(right[1])+hz*Math.abs(right[2]),ry=hx*Math.abs(up[0])+hy*Math.abs(up[1])+hz*Math.abs(up[2]),rz=hx*Math.abs(f[0]!)+hy*Math.abs(f[1]!)+hz*Math.abs(f[2]!),interval:[number,number]=[3*E-z-rz-1e-11,3*E-z+rz+1e-11];for(let row=cell(y-ry-1e-12);row<=cell(y+ry+1e-12);row++)for(let col=cell(x-rx-1e-12);col<=cell(x+rx+1e-12);col++){if(++references>262144)return(origin:Vec3,direction:Vec3)=>roundedRayWindows(g,origin,direction);(bins[row*N+col]??=[]).push(interval);}}
 let count=0;for(let i=0;i<bins.length;i++){const intervals=bins[i];if(!intervals)continue;intervals.sort((a,b)=>a[0]-b[0]);const merged:[number,number][]=[];for(const p of intervals){const last=merged.at(-1);if(last&&p[0]<=last[1]+1e-12)last[1]=Math.max(last[1],p[1]);else merged.push([...p]);}bins[i]=merged;count+=merged.length;}
 // A finite, geometry-only two MiB camera receipt. Unusual unsupported cache
 // density falls back to the same exact BVH windows without changing quality.
 if(count*16+(N*N+1)*4>2*1024*1024)return(origin:Vec3,direction:Vec3)=>roundedRayWindows(g,origin,direction);
 const offsets=new Uint32Array(N*N+1),depths=new Float64Array(count*2);let at=0;for(let i=0;i<bins.length;i++){offsets[i]=at;for(const interval of bins[i]??[]){depths[at*2]=interval[0];depths[at*2+1]=interval[1];at++;}}offsets[N*N]=at;
 const empty:[number,number][]=[];const result=(origin:Vec3,_direction:Vec3):[number,number][]=>{const x=origin[0]*right[0]+origin[1]*right[1]+origin[2]*right[2],y=origin[0]*up[0]+origin[1]*up[1]+origin[2]*up[2];if(Math.abs(x)>E+1e-10||Math.abs(y)>E+1e-10)return empty;const cellId=cell(y)*N+cell(x),result:[number,number][]=[];for(let i=offsets[cellId]!;i<offsets[cellId+1]!;i++)result.push([depths[i*2]!,depths[i*2+1]!]);return result;};previous={g,key,windows:result};return result;
}
