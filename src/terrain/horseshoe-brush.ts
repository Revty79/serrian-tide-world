import{horseshoeProjectionLowerBound}from'../surfaces/horseshoe-distance.ts';
﻿import type{HorseshoeTerrain}from'./horseshoe.ts';import{createPrismaticBrush,type PrismaticStrokeOptions}from'./prismatic-brush.ts';
export{prismaticBrushPolicy as horseshoeBrushPolicy}from'./prismatic-brush.ts';
const brush=createPrismaticBrush<HorseshoeTerrain>((t,p)=>t.geometry.longitudinalSector(p.patchId),(t,a,b,r)=>horseshoeProjectionLowerBound(t.geometry,a,b,r));
export const horseshoeDabAdapter=brush.dabAdapter,prepareHorseshoeDab=brush.prepare,beginHorseshoeStroke=brush.begin;
export type HorseshoeStrokeOptions=PrismaticStrokeOptions<HorseshoeTerrain>;
