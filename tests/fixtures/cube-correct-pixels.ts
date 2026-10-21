import {createSolidCubeTerrain} from '../../src/terrain/solid-cube.ts';
import {prepareCubeDisplayField} from '../../src/rendering/solid-cube-field.ts';
import {prepareCubeCanvasAtlas,presentCubeCanvas} from '../../src/rendering/solid-cube-canvas.ts';
import type {CubePresentation} from '../../src/rendering/solid-cube-presentation.ts';
/** Compare the actual incrementally painted Canvas against an independent full
 * reconstruction from canonical words. No production authority is written. */
export async function comparePaintedCanvas(){
 const state=window.__cubeEditor!.snapshot() as {display:ReturnType<CubePresentation['snapshot']>},d=state.display,words=window.__cubeEditor!.words();
 const terrain=createSolidCubeTerrain({terrainId:'independent-canvas-reference',cellsPerEdge:d.sourceCells!,geometry:{identity:{worldId:'independent-reference',surfaceId:'exterior'},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1_000_000}}),values=new Float32Array(Uint32Array.from(words).buffer);
 for(let i=0;i<values.length;i++)terrain.write(terrain.keyAt(i),values[i]!);
 const field=await prepareCubeDisplayField(terrain),atlas=await prepareCubeCanvasAtlas(field),expected=document.createElement('canvas');presentCubeCanvas(expected,atlas,d.camera,d.mode,d.viewport);
 const actual=document.querySelector<HTMLCanvasElement>('[aria-label="Cube Canvas2D terrain"]')!;if(actual.hidden)throw Error('Canvas fallback is not currently displayed');
 const a=actual.getContext('2d')!.getImageData(0,0,actual.width,actual.height).data,b=expected.getContext('2d')!.getImageData(0,0,expected.width,expected.height).data;
 let different=0,max=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]!-b[i]!);if(delta)different++;max=Math.max(max,delta);}atlas.dispose();expected.width=expected.height=0;
 return{width:actual.width,height:actual.height,expectedBytes:b.length,actualBytes:a.length,differentChannels:different,maxChannelDifference:max,canonicalSamples:words.length,displayRevision:d.displayedRevision,sourceRevision:d.sourceRevision};
}
