import{mkdirSync,writeFileSync}from'node:fs';
import{createCrescentGeometry}from'../../src/surfaces/crescent.ts';
import{CRESCENT_DEFAULT_DIMENSIONS}from'../../src/terrain/crescent.ts';
import{crescentCapPosition,crescentWallPosition,crescentDistance}from'../../src/surfaces/crescent-distance.ts';
const profiles=[CRESCENT_DEFAULT_DIMENSIONS,{...CRESCENT_DEFAULT_DIMENSIONS,bodyWidthMeters:250000,thicknessMeters:100000,curvature:.8,openingDegrees:160},{...CRESCENT_DEFAULT_DIMENSIONS,bodyWidthMeters:600000,thicknessMeters:300000,curvature:1.25,openingDegrees:60},{...CRESCENT_DEFAULT_DIMENSIONS,tipShape:'full' as const}],cases=[];
for(const[profile,dimensions]of profiles.entries()){
 const g=createCrescentGeometry({...dimensions,provider:'physical-prismatic-crescent',version:1,role:'exterior',identity:{worldId:'reference',surfaceId:'boundary'}});
 for(let vertex=0;vertex<g.outline.length;vertex++)for(const fraction of vertex%4===0?[.2,.5,.8]:[.5]){
  const a=g.outline[vertex]!,next=g.outline[(vertex+1)%64]!,previous=g.outline[(vertex+63)%64]!,out=[next[0]-a[0],next[1]-a[1]],back=[previous[0]-a[0],previous[1]-a[1]];let beta=Math.atan2(out[0]!*back[1]!-out[1]!*back[0]!,out[0]!*back[0]!+out[1]!*back[1]!);if(beta<0)beta+=2*Math.PI;const angle=Math.atan2(out[1]!,out[0]!)+fraction*beta,radius=150,first=crescentCapPosition(g,[a[0]+radius*Math.cos(angle),a[1]+radius*Math.sin(angle)],1),edgeLength=Math.hypot(...out),last=crescentWallPosition(g,vertex,fraction===.5?0:15/edgeLength,g.metadata.thicknessMeters/2-60),certificate=crescentDistance(g,first,last,{absoluteToleranceMeters:.01});
  const sample=(p:typeof first)=>({u:p.u,v:p.v,vertices:g.vertexIds(p.patchId).map(i=>g.vertices[i])});
  cases.push({profile,vertex,fraction,outline:[a,next,previous],thickness:g.metadata.thicknessMeters,first:sample(first),last:sample(last),certificate});
 }
}
mkdirSync('.local/crescent-reference',{recursive:true});writeFileSync('.local/crescent-reference/corpus.json',JSON.stringify({cases},null,2));console.log(`${cases.length} physical cone certificates exported for independent Decimal verification`);
