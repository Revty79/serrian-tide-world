import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {OpenCylinderTerrain} from './open-cylinder.ts';

/** A local footprint can meet at most one physical crease. The restriction is
 * numerical, never a distance through an absent cap or an increase in budgets. */
export function openCylinderBrushRadiusLimit(terrain:OpenCylinderTerrain){const g=terrain.geometry;return Math.min(.24*Math.min(g.thicknessMeters,g.metadata.lengthMeters),.2*g.metadata.innerRadiusMeters);}
export function openCylinderBrushCandidates(terrain:OpenCylinderTerrain,input:SurfacePosition,radius:number){
 const g=terrain.geometry,center=g.normalize(input),{angularSamples:A,axialCells:Z,radialCells:P}=terrain.metadata.representation.resolution,L=g.metadata.lengthMeters,T=g.thicknessMeters,S=g.meridianLengthMeters,Q=2*Z+4*P;
 if(!Number.isFinite(radius)||radius<=0||radius>=openCylinderBrushRadiusLimit(terrain))throw RangeError('Open-cylinder brush radius must remain below the supported single-crease footprint limit.');
 const pad=2048*Number.EPSILON*Math.max(g.metadata.outerRadiusMeters,L),m=g.meridianAt(center)%S,r=radius+pad,centerXYZ=g.referencePosition(center);
 const intervals:readonly (readonly[number,number])[]=m-r<0?[[0,m+r],[S+m-r,S]]:m+r>S?[[0,m+r-S],[m-r,S]]:[[m-r,m+r]];
 // Any surface path obeys ds^2 + Ri^2 dtheta^2 <= dl^2. Thus both cyclic
 // meridian and short-angle windows are conservative, including paths taking
 // the other end or any winding. Neither is used as an exact brush distance.
 const ranges:[number,number][]=[];
 for(const[low,high]of intervals)for(const[start,end,offset,step]of [[0,Z,0,L/Z],[Z+1,Z+2*P-1,L,T/(2*P)],[Z+2*P,2*Z+2*P,L+T,L/Z],[2*Z+2*P+1,Q-1,2*L+T,T/(2*P)]]as const){
  const base=start===0?0:start===Z+1?Z:start===Z+2*P?Z+2*P:2*Z+2*P;
  const first=Math.max(start,base+Math.floor((low-offset)/step)-1),last=Math.min(end,base+Math.ceil((high-offset)/step)+1);if(first<=last)ranges.push([first,last]);
 }
 ranges.sort((a,b)=>a[0]-b[0]);const merged:[number,number][]=[];for(const range of ranges){const previous=merged.at(-1);if(previous&&range[0]<=previous[1]+1)previous[1]=Math.max(previous[1],range[1]);else merged.push([...range]);}
 const halfAngle=r/g.metadata.innerRadiusMeters,phase=((center.u/(2*Math.PI)*A)%A+A)%A,lo=Math.floor(phase-halfAngle/(2*Math.PI)*A)-1,hi=Math.ceil(phase+halfAngle/(2*Math.PI)*A)+1,wrap=(x:number)=>((x%A)+A)%A;
 const columns:readonly (readonly[number,number])[]=hi-lo+1>=A?[[0,A-1]]:Math.floor(lo/A)===Math.floor(hi/A)?[[wrap(lo),wrap(hi)]]:[[0,wrap(hi)],[wrap(lo),A-1]];
 return Object.freeze({center,centerXYZ,chordLowerBound:(p:SurfacePosition)=>{const q=g.referencePosition(p);return Math.max(0,Math.hypot(q[0]-centerXYZ[0],q[1]-centerXYZ[1],q[2]-centerXYZ[2])-pad);},
  *samples(){for(const[first,last]of merged)for(let row=first;row<=last;row++)for(const[left,right]of columns)for(let column=left;column<=right;column++){const key=terrain.keyAt(row*A+column);yield{key,position:terrain.positionAt(terrain.owner(key))};}},
 });
}
