import type{ArcTerrain}from'./arc.ts';import{arcProjectionLowerBound}from'../surfaces/arc-distance.ts';import{createPrismaticBrush,type PrismaticStrokeOptions}from'./prismatic-brush.ts';
export{prismaticBrushPolicy as arcBrushPolicy}from'./prismatic-brush.ts';
const brush=createPrismaticBrush<ArcTerrain>((t,p)=>t.geometry.longitudinalSector(p.patchId),(t,a,b,r)=>arcProjectionLowerBound(t.geometry,a,b,r));
export const arcDabAdapter=brush.dabAdapter,prepareArcDab=brush.prepare,beginArcStroke=brush.begin;
export type ArcStrokeOptions=PrismaticStrokeOptions<ArcTerrain>;
