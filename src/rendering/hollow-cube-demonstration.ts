import {createHollowCubeWorld,assessHollowCubeClearance} from '../terrain/hollow-cube.ts';
import {cubeDemoElevation,cubeTaskYield} from './solid-cube-field.ts';
import {validateLinkedEntrance,type PhysicalPassage} from '../surfaces/passages.ts';
import {validateHollowCubePassage} from '../surfaces/hollow-cube-passages.ts';
import {hollowCubeDimensions,type HollowCubeDimensions} from '../surfaces/hollow-cube.ts';
import type {CubeVector} from '../surfaces/solid-cube.ts';

/** Synthetic, dev-only inspection model. No saved World or editor document. */
export async function createHollowCubeDemonstration(n:128|256,dimensions:HollowCubeDimensions={outerSideLengthMeters:1_000_000,innerSideLengthMeters:800_000},alive=()=>true){
 hollowCubeDimensions(dimensions);if(n!==128&&n!==256)throw RangeError('Inspection supports N128/N256.');
 const started=performance.now(),world=createHollowCubeWorld({provider:'physical-hollow-cube',version:1,worldId:'cube-g-inspection',...dimensions,surfaces:{exterior:{surfaceId:'exterior',terrainId:`cube-g-exterior-${n}`},interior:{surfaceId:'interior',terrainId:`cube-g-interior-${n}`}}},n),constructionMs=performance.now()-started,seedAt=performance.now();
 const guard=()=>{if(!alive())throw Error('Hollow cube inspection superseded.');};guard();
 for(const s of Object.values(world.surfaces)){const t=s.referenceTerrain,half=s.geometry.metadata.sideLengthMeters/2;
  for(let i=0;i<t.sampleCount;i++){const key=t.keyAt(i),q=t.referencePositionAt(key).map(v=>v/half) as unknown as CubeVector;
   // Different continuous XYZ functions, not an inverted or mirrored field.
   const h=s.role==='exterior'?cubeDemoElevation(q):600+2400*Math.sin(q[0]*2+q[2])**2-1700*Math.cos(q[1]*3-q[2]*1.5);
   t.write(key,h*Math.min(1,world.dimensions.nominalWallThicknessMeters/20_000));if(i%2048===2047){await cubeTaskYield();guard();}
  }
 }
 const seedMs=performance.now()-seedAt,clearanceAt=performance.now(),clearance=await assessHollowCubeClearance(world,undefined,cubeTaskYield);guard();const clearanceMs=performance.now()-clearanceAt;
 const exterior=world.surfaces.exterior.geometry.identity,interior=world.surfaces.interior.geometry.identity;
 const linked=validateLinkedEntrance({kind:'linked-entrance',version:1,id:'linked-stair',worldId:world.definition.id,anchors:[{id:'outside-door',targetAnchorId:'inside-landing',location:{kind:'surface',position:{...exterior,patchId:'pz',u:0,v:0}}},{id:'inside-landing',targetAnchorId:'outside-door',location:{kind:'surface',position:{...interior,patchId:'ny',u:0,v:0}}}]},p=>world.select(p).geometry.normalize(p));
 const outer=dimensions.outerSideLengthMeters/2,inner=dimensions.innerSideLengthMeters/2,mid=(outer+inner)/2,r=Math.min((outer-inner)/12,inner/6),chamber=Math.min((outer-inner)/4,inner/4);
 const physical:PhysicalPassage={kind:'physical-passage',version:1,id:'reference-shaft',worldId:world.definition.id,geometry:'sphere-capsule-union',nodes:[{id:'outer-node',position:[outer,0,0],radiusMeters:r},{id:'chamber',position:[mid,0,0],radiusMeters:chamber},{id:'inner-node',position:[inner,0,0],radiusMeters:r},{id:'branch-node',position:[mid,2*r,0],radiusMeters:r}],segments:[{id:'outer-tube',from:'outer-node',to:'chamber',radiusMeters:r},{id:'inner-tube',from:'chamber',to:'inner-node',radiusMeters:r},{id:'branch-tube',from:'chamber',to:'branch-node',radiusMeters:r}],portals:[{id:'outer-opening',nodeId:'outer-node',position:{...exterior,patchId:'px',u:0,v:0},apertureRadiusMeters:r},{id:'inner-opening',nodeId:'inner-node',position:{...interior,patchId:'px',u:0,v:0},apertureRadiusMeters:r}]};
 let passage:ReturnType<typeof validateHollowCubePassage>|undefined,passageError='';try{passage=validateHollowCubePassage(world,physical);}catch(error){passageError=String(error);}
 return Object.freeze({world,n,linked,passage,passageError,clearance,constructionMs,seedMs,clearanceMs,readyMs:performance.now()-started});
}
export type HollowCubeDemonstration=Awaited<ReturnType<typeof createHollowCubeDemonstration>>;
