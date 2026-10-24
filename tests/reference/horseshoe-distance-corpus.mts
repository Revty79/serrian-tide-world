import{mkdirSync,writeFileSync}from'node:fs';
import{createHorseshoeGeometry}from'../../src/surfaces/horseshoe.ts';
import{HORSESHOE_DEFAULT_DIMENSIONS}from'../../src/terrain/horseshoe.ts';
import{horseshoeCapPosition,horseshoeWallPosition,horseshoeDistance}from'../../src/surfaces/horseshoe-distance.ts';
const profiles=[HORSESHOE_DEFAULT_DIMENSIONS,{...HORSESHOE_DEFAULT_DIMENSIONS,bendCurvature:1.6,armLengthRatio:1,armSpacingRatio:.2625,bodyWidthRatio:.25,thicknessRatio:.15},{...HORSESHOE_DEFAULT_DIMENSIONS,worldSizeMeters:100000,bendCurvature:.8,armLengthRatio:.15,armSpacingRatio:.9,bodyWidthRatio:.08,thicknessRatio:.016},{...HORSESHOE_DEFAULT_DIMENSIONS,endShape:'beveled' as const}],cases=[];
for(const[profile,dimensions]of profiles.entries()){
 const g=createHorseshoeGeometry({...dimensions,provider:'physical-prismatic-horseshoe',version:1,role:'exterior',identity:{worldId:'reference',surfaceId:'boundary'}});
 for(let vertex=0;vertex<g.outline.length;vertex++)for(const fraction of vertex%4===0?[.2,.5,.8]:[.5]){
  const a=g.outline[vertex]!,next=g.outline[(vertex+1)%g.outline.length]!,previous=g.outline[(vertex+g.outline.length-1)%g.outline.length]!,out=[next[0]-a[0],next[1]-a[1]],back=[previous[0]-a[0],previous[1]-a[1]];let beta=Math.atan2(out[0]!*back[1]!-out[1]!*back[0]!,out[0]!*back[0]!+out[1]!*back[1]!);if(beta<0)beta+=2*Math.PI;const angle=Math.atan2(out[1]!,out[0]!)+fraction*beta,radius=Math.min(150,g.metadata.thicknessMeters/100),first=horseshoeCapPosition(g,[a[0]+radius*Math.cos(angle),a[1]+radius*Math.sin(angle)],1),edgeLength=Math.hypot(...out),last=horseshoeWallPosition(g,vertex,fraction===.5?0:radius/10/edgeLength,g.metadata.thicknessMeters/2-radius*.4),certificate=horseshoeDistance(g,first,last,{absoluteToleranceMeters:.01});
  const sample=(p:typeof first)=>({u:p.u,v:p.v,vertices:g.vertexIds(p.patchId).map(i=>g.vertices[i])});
  cases.push({profile,vertex,fraction,outline:[a,next,previous],thickness:g.metadata.thicknessMeters,first:sample(first),last:sample(last),certificate});
 }
}
mkdirSync('.local/horseshoe-reference',{recursive:true});writeFileSync('.local/horseshoe-reference/corpus.json',JSON.stringify({cases},null,2));console.log(`${cases.length} physical cone certificates exported for independent Decimal verification`);
