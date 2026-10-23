import {rasterEdgeCoverage} from './raster-quality.ts';
export interface TerrainRasterSample<Hit>{readonly c:readonly number[];readonly shade:number;readonly label:number;readonly field:{readonly crossesSea:boolean};readonly hit?:Hit}
export interface CoherentTerrainRaster {readonly pixels:Uint8ClampedArray;readonly columns:number;readonly rows:number;readonly revision:number;readonly snapshotBytes:number}
export interface RasterRegion{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number}
export type RasterRegions=RasterRegion|readonly RasterRegion[];
export interface TerrainRasterUpdate{readonly base:CoherentTerrainRaster;readonly region:RasterRegions}
export const rasterRegions=(region:RasterRegions):readonly RasterRegion[]=>'left'in region?[region]:region;
/** Accepted cylindrical presentation loop, independent of intersection/chart
 * mathematics. Geometry selects actual hits; field/palette adapters supply
 * colors. Coast/material coverage and cooperative work policy stay shared. */
export function* coherentTerrainRasterSteps<Hit>(options:{readonly pixels:Uint8ClampedArray;readonly columns:number;readonly rows:number;readonly revision:number;readonly snapshotBytes:number;readonly size:{readonly width:number;readonly height:number};readonly grid:{readonly x:number;readonly y:number;readonly scale:number};readonly labels?:Uint8Array;readonly region?:RasterRegions;readonly quantum:256|2048;sampleAt(x:number,y:number):TerrainRasterSample<Hit>|undefined;nearBoundary(center:TerrainRasterSample<Hit>|undefined,x:number,y:number,dx:number,dy:number):boolean|undefined}):Generator<void,CoherentTerrainRaster>{
 const {pixels,columns,rows,revision,snapshotBytes,size,grid:l,labels,sampleAt}=options,dx=size.width/columns/l.scale,dy=size.height/rows/l.scale;
 const regions=options.region?rasterRegions(options.region):[{left:0,top:0,right:columns,bottom:rows}];let work=0;
 for(const region of regions)for(let row=region.top;row<region.bottom;row++)for(let column=region.left;column<region.right;column++){const i=row*columns+column;
  const x=((i%columns+.5)*size.width/columns-l.x)/l.scale,y=(l.y-(Math.floor(i/columns)+.5)*size.height/rows)/l.scale,center=sampleAt(x,y),offset=i*4;if(labels)labels[i]=center?Math.floor(center.label/2):0;
  const nearBoundary=options.nearBoundary(center,x,y,dx,dy),nearCoast=center&&center.field.crossesSea;
  if(nearBoundary||nearCoast){
   let red=0,green=0,blue=0,covered=0,sameClass=true;
   for(const ox of[-.25,.25])for(const oy of[-.25,.25]){const sub=sampleAt(x+ox*dx,y+oy*dy);if(!sub){sameClass=false;continue;}const{c,shade}=sub;red+=c[0]!*shade;green+=c[1]!*shade;blue+=c[2]!*shade;covered++;sameClass&&=sub.label===center?.label;}
   const uniformClass=!nearBoundary&&covered===4&&center&&sameClass;
   pixels[offset]=uniformClass?center.c[0]!*center.shade:covered?red/covered:0;pixels[offset+1]=uniformClass?center.c[1]!*center.shade:covered?green/covered:0;pixels[offset+2]=uniformClass?center.c[2]!*center.shade:covered?blue/covered:0;pixels[offset+3]=covered/4*255;
  }else if(!center){pixels[offset]=pixels[offset+1]=pixels[offset+2]=pixels[offset+3]=0;}
  else{const{c,shade}=center;pixels[offset]=c[0]!*shade;pixels[offset+1]=c[1]!*shade;pixels[offset+2]=c[2]!*shade;pixels[offset+3]=255;}
  if(++work%options.quantum===0)yield;
 }
 if(labels&&!options.region)yield* rasterEdgeCoverage(pixels,labels,columns,rows,(x,y,out)=>{const value=sampleAt((x*size.width/columns-l.x)/l.scale,(l.y-y*size.height/rows)/l.scale);if(!value){out.fill(0);return 0;}for(let k=0;k<3;k++)out[k]=Math.min(255,value.c[k]!*value.shade);out[3]=1;return Math.floor(value.label/2);});
 return{pixels,columns,rows,revision,snapshotBytes};
}
