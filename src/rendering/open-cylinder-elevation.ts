import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import type {OpenCylinderPatch} from '../surfaces/open-cylinder.ts';
import {terrainHermiteGrid} from './terrain-hermite.ts';
export {cylinderElevationColor,cylinderRelief,type CylinderAppearance} from './cylindrical-elevation.ts';

export interface OpenCylinderFieldHit {readonly patchId:OpenCylinderPatch;readonly theta:number;readonly radiusMeters:number;readonly zMeters:number}
/** Read-only display addressing in physical +Z/+radius order. Canonical inner
 * wall and end-rim rows run the opposite way; their authority is never copied
 * or reinterpreted to obtain the accepted cylindrical field convention. */
export function openCylinderDisplayIndex(t:OpenCylinderTerrain,patch:OpenCylinderPatch,row:number,column:number){const {angularSamples:A,axialCells:Z,radialCells:P}=t.metadata.representation.resolution,Q=2*Z+4*P,c=((column%A)+A)%A,r=Math.max(0,Math.min(patch.endsWith('wall')?Z:2*P,row)),m=patch==='outer-wall'?r:patch==='inner-wall'?2*Z+2*P-r:patch==='rim-end'?Z+2*P-r:2*Z+2*P+r;return(m%Q)*A+c;}

/** Geometry adapter over the accepted numerical Hermite, physical finite-
 * difference gradient and palette/relief policy. Both rims have nonzero radius;
 * there is no disk-center collapse, special center normal or invented height. */
export function openCylinderElevationSampler(values:Float32Array,t:OpenCylinderTerrain,light:'all'|'land'|'none'='all'){
 if(values.length!==t.sampleCount)throw RangeError('Open-cylinder display requires a complete coherent elevation epoch.');
 const {angularSamples:A,axialCells:Z,radialCells:P}=t.metadata.representation.resolution,{outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=t.geometry.metadata,T=t.geometry.thicknessMeters,Q=2*Z+4*P,q=new Float64Array(16),columns=new Uint32Array(4),cosine=new Float64Array(A),sine=new Float64Array(A),sea=t.metadata.seaLevel;
 for(let i=0;i<A;i++){cosine[i]=Math.cos(i/A*2*Math.PI);sine[i]=Math.sin(i/A*2*Math.PI);}
 return(hit:OpenCylinderFieldHit)=>{
  const wall=hit.patchId==='outer-wall'||hit.patchId==='inner-wall',inner=hit.patchId==='inner-wall',last=wall?Z:2*P,R=inner?ri:ro,column=((hit.theta/(2*Math.PI)*A)%A+A)%A,row=Math.max(0,Math.min(last,wall?hit.zMeters/L*Z:(hit.radiusMeters-ri)/T*(2*P))),left=Math.floor(column),top=Math.min(Math.floor(row),last-1),x=column-left,y=row-top;
  for(let dc=0;dc<4;dc++)columns[dc]=(left+dc-1+A)%A;
  for(let dr=0;dr<4;dr++){const r=Math.max(0,Math.min(last,top+dr-1)),m=hit.patchId==='outer-wall'?r:inner?2*Z+2*P-r:hit.patchId==='rim-end'?Z+2*P-r:2*Z+2*P+r,base=(m%Q)*A;for(let dc=0;dc<4;dc++)q[dr*4+dc]=values[base+columns[dc]!]!;}
  const height=terrainHermiteGrid(q,x,y),crossesSea=Math.min(q[5]!,q[6]!,q[9]!,q[10]!)<=sea&&Math.max(q[5]!,q[6]!,q[9]!,q[10]!)>sea;
  if(light==='none'||light==='land'&&height<=sea)return{height,dx:0,dy:0,crossesSea};
  let dx=0,dy=0;
  for(let dr=0;dr<2;dr++)for(let dc=0;dc<2;dc++){
   const r=top+dr,c=columns[dc+1]!,at=(dr+1)*4+dc+1,angular=(q[at+1]!-q[at-1]!)*A/(4*Math.PI*R),vertical=(q[at+4]!-q[at-4]!)/(r===0||r===last?1:2);let gx=angular,gy=vertical*Z/L;
   if(!wall){const radial=vertical*(2*P)/T,tangential=angular*R/(ri+T*(r/(2*P)));gx=cosine[c]!*radial-sine[c]!*tangential;gy=sine[c]!*radial+cosine[c]!*tangential;}
   const weight=(dr?y:1-y)*(dc?x:1-x);dx+=gx*weight;dy+=gy*weight;
  }
  return{height,dx,dy,crossesSea};
 };
}
