import type{CrescentTerrain}from'./crescent.ts';import{createPrismaticBrush,type PrismaticStrokeOptions}from'./prismatic-brush.ts';
export{prismaticBrushPolicy as crescentBrushPolicy}from'./prismatic-brush.ts';
const brush=createPrismaticBrush<CrescentTerrain>((t,p)=>{const id=t.geometry.physicalFaceId(p.patchId),i=Number(id.slice(id.lastIndexOf('-')+1));return id.startsWith('wall-')?(i<t.geometry.segments?i:2*t.geometry.segments-1-i):i;});
export const crescentDabAdapter=brush.dabAdapter,prepareCrescentDab=brush.prepare,beginCrescentStroke=brush.begin;
export type CrescentStrokeOptions=PrismaticStrokeOptions<CrescentTerrain>;
