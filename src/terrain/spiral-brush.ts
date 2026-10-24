import type{SpiralTerrain}from'./spiral.ts';import{spiralProjectionLowerBound}from'../surfaces/spiral-distance.ts';import{createPrismaticBrush,type PrismaticStrokeOptions}from'./prismatic-brush.ts';
export{prismaticBrushPolicy as spiralBrushPolicy}from'./prismatic-brush.ts';
const brush=createPrismaticBrush<SpiralTerrain>((t,p)=>t.geometry.longitudinalSector(p.patchId),(t,a,b,r)=>spiralProjectionLowerBound(t.geometry,a,b,r));
export const spiralDabAdapter=brush.dabAdapter,prepareSpiralDab=brush.prepare,beginSpiralStroke=brush.begin;
export type SpiralStrokeOptions=PrismaticStrokeOptions<SpiralTerrain>;
