import {CUBE_FACES} from '../surfaces/cube-sphere.ts';
import type {SphereFieldSnapshot,SphereFieldRegion} from './spherical-elevation.ts';
/** A conservative sign summary of each eight-cell reconstruction block.
 * Every incident corner is included. A real physical hit must still happen
 * first; mixed blocks always use the accepted GPU field calculation. This
 * skips redundant quarter-ray shading only when their exact class is known.
 * It contains no heights, colors, geometry coverage or editable geography. */
export function roundedFieldClasses(field:SphereFieldSnapshot,regions?:readonly SphereFieldRegion[],previous?:{width:number;data:Uint8Array}){
 const width=Math.ceil(field.n/8),incremental=!!regions&&previous?.width===width,data=incremental?previous!.data.slice():new Uint8Array(width*width*6),side=field.n+1,safePositive=2**-120;
 for(let face=0;face<6;face++){const values=field.data[CUBE_FACES[face]!];const dirty=incremental?regions!.filter(r=>r.face===CUBE_FACES[face]):undefined;for(let y=0;y<width;y++)for(let x=0;x<width;x++){if(dirty&&!dirty.some(r=>x>=Math.max(0,Math.floor((r.left-1)/8))&&x<=Math.floor(r.right/8)&&y>=Math.max(0,Math.floor((r.top-1)/8))&&y<=Math.floor(r.bottom/8)))continue;let ocean=true,land=true;for(let r=y*8;r<=Math.min(field.n,y*8+8);r++)for(let c=x*8;c<=Math.min(field.n,x*8+8);c++){const h=values[(r*side+c)*4]!;ocean&&=h<=0;land&&=h>safePositive;}data[(face*width+y)*width+x]=ocean?1:land?2:0;}}
 return{width,data};
}
