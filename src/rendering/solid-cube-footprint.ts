import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {SOLID_CUBE_FACES,type SolidCubeFace} from '../surfaces/solid-cube.ts';
import {createCubeBrushDistancePlan,type CubeDabMeter} from '../surfaces/cube-brush-distance.ts';
import {cubeTaskYield} from './solid-cube-field.ts';
export interface CubeFootprintLine {face:SolidCubeFace;u:number;v:number;u2:number;v2:number}
/** Preview contour samples the same certified physical-distance plan as C1.
 * Its resolution is visual only; it never participates in numerical edits. */
export async function cubeFootprint(terrain:SolidCubeTerrain,center:SurfacePosition,radius:number,alive:()=>boolean){
 const position=terrain.geometry.canonicalPosition(center),half=terrain.metadata.geometry.sideLengthMeters/2;
 // A disc wholly inside a planar face has the Euclidean distance, exactly:
 // straight segment attains the 3D chord lower bound. No unfolding is necessary.
 // The display contour is polygonal, just as the boundary sampling below is.
 if(Number.isFinite(radius)&&radius>0&&Math.abs(position.u)+radius<half&&Math.abs(position.v)+radius<half){
  const lines:CubeFootprintLine[]=[];for(let i=0;i<64;i++){const a=i*Math.PI/32,b=(i+1)*Math.PI/32;lines.push({face:position.patchId,u:(position.u+radius*Math.cos(a))/half,v:(position.v+radius*Math.sin(a))/half,u2:(position.u+radius*Math.cos(b))/half,v2:(position.v+radius*Math.sin(b))/half});}return alive()?lines:[];
 }
 let work=0;const meter:CubeDabMeter={tick(){if(++work>1_000_000)throw Error('Brush preview work limit reached');},sequenceTests:0,portalTests:0,squaredRejected:0,chordRejected:0,commonFace:0,rootComparisons:0,rootFallbacks:0};
 const n=terrain.metadata.representation.cellsPerEdge,step=2**Math.max(0,Math.floor(Math.log2(Math.max(1,radius/(4*terrain.sampleSpacingMeters))))),s=n/step+1;
 const masks=SOLID_CUBE_FACES.map(()=>new Uint8Array(s*s)),plan=createCubeBrushDistancePlan(terrain,center,radius,meter);let at=performance.now();
 for(const a of plan.slots()){
  if(a.column%step||a.row%step)continue;
  const calculation=plan.squared(a.patchId,a.column,a.row);let result=calculation.next();
  while(!result.done){result=calculation.next();if(performance.now()-at>=4){await cubeTaskYield();if(!alive())return[];at=performance.now();}}
  if(result.value!==null)masks[SOLID_CUBE_FACES.indexOf(a.patchId)]![a.row/step*s+a.column/step]=1;
 }
 const lines:CubeFootprintLine[]=[];
 for(const [fi,face]of SOLID_CUBE_FACES.entries())for(let r=0;r<s-1;r++)for(let c=0;c<s-1;c++){
  const vertices=[[c,r],[c+1,r],[c+1,r+1],[c,r+1]] as const;
  for(const triangle of [[0,1,2],[0,2,3]]){
   const crossings:number[][]=[];
   for(let k=0;k<3;k++){const a=vertices[triangle[k]!]!,b=vertices[triangle[(k+1)%3]!]!;if(masks[fi]![a[1]*s+a[0]]!==masks[fi]![b[1]*s+b[0]])crossings.push([(a[0]+b[0])/(s-1)-1,(a[1]+b[1])/(s-1)-1]);}
   if(crossings.length===2)lines.push({face,u:crossings[0]![0]!,v:crossings[0]![1]!,u2:crossings[1]![0]!,v2:crossings[1]![1]!});
  }
 }return lines;
}
