import {createFragmentGeometry,type FragmentConfiguration} from '../surfaces/fragment.ts';
import {createPhysicalPieceTerrain} from '../terrain/physical-piece.ts';
import {islandPlacement,validateIslandArrangement,type IslandDescriptor} from './floating-islands-placement.ts';
import type {IslandComponent} from './floating-islands-document.ts';
export interface FragmentGeneration{readonly parent:'regular-tetrahedron';readonly version:1;readonly widthMeters:number;readonly seed:number;readonly separationPercent:number}
export function validateFragmentGeneration(g:FragmentGeneration){if(g.parent!=='regular-tetrahedron'||g.version!==1||!Number.isFinite(g.separationPercent)||g.separationPercent<15||g.separationPercent>300)throw RangeError('Choose a separation from 15% through 300%.');createFragmentGeometry({provider:'physical-tetrahedral-fragment',version:1,identity:{worldId:'validation',surfaceId:'piece'},role:'exterior',parentWidthMeters:g.widthMeters,fractureSeed:g.seed,piece:0});return Object.freeze({...g});}
export function createFragmentComponents(worldId:string,g:FragmentGeneration,n:128|256):readonly IslandComponent[]{
 validateFragmentGeneration(g);if(![128,256].includes(n))throw RangeError('Fragment detail must be N128 or N256.');
 const descriptors:IslandDescriptor[]=Array.from({length:4},(_,piece)=>{const geometry:FragmentConfiguration={provider:'physical-tetrahedral-fragment',version:1,role:'exterior',identity:{worldId,surfaceId:crypto.randomUUID()},parentWidthMeters:g.widthMeters,fractureSeed:g.seed,piece},physical=createFragmentGeometry(geometry);return{id:crypto.randomUUID(),name:`Fragment ${piece+1}`,terrainId:crypto.randomUUID(),geometry,subdivisions:n,placement:islandPlacement({positionMeters:physical.parentCenter.map(x=>x*(1+g.separationPercent/100)) as unknown as typeof physical.parentCenter,rotationDegrees:[0,0,0],scale:1})};});
 validateIslandArrangement(worldId,descriptors);return Object.freeze(descriptors.map(d=>Object.freeze({id:d.id,name:d.name,placement:d.placement,terrain:createPhysicalPieceTerrain({terrainId:d.terrainId,geometry:d.geometry,subdivisions:n})})));
}
