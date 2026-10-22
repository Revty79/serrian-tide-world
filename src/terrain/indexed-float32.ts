import {assertFloat32Elevation} from './model.ts';

export const MAX_INDEXED_PATCH_SAMPLES=65536;
export interface IndexedPatchBlock {readonly indices:Uint32Array;readonly values:Float32Array;readonly count:number}
/** The accepted cylindrical atomic Float32 authority, independent of charts.
 * Geometry adapters validate complete keys before invoking index operations.
 * No backing array is exposed; snapshots and history remain host-owned. */
export function createIndexedFloat32Authority(options:{count:number;initialElevation:number;validateElevation?:(value:number)=>void;validateSample?:(index:number,value:number,before:number)=>void}){
 const {count,initialElevation:initial,validateElevation,validateSample}=options;
 if(!Number.isSafeInteger(count)||count<1)throw RangeError('Positive finite sample count required.');
 assertFloat32Elevation(initial);validateElevation?.(Math.fround(initial));
 const elevations=new Float32Array(count).fill(initial);let revision=0;
 const checkedIndex=(i:number)=>{if(!Number.isSafeInteger(i)||i<0||i>=count)throw RangeError('Invalid canonical sample index.');return i;};
 return Object.freeze({get revision(){return revision;},byteLength:elevations.byteLength,
  read:(i:number)=>elevations[checkedIndex(i)]!,
  write:(index:number,value:number)=>{checkedIndex(index);assertFloat32Elevation(value);const next=Math.fround(value);validateElevation?.(next);validateSample?.(index,next,elevations[index]!);if(!Object.is(elevations[index],next)){elevations[index]=next;revision++;}},
  commitPreparedPatch:(expectedRevision:number,blocks:readonly IndexedPatchBlock[])=>{
   if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!Array.isArray(blocks)||blocks.length>256)throw RangeError('Invalid indexed patch guard or block count.');
   const prepared:IndexedPatchBlock[]=blocks.map(block=>({indices:block.indices,values:block.values,count:block.count}));let previous=-1,total=0,changed=0;
   for(const block of prepared){
    if(!ArrayBuffer.isView(block.indices)||Object.getPrototypeOf(block.indices)!==Uint32Array.prototype||!ArrayBuffer.isView(block.values)||Object.getPrototypeOf(block.values)!==Float32Array.prototype
     ||!(block.indices.buffer instanceof ArrayBuffer)||!(block.values.buffer instanceof ArrayBuffer)||!Number.isSafeInteger(block.count)||block.count<0||block.count>block.indices.length||block.count>block.values.length)throw RangeError('Invalid or shared indexed patch arrays.');
    total+=block.count;if(total>MAX_INDEXED_PATCH_SAMPLES)throw RangeError('Indexed patch sample budget exceeded.');
    for(let i=0;i<block.count;i++){const index=block.indices[i]!,value=block.values[i]!;if(index<=previous||index>=count||!Number.isFinite(value))throw RangeError('Indexed patch must have unique ordered indices and finite values.');validateElevation?.(value);validateSample?.(index,value,elevations[index]!);previous=index;if(!Object.is(elevations[index],value))changed++;}
   }
   if(revision!==expectedRevision||!Number.isSafeInteger(revision+changed))throw Error('Indexed patch source revision changed or overflowed.');
   for(const block of prepared)for(let i=0;i<block.count;i++){const index=block.indices[i]!,value=block.values[i]!;if(!Object.is(elevations[index],value)){elevations[index]=value;revision++;}}
   return changed;
  },copyElevations:()=>elevations.slice(),
 });
}
export interface IndexedTerrain<Key extends {readonly index:number}>{readonly revision:number;keyAt(index:number):Key;read(key:Key):number;commitPreparedPatch(key:Key,revision:number,blocks:readonly IndexedPatchBlock[]):number}
